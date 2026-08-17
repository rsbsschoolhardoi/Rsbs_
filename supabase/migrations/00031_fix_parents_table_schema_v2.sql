-- 1. Fix parents table id to match students/teachers pattern
ALTER TABLE public.parents DROP CONSTRAINT IF EXISTS parents_id_fkey;
ALTER TABLE public.parents ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. No, actually the profiles.parent_profile_id is what should reference parents.id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_parent_profile_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_parent_profile_id_fkey 
  FOREIGN KEY (parent_profile_id) REFERENCES public.parents(id) ON DELETE SET NULL;
