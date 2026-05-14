-- =============================================================
-- Security hardening flagged by Supabase advisor.
-- =============================================================

-- 1. Lock tg_set_updated_at's search_path so a malicious schema search
--    can't inject behavior into the trigger.
ALTER FUNCTION public.tg_set_updated_at() SET search_path = '';

-- 2. handle_new_user is SECURITY DEFINER and intentionally called only by
--    the on_auth_user_created trigger. Revoke EXECUTE from anon/authenticated
--    so it can't be invoked via /rest/v1/rpc/handle_new_user.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
