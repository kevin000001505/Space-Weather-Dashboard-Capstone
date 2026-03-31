CREATE_PARTITION_FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION create_monthly_partition_if_missing(
    parent_table TEXT,
    date_val     TIMESTAMPTZ
)
RETURNS void AS $$
DECLARE
    start_date DATE := date_trunc('month', date_val);
    end_date   DATE := start_date + interval '1 month';
    table_name TEXT := parent_table || '_' || to_char(start_date, 'YYYY_MM');
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_tables
        WHERE tablename = table_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
            table_name, parent_table, start_date, end_date
        );
    END IF;
END;
$$ LANGUAGE plpgsql;
"""
