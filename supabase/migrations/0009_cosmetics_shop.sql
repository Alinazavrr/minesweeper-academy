-- Cosmetic skins (shop).
--
-- Skins are identified by a stable text slug (catalog hardcoded in TS).
-- Two kinds for MVP: 'ui' (recolors site accents) and 'board' (recolors
-- the Minesweeper grid). At most one skin per kind can be equipped.

CREATE TYPE public.cosmetic_kind AS ENUM ('ui', 'board');

CREATE TABLE public.user_cosmetics (
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skin_id     text NOT NULL,
  kind        public.cosmetic_kind NOT NULL,
  price       integer NOT NULL CHECK (price >= 0),
  equipped    boolean NOT NULL DEFAULT false,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skin_id)
);

CREATE INDEX user_cosmetics_user_equipped_idx
  ON public.user_cosmetics (user_id, kind)
  WHERE equipped = true;

ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_cosmetics_select_own ON public.user_cosmetics
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Writes go through SECURITY DEFINER RPCs. No INSERT/UPDATE/DELETE policy = blocked.

-- -------------------------------------------------------------
-- purchase_skin: debit Mines, insert ownership row, log txn.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purchase_skin(
  target_skin_id text,
  target_kind public.cosmetic_kind,
  target_price integer
)
RETURNS TABLE (
  skin_id text,
  kind public.cosmetic_kind,
  price integer,
  equipped boolean,
  mines_balance integer,
  already_owned boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  currency_row public.user_currency%ROWTYPE;
  existing public.user_cosmetics%ROWTYPE;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'purchase_skin requires authentication' USING ERRCODE = '28000';
  END IF;

  IF target_price < 0 THEN
    RAISE EXCEPTION 'invalid price' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO existing
  FROM public.user_cosmetics
  WHERE public.user_cosmetics.user_id = caller_id
    AND public.user_cosmetics.skin_id = target_skin_id;

  IF FOUND THEN
    SELECT *
    INTO currency_row
    FROM public.user_currency
    WHERE public.user_currency.user_id = caller_id;

    RETURN QUERY
    SELECT
      existing.skin_id,
      existing.kind,
      existing.price,
      existing.equipped,
      COALESCE(currency_row.mines_balance, 0),
      true;
    RETURN;
  END IF;

  INSERT INTO public.user_currency (user_id)
  VALUES (caller_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT *
  INTO currency_row
  FROM public.user_currency
  WHERE public.user_currency.user_id = caller_id
  FOR UPDATE;

  IF currency_row.mines_balance < target_price THEN
    RAISE EXCEPTION 'insufficient Mines: have %, need %', currency_row.mines_balance, target_price
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.user_currency
  SET
    mines_balance = mines_balance - target_price,
    total_spent = total_spent + target_price,
    updated_at = now()
  WHERE public.user_currency.user_id = caller_id
  RETURNING *
  INTO currency_row;

  INSERT INTO public.user_cosmetics (user_id, skin_id, kind, price, equipped)
  VALUES (caller_id, target_skin_id, target_kind, target_price, false);

  IF target_price > 0 THEN
    INSERT INTO public.mines_transactions (
      user_id,
      delta,
      reason,
      source_id,
      balance_after
    )
    VALUES (
      caller_id,
      -target_price,
      'shop_purchase'::public.mines_transaction_reason,
      NULL,
      currency_row.mines_balance
    );
  END IF;

  RETURN QUERY
  SELECT
    target_skin_id,
    target_kind,
    target_price,
    false,
    currency_row.mines_balance,
    false;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_skin(text, public.cosmetic_kind, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purchase_skin(text, public.cosmetic_kind, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.purchase_skin(text, public.cosmetic_kind, integer) TO authenticated;

-- -------------------------------------------------------------
-- set_equipped_skin: equip a skin (or null to unequip the whole kind).
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_equipped_skin(
  target_kind public.cosmetic_kind,
  target_skin_id text
)
RETURNS TABLE (
  kind public.cosmetic_kind,
  equipped_skin_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
  owned public.user_cosmetics%ROWTYPE;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'set_equipped_skin requires authentication' USING ERRCODE = '28000';
  END IF;

  UPDATE public.user_cosmetics
  SET equipped = false
  WHERE public.user_cosmetics.user_id = caller_id
    AND public.user_cosmetics.kind = target_kind;

  IF target_skin_id IS NULL THEN
    RETURN QUERY SELECT target_kind, NULL::text;
    RETURN;
  END IF;

  SELECT *
  INTO owned
  FROM public.user_cosmetics
  WHERE public.user_cosmetics.user_id = caller_id
    AND public.user_cosmetics.skin_id = target_skin_id
    AND public.user_cosmetics.kind = target_kind;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'skin not owned: %', target_skin_id USING ERRCODE = '42501';
  END IF;

  UPDATE public.user_cosmetics
  SET equipped = true
  WHERE public.user_cosmetics.user_id = caller_id
    AND public.user_cosmetics.skin_id = target_skin_id;

  RETURN QUERY SELECT target_kind, target_skin_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_equipped_skin(public.cosmetic_kind, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_equipped_skin(public.cosmetic_kind, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_equipped_skin(public.cosmetic_kind, text) TO authenticated;
