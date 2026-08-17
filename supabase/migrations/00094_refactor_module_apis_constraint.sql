-- Ensure module_name is unique to enforce "One Module, One API"
ALTER TABLE module_apis ADD CONSTRAINT unique_module_name UNIQUE (module_name);

-- Ensure all endpoint paths are in the format /api/[module_name]
-- (This will be enforced by the logic, but adding a check constraint might be helpful too)
ALTER TABLE module_apis ADD CONSTRAINT check_endpoint_path_format CHECK (endpoint_path LIKE '/api/%');
