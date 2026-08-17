import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Basic JSON Schema Validator
 */
function validateSchema(data: any, schema: any): string | null {
  if (!schema || !schema.properties) return null;
  
  const required = schema.required || [];
  for (const field of required) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return `Missing required field: ${field}`;
    }
  }

  const properties = schema.properties;
  for (const [key, value] of Object.entries(data)) {
    if (schema.additionalProperties === false && !properties[key]) {
      return `Unrecognized field: ${key}`;
    }
    
    if (properties[key]) {
      const fieldSchema = properties[key];
      const type = typeof value;
      
      if (fieldSchema.type === 'number' && type !== 'number') return `Field ${key} must be a number`;
      if (fieldSchema.type === 'boolean' && type !== 'boolean') return `Field ${key} must be a boolean`;
      if (fieldSchema.type === 'object' && type !== 'object') return `Field ${key} must be an object`;
      if (fieldSchema.type === 'array' && !Array.isArray(value)) return `Field ${key} must be an array`;
      if (fieldSchema.type === 'string' && type !== 'string') return `Field ${key} must be a string`;
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const apiKey = req.headers.get("x-api-key");
  const { pathname, searchParams } = new URL(req.url);
  // Support both /api-gateway/api/[module] AND /api/[module] (if mapped externally)
  let path = pathname.replace(/^\/api-gateway/, "") || "/";
  const method = req.method;
  const requestId = crypto.randomUUID();

  let moduleApiData = null;
  let keyData = null;
  let endpointData = null;
  let statusCode = 200;
  let responseBody: any = { status: "success", message: "Success", timestamp: new Date().toISOString(), request_id: requestId };

  try {
    // 1. Validate API Key
    if (!apiKey) {
      statusCode = 401;
      throw new Error("Unauthorized request");
    }

    // 2. Identify Module from Path (Standardized: /api/[module_name])
    const moduleMatch = path.match(/^\/api\/([a-zA-Z0-9_-]+)/);
    const requestedModuleName = moduleMatch ? moduleMatch[1] : null;

    // 1a. Try to find in module_apis (Strict Module-First System)
    let query = supabase.from("module_apis").select("*").eq("api_key", apiKey);
    
    // If a specific module path is used, enforce it matches the API key's module
    // This establishes the immutable link: Module -> API -> Endpoint
    if (requestedModuleName) {
      query = query.eq("module_name", requestedModuleName);
    }

    const { data: moduleApi, error: moduleApiError } = await query.maybeSingle();

    if (moduleApi) {
      if (!moduleApi.is_active) {
        statusCode = 403;
        throw new Error("Unauthorized request");
      }

      // GRANULAR METHOD-LEVEL CONTROL
      const allowedMethods = moduleApi.allowed_methods || ["POST"];
      if (!allowedMethods.includes(method)) {
        statusCode = 405;
        throw new Error(`Method ${method} not allowed for this API.`);
      }

      moduleApiData = moduleApi;
      
      const dbQuery = supabase.from(moduleApi.module_name);

      if (method === "POST") {
        const body = await req.json();

        // SCHEMA VALIDATION (Optional but recommended for POST)
        if (moduleApi.schema_json) {
          const schemaError = validateSchema(body, moduleApi.schema_json);
          if (schemaError) {
            statusCode = 400;
            responseBody.code = "VALIDATION_ERROR";
            throw new Error(schemaError);
          }
        }

        // SANITIZATION (Basic string trim)
        const sanitizedBody = Object.entries(body).reduce((acc: any, [key, val]) => {
          acc[key] = typeof val === 'string' ? val.trim() : val;
          return acc;
        }, {});

        const { data, error } = await dbQuery.insert(sanitizedBody).select().single();
        if (error) {
          statusCode = 400;
          responseBody.code = "PROCESSING_ERROR";
          throw new Error("Failed to process data. Please check field types and constraints.");
        }
        responseBody.data = data;
        responseBody.message = "Data received successfully";
        statusCode = 201;

      } else if (method === "GET") {
        const { data, error } = await dbQuery.select("*").limit(100);
        if (error) throw error;
        responseBody.data = data;
      } else if (method === "PUT" || method === "PATCH") {
        const body = await req.json();
        const id = searchParams.get("id");
        if (!id) throw new Error("Missing 'id' parameter for update");
        const { data, error } = await dbQuery.update(body).eq("id", id).select().single();
        if (error) throw error;
        responseBody.data = data;
      } else if (method === "DELETE") {
        const id = searchParams.get("id");
        if (!id) throw new Error("Missing 'id' parameter for deletion");
        const { error } = await dbQuery.delete().eq("id", id);
        if (error) throw error;
        responseBody.message = "Record deleted successfully";
      }

    } else {
      // 2. Fallback to original system (api_keys + api_endpoints) - For internal legacy support if any
      const { data: key, error: keyError } = await supabase
        .from("api_keys")
        .select("*")
        .eq("key_value", apiKey)
        .maybeSingle();

      if (keyError || !key) {
        statusCode = 401;
        throw new Error("Unauthorized request");
      }

      if (!key.is_active) {
        statusCode = 403;
        throw new Error("Unauthorized request");
      }

      keyData = key;

      // 3. Validate Endpoint
      const { data: endpoint, error: endpointError } = await supabase
        .from("api_endpoints")
        .select("*")
        .eq("path", path)
        .maybeSingle();

      if (endpointError || !endpoint) {
        statusCode = 404;
        throw new Error("Endpoint not found");
      }

      endpointData = endpoint;
      
      if (method === "GET") {
        const { data, error } = await supabase.from(endpoint.module_name).select("*").limit(10);
        if (error) throw error;
        responseBody.data = data;
      } else {
        statusCode = 405;
        throw new Error("Method not allowed");
      }
    }

  } catch (err: any) {
    responseBody.status = "error";
    responseBody.message = err.message;
    if (statusCode === 200) statusCode = 400;
    
    // Security Failure Masking
    if (statusCode === 401 || statusCode === 403) {
       responseBody.code = "UNAUTHORIZED";
       responseBody.message = "Unauthorized request";
       delete responseBody.data;
    }
  } finally {
    // 5. Log the request
    try {
      await supabase.from("api_logs").insert({
        module_api_id: moduleApiData?.id,
        key_id: keyData?.id,
        endpoint_id: endpointData?.id,
        method,
        path,
        status_code: statusCode,
        ip_address: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for"),
        response_summary: responseBody.message
      });
    } catch (logErr) {
      console.error("Failed to log API request:", logErr);
    }
  }

  return new Response(
    JSON.stringify(responseBody),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
