create or replace function analyze_module_schema(p_table_name text)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_complexity text := 'simple';
    v_schema_json jsonb;
    v_col_count int;
    v_has_complex_types boolean := false;
    v_required_fields text[];
    v_fields jsonb := '{}'::jsonb;
    v_rec record;
    v_api_name text;
begin
    -- Check if table exists
    if not exists (select 1 from information_schema.tables where table_name = p_table_name and table_schema = 'public') then
        raise exception 'Table % not found in public schema', p_table_name;
    end if;

    -- Analyze types and columns
    for v_rec in (
        select column_name, data_type, is_nullable, column_default, character_maximum_length
        from information_schema.columns 
        where table_name = p_table_name and table_schema = 'public'
        and column_name not in ('id', 'created_at', 'updated_at', 'created_by')
    ) loop
        v_col_count := coalesce(v_col_count, 0) + 1;
        
        if v_rec.data_type in ('jsonb', 'json', 'ARRAY') then
            v_has_complex_types := true;
        end if;

        -- Collect required fields
        if v_rec.is_nullable = 'NO' and v_rec.column_default is null then
            v_required_fields := array_append(v_required_fields, v_rec.column_name);
        end if;

        -- Map field to JSON Schema
        v_fields := v_fields || jsonb_build_object(
            v_rec.column_name, jsonb_build_object(
                'type', case 
                    when v_rec.data_type in ('integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision') then 'number'
                    when v_rec.data_type = 'boolean' then 'boolean'
                    when v_rec.data_type in ('jsonb', 'json') then 'object'
                    when v_rec.data_type = 'ARRAY' then 'array'
                    else 'string'
                end,
                'nullable', v_rec.is_nullable = 'YES',
                'description', 'Auto-analyzed field from database schema.'
            )
        );
    end loop;

    -- Refine Complexity logic
    if v_col_count > 15 or v_has_complex_types then
        v_complexity := 'complex';
    elsif v_col_count > 8 then
        v_complexity := 'medium';
    else
        v_complexity := 'simple';
    end if;

    -- Build final schema
    v_schema_json := jsonb_build_object(
        'type', 'object',
        'required', coalesce(v_required_fields, '{}'::text[]),
        'properties', v_fields,
        'additionalProperties', false
    );

    v_api_name := initcap(replace(p_table_name, '_', ' ')) || ' Inbound API';

    return jsonb_build_object(
        'complexity', v_complexity,
        'schema_json', v_schema_json,
        'api_name', v_api_name,
        'field_count', v_col_count,
        'has_complex_types', v_has_complex_types
    );
end;
$$;