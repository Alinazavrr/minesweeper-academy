-- Fix PL/pgSQL ambiguity from RETURNS TABLE output columns by targeting the
-- subscriptions primary-key constraint explicitly in the upsert.
CREATE OR REPLACE FUNCTION public.fake_purchase_subscription(
  target_tier public.subscription_tier
)
RETURNS TABLE (
  user_id uuid,
  tier public.subscription_tier,
  granted_via public.subscription_granted_via,
  granted_at timestamptz,
  valid_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  acting_user uuid := auth.uid();
  next_granted_via public.subscription_granted_via;
  next_granted_at timestamptz;
BEGIN
  IF acting_user IS NULL THEN
    RAISE EXCEPTION 'fake_purchase_subscription requires authentication'
      USING ERRCODE = '28000';
  END IF;

  IF target_tier = 'free'::public.subscription_tier THEN
    next_granted_via := 'free_default'::public.subscription_granted_via;
    next_granted_at := NULL;
  ELSE
    next_granted_via := 'fake_purchase'::public.subscription_granted_via;
    next_granted_at := now();
  END IF;

  INSERT INTO public.subscriptions (
    user_id,
    tier,
    granted_via,
    granted_at,
    valid_until
  )
  VALUES (
    acting_user,
    target_tier,
    next_granted_via,
    next_granted_at,
    NULL
  )
  ON CONFLICT ON CONSTRAINT subscriptions_pkey DO UPDATE
  SET
    tier = EXCLUDED.tier,
    granted_via = EXCLUDED.granted_via,
    granted_at = EXCLUDED.granted_at,
    valid_until = EXCLUDED.valid_until;

  RETURN QUERY
  SELECT
    s.user_id,
    s.tier,
    s.granted_via,
    s.granted_at,
    s.valid_until
  FROM public.subscriptions AS s
  WHERE s.user_id = acting_user;
END;
$$;
