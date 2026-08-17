-- Fix auth trigger to handle both INSERT and UPDATE
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_confirmed
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure all existing auth users have profiles
DO $$
DECLARE
    u record;
BEGIN
    FOR u IN SELECT * FROM auth.users LOOP
        -- Perform a dummy update to fire the trigger if it didn't fire.
        UPDATE auth.users SET updated_at = NOW() WHERE id = u.id;
    END LOOP;
END;
$$;
