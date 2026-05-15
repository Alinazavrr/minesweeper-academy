-- Avoid PL/pgSQL output-column ambiguity in the user_currency upsert conflict
-- target by naming the primary-key constraint directly.

CREATE OR REPLACE FUNCTION public.award_mines_for_game(target_game_id uuid)
RETURNS TABLE (
  user_id uuid,
  game_id uuid,
  awarded_mines integer,
  balance_after integer,
  total_earned integer,
  transaction_id uuid,
  reason public.mines_transaction_reason,
  already_awarded boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  game_row public.games%ROWTYPE;
  currency_row public.user_currency%ROWTYPE;
  existing_transaction public.mines_transactions%ROWTYPE;
  base_award integer;
  mine_delta integer;
  transaction_reason public.mines_transaction_reason;
  inserted_transaction_id uuid;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'award_mines_for_game requires authentication'
      USING ERRCODE = '28000';
  END IF;

  SELECT g.*
  INTO game_row
  FROM public.games AS g
  WHERE g.id = target_game_id
    AND g.user_id = caller_id
    AND g.result IN ('win'::public.game_result, 'loss'::public.game_result);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'completed game not found for caller'
      USING ERRCODE = '42501';
  END IF;

  transaction_reason := CASE
    WHEN game_row.source_mode = 'daily' THEN 'daily_finish'::public.mines_transaction_reason
    ELSE 'game_finish'::public.mines_transaction_reason
  END;

  base_award := CASE
    WHEN game_row.source_mode = 'daily' THEN 25
    WHEN game_row.difficulty = 'beginner' THEN 5
    WHEN game_row.difficulty = 'intermediate' THEN 15
    WHEN game_row.difficulty = 'expert' THEN 50
    ELSE 5
  END;
  mine_delta := CASE
    WHEN game_row.result = 'win' THEN base_award
    ELSE greatest(1, floor(base_award * 0.2)::integer)
  END;

  INSERT INTO public.user_currency (user_id)
  VALUES (caller_id)
  ON CONFLICT ON CONSTRAINT user_currency_pkey DO NOTHING;

  SELECT uc.*
  INTO currency_row
  FROM public.user_currency AS uc
  WHERE uc.user_id = caller_id
  FOR UPDATE;

  SELECT mt.*
  INTO existing_transaction
  FROM public.mines_transactions AS mt
  WHERE mt.user_id = caller_id
    AND mt.reason = transaction_reason
    AND mt.source_id = target_game_id;

  IF FOUND THEN
    RETURN QUERY
    SELECT
      caller_id,
      target_game_id,
      0,
      existing_transaction.balance_after,
      currency_row.total_earned,
      existing_transaction.id,
      existing_transaction.reason,
      true;
    RETURN;
  END IF;

  UPDATE public.user_currency AS uc
  SET
    mines_balance = uc.mines_balance + mine_delta,
    total_earned = uc.total_earned + mine_delta,
    last_earn_at = now(),
    updated_at = now()
  WHERE uc.user_id = caller_id
  RETURNING uc.*
  INTO currency_row;

  INSERT INTO public.mines_transactions (
    user_id,
    delta,
    reason,
    source_id,
    balance_after
  )
  VALUES (
    caller_id,
    mine_delta,
    transaction_reason,
    target_game_id,
    currency_row.mines_balance
  )
  RETURNING id
  INTO inserted_transaction_id;

  RETURN QUERY
  SELECT
    caller_id,
    target_game_id,
    mine_delta,
    currency_row.mines_balance,
    currency_row.total_earned,
    inserted_transaction_id,
    transaction_reason,
    false;
END;
$$;

REVOKE ALL ON FUNCTION public.award_mines_for_game(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_mines_for_game(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_mines_for_game(uuid) TO authenticated;
