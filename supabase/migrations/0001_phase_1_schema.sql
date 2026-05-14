-- =============================================================
-- Minesweeper Academy + Arena — Phase 1 schema
-- See ideas/PROJECT_PLAN.md §17 for the full data model.
--
-- Strategy:
--   - Forward-looking enums: declare every value any phase will ever use
--     up front. Adding enum values in Postgres later requires migrations
--     that block writers; we'd rather declare unused values today.
--   - Forward-looking columns: Phase 2/3 columns nullable on Phase 1 tables.
--   - Forward-looking tables (arena_*, board_pool, skins, etc.) deferred:
--     they have no FKs from Phase 1 tables, so creating them later is safe.
--   - Every table: timestamptz `created_at`; `updated_at` where mutated.
--   - FKs are explicit and indexed where they'll drive a hot query.
-- =============================================================

-- -------------------------------------------------------------
-- Extensions
-- -------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- -------------------------------------------------------------
-- Enums (declared with all forward-looking values from day 1)
-- -------------------------------------------------------------

CREATE TYPE theme_pref AS ENUM ('light', 'dark', 'system');

CREATE TYPE tap_mode AS ENUM ('reveal', 'flag');

CREATE TYPE subscription_tier AS ENUM ('free', 'pro_lite', 'pro');

CREATE TYPE subscription_granted_via AS ENUM (
  'free_default',
  'fake_purchase',
  'admin_grant'
);

CREATE TYPE game_difficulty AS ENUM (
  'beginner',
  'intermediate',
  'expert',
  'custom'
);

CREATE TYPE game_result AS ENUM ('win', 'loss', 'abandoned');

CREATE TYPE game_source_mode AS ENUM (
  'quick_play',
  'daily',
  'arena',
  'practice',
  'lesson_practice'
);

CREATE TYPE mines_transaction_reason AS ENUM (
  'game_finish',
  'daily_finish',
  'season_reward',
  'shop_purchase',
  'admin'
);

CREATE TYPE lesson_category AS ENUM (
  'patterns',
  'probability',
  'technique',
  'opening',
  'endgame'
);

CREATE TYPE lesson_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');

CREATE TYPE coach_conversation_kind AS ENUM ('post_game_review', 'free_chat');

CREATE TYPE coach_message_role AS ENUM ('user', 'assistant', 'system');

-- -------------------------------------------------------------
-- users
-- Mirrors auth.users with app-specific profile fields. The trigger
-- below auto-inserts the public row on auth signup.
-- -------------------------------------------------------------

CREATE TABLE public.users (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name citext NOT NULL,
  email        text NOT NULL,
  country      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_display_name_unique UNIQUE (display_name),
  CONSTRAINT users_display_name_len CHECK (char_length(display_name) BETWEEN 3 AND 24)
);

-- -------------------------------------------------------------
-- user_settings
-- -------------------------------------------------------------

CREATE TABLE public.user_settings (
  user_id             uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  theme               theme_pref NOT NULL DEFAULT 'system',
  high_contrast       boolean NOT NULL DEFAULT false,
  tap_mode            tap_mode NOT NULL DEFAULT 'reveal',
  long_press_to_flag  boolean NOT NULL DEFAULT true,
  zoom_on_expert      boolean NOT NULL DEFAULT true,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- subscriptions
-- -------------------------------------------------------------

CREATE TABLE public.subscriptions (
  user_id      uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  tier         subscription_tier NOT NULL DEFAULT 'free',
  granted_via  subscription_granted_via NOT NULL DEFAULT 'free_default',
  granted_at   timestamptz,
  valid_until  timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_tier_idx ON public.subscriptions (tier);

-- -------------------------------------------------------------
-- games
-- Replay blob captured in MVP; viewer ships in Phase 2.
-- -------------------------------------------------------------

CREATE TABLE public.games (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  difficulty      game_difficulty NOT NULL,
  rows            integer NOT NULL CHECK (rows > 0 AND rows <= 64),
  cols            integer NOT NULL CHECK (cols > 0 AND cols <= 64),
  mine_count      integer NOT NULL CHECK (mine_count >= 0),
  seed            text NOT NULL,
  no_guess        boolean NOT NULL DEFAULT false,
  result          game_result NOT NULL,
  time_ms         integer NOT NULL CHECK (time_ms >= 0),
  mistakes        integer NOT NULL DEFAULT 0 CHECK (mistakes >= 0),
  flags_placed    integer NOT NULL DEFAULT 0 CHECK (flags_placed >= 0),
  flags_correct   integer NOT NULL DEFAULT 0 CHECK (flags_correct >= 0),
  hints_used      integer NOT NULL DEFAULT 0 CHECK (hints_used >= 0),
  three_bv        integer NOT NULL CHECK (three_bv >= 0),
  three_bvs       double precision NOT NULL DEFAULT 0 CHECK (three_bvs >= 0),
  engine_version  text NOT NULL,
  replay_blob     bytea,
  source_mode     game_source_mode NOT NULL,
  daily_date      date,
  arena_match_id  uuid, -- FK target (arena_matches) created in a Phase 2 migration
  finished_at     timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT games_daily_date_consistent CHECK (
    (source_mode = 'daily') = (daily_date IS NOT NULL)
  )
);

CREATE INDEX games_user_id_finished_at_idx ON public.games (user_id, finished_at DESC);
CREATE INDEX games_source_mode_idx ON public.games (source_mode);
CREATE INDEX games_daily_date_idx ON public.games (daily_date) WHERE daily_date IS NOT NULL;

-- -------------------------------------------------------------
-- daily_challenges
-- -------------------------------------------------------------

CREATE TABLE public.daily_challenges (
  date        date PRIMARY KEY,
  difficulty  game_difficulty NOT NULL,
  seed        text NOT NULL,
  rows        integer NOT NULL CHECK (rows > 0 AND rows <= 64),
  cols        integer NOT NULL CHECK (cols > 0 AND cols <= 64),
  mine_count  integer NOT NULL CHECK (mine_count > 0),
  three_bv    integer NOT NULL CHECK (three_bv > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- daily_results
-- Composite PK (date, user_id) — one official attempt per user per day.
-- -------------------------------------------------------------

CREATE TABLE public.daily_results (
  date          date NOT NULL REFERENCES public.daily_challenges(date) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_id       uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  time_ms       integer NOT NULL CHECK (time_ms >= 0),
  mistakes      integer NOT NULL DEFAULT 0,
  hints_used    integer NOT NULL DEFAULT 0,
  validated     boolean NOT NULL DEFAULT true,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, user_id)
);

-- Leaderboard query: ORDER BY time_ms ASC, mistakes ASC, submitted_at ASC.
CREATE INDEX daily_results_leaderboard_idx
  ON public.daily_results (date, time_ms, mistakes, submitted_at);

-- -------------------------------------------------------------
-- daily_share_cards
-- @vercel/og rendered images, cached so we don't regenerate on every view.
-- -------------------------------------------------------------

CREATE TABLE public.daily_share_cards (
  date        date NOT NULL REFERENCES public.daily_challenges(date) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  image_url   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, user_id)
);

-- -------------------------------------------------------------
-- user_currency + mines_transactions
-- All writes go through SECURITY DEFINER RPCs (service-role only via RLS).
-- -------------------------------------------------------------

CREATE TABLE public.user_currency (
  user_id                  uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  mines_balance            integer NOT NULL DEFAULT 0 CHECK (mines_balance >= 0),
  total_earned             integer NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_spent              integer NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  last_earn_at             timestamptz,
  daily_earn_cap_reset_at  date,
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mines_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delta          integer NOT NULL CHECK (delta <> 0),
  reason         mines_transaction_reason NOT NULL,
  source_id      uuid,
  balance_after  integer NOT NULL CHECK (balance_after >= 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mines_transactions_user_created_idx
  ON public.mines_transactions (user_id, created_at DESC);

-- -------------------------------------------------------------
-- lessons + lesson_progress
-- -------------------------------------------------------------

CREATE TABLE public.lessons (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                   text NOT NULL UNIQUE,
  title                  text NOT NULL,
  category               lesson_category NOT NULL,
  difficulty             lesson_difficulty NOT NULL,
  concept_md             text NOT NULL,
  demo_board             jsonb NOT NULL DEFAULT '{}'::jsonb,
  practice_board_config  jsonb NOT NULL DEFAULT '{}'::jsonb,
  order_in_category      integer NOT NULL DEFAULT 0,
  published              boolean NOT NULL DEFAULT false,
  seo_meta               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lessons_category_order_idx ON public.lessons (category, order_in_category);
CREATE INDEX lessons_published_idx ON public.lessons (published) WHERE published = true;

CREATE TABLE public.lesson_progress (
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id     uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  stars         smallint NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  best_time_ms  integer CHECK (best_time_ms IS NULL OR best_time_ms >= 0),
  viewed_at     timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  PRIMARY KEY (user_id, lesson_id)
);

-- -------------------------------------------------------------
-- AI Coach (Pro tier)
-- -------------------------------------------------------------

CREATE TABLE public.coach_conversations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_id          uuid REFERENCES public.games(id) ON DELETE SET NULL,
  kind             coach_conversation_kind NOT NULL,
  title            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_message_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coach_conversations_user_idx
  ON public.coach_conversations (user_id, last_message_at DESC);

CREATE TABLE public.coach_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  role                coach_message_role NOT NULL,
  content             text NOT NULL,
  token_count_input   integer,
  token_count_output  integer,
  model               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coach_messages_conversation_idx
  ON public.coach_messages (conversation_id, created_at ASC);

CREATE TABLE public.coach_usage_daily (
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date           date NOT NULL,
  message_count  integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  token_count    integer NOT NULL DEFAULT 0 CHECK (token_count >= 0),
  PRIMARY KEY (user_id, date)
);

-- -------------------------------------------------------------
-- updated_at trigger helper
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER trg_user_currency_updated_at
  BEFORE UPDATE ON public.user_currency
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER trg_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- -------------------------------------------------------------
-- handle_new_user — on auth signup, create the public.users row plus
-- the satellite tables. SECURITY DEFINER so it can write across schemas.
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  base_name text;
  attempt   text;
  suffix    integer := 0;
BEGIN
  -- Display name: take metadata.display_name if provided, else first 8 of uuid
  base_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
    'player_' || substr(NEW.id::text, 1, 8)
  );
  attempt := base_name;

  -- Resolve display_name collisions deterministically.
  WHILE EXISTS (SELECT 1 FROM public.users WHERE display_name = attempt::citext) LOOP
    suffix := suffix + 1;
    attempt := base_name || '_' || suffix::text;
  END LOOP;

  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, attempt);

  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.subscriptions (user_id) VALUES (NEW.id);
  INSERT INTO public.user_currency (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
