CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE (table_name text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.table_name::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE';
END;
$$;
