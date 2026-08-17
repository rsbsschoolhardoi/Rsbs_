-- Step 1: Add the new api_ids array column
ALTER TABLE public.chatbots ADD COLUMN IF NOT EXISTS api_ids UUID[] DEFAULT '{}'::UUID[];

-- Step 2: Migrate existing api_id values to the api_ids array
UPDATE public.chatbots SET api_ids = ARRAY[api_id] WHERE api_id IS NOT NULL;

-- Step 3: Remove the old api_id column
ALTER TABLE public.chatbots DROP COLUMN IF EXISTS api_id;

-- Step 4: Ensure no chatbots have null api_ids (set to empty array instead)
UPDATE public.chatbots SET api_ids = '{}'::UUID[] WHERE api_ids IS NULL;
