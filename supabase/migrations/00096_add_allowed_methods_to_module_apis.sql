alter table module_apis 
add column if not exists allowed_methods text[] default '{POST}';

comment on column module_apis.allowed_methods is 'List of allowed HTTP methods for this API (e.g. {GET, POST})';