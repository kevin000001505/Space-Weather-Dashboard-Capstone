-- Database initialization script
-- This script runs when the PostgreSQL container is first created

-- Create sample database schema
CREATE SCHEMA IF NOT EXISTS daen_schema;

-- Create sample table
CREATE TABLE IF NOT EXISTS daen_schema.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sample data table
CREATE TABLE IF NOT EXISTS daen_schema.data_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES daen_schema.users(id),
    data_value NUMERIC,
    data_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_username ON daen_schema.users(username);
CREATE INDEX idx_users_email ON daen_schema.users(email);
CREATE INDEX idx_data_records_user_id ON daen_schema.data_records(user_id);

-- Insert sample data (optional)
INSERT INTO daen_schema.users (username, email)
VALUES
    ('admin', 'admin@gmu.edu'),
    ('testuser', 'testuser@gmu.edu')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA daen_schema TO daen_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA daen_schema TO daen_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA daen_schema TO daen_user;
