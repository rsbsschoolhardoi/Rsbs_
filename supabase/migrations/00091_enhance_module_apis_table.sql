alter table module_apis 
add column if not exists complexity text check (complexity in ('simple', 'medium', 'complex')) default 'simple',
add column if not exists schema_json jsonb,
add column if not exists endpoint_path text;

comment on column module_apis.complexity is 'Module complexity: simple, medium, or complex';
comment on column module_apis.schema_json is 'Auto-generated JSON schema for inbound data validation';
comment on column module_apis.endpoint_path is 'Auto-generated RESTful endpoint path';