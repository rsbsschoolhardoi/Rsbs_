create or replace function get_table_columns(p_table_name text)
returns table (column_name text)
language plpgsql
security definer
as $$
begin
    return query
    select c.column_name::text
    from information_schema.columns c
    where c.table_schema = 'public'
    and c.table_name = p_table_name;
end;
$$;
