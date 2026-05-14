-- =============================================================
-- Phase 1 RLS policies.
--
-- Access model (PROJECT_PLAN §17):
--   - Score / Mines / subscriptions.tier writes go through RPCs (service role).
--   - Users can read/write their own profile, settings, games, lesson_progress,
--     coach_* (within their own conversations).
--   - daily_challenges / daily_results / lessons / users readable by any
--     authenticated user (leaderboards + SEO + profile lookups).
--   - anon role gets read-only access to published lesson pages so SEO crawls
--     still work without auth.
-- =============================================================

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_share_cards   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_currency       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mines_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_usage_daily   ENABLE ROW LEVEL SECURITY;

-- ---------- users ----------
-- SELECT: any signed-in user (display_name needed for leaderboards / mentions).
-- UPDATE: owner only. INSERT/DELETE: trigger / cascade only (no policy = blocked).

CREATE POLICY users_select_authenticated ON public.users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ---------- user_settings ----------

CREATE POLICY user_settings_select_own ON public.user_settings
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY user_settings_update_own ON public.user_settings
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------- subscriptions ----------
-- Owner can read. Writes go through the fake-purchase RPC (service role).

CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ---------- games ----------
-- Owner reads/writes their own games. Public game viewing comes via shared
-- replay links (Phase 2) — at that point we'll add a viewer-targeted policy
-- gated on a separate share token, not on the games row directly.

CREATE POLICY games_select_own ON public.games
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY games_insert_own ON public.games
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY games_update_own ON public.games
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY games_delete_own ON public.games
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ---------- daily_challenges ----------
-- Public read (anon + auth) so the SEO landing page can show today's tease.
-- Writes are service-role-only (no policy).

CREATE POLICY daily_challenges_select ON public.daily_challenges
  FOR SELECT TO anon, authenticated
  USING (true);

-- ---------- daily_results ----------
-- Public read for leaderboards (authenticated only — anon doesn't need
-- to view ranks in MVP).
-- Insert/update gated to owner.

CREATE POLICY daily_results_select ON public.daily_results
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY daily_results_insert_own ON public.daily_results
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY daily_results_update_own ON public.daily_results
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------- daily_share_cards ----------
-- Public read so OG previews work without auth.

CREATE POLICY daily_share_cards_select ON public.daily_share_cards
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY daily_share_cards_insert_own ON public.daily_share_cards
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------- user_currency ----------
-- Owner reads. Writes via service-role RPC only.

CREATE POLICY user_currency_select_own ON public.user_currency
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ---------- mines_transactions ----------
-- Owner reads. Inserts via service-role RPC only.

CREATE POLICY mines_transactions_select_own ON public.mines_transactions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ---------- lessons ----------
-- Public read on published lessons (anon + auth — SEO + signed-out browsing).
-- Authors / admins write via service role.

CREATE POLICY lessons_select_published ON public.lessons
  FOR SELECT TO anon, authenticated
  USING (published = true);

-- ---------- lesson_progress ----------

CREATE POLICY lesson_progress_select_own ON public.lesson_progress
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY lesson_progress_insert_own ON public.lesson_progress
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY lesson_progress_update_own ON public.lesson_progress
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ---------- coach_conversations ----------

CREATE POLICY coach_conversations_select_own ON public.coach_conversations
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY coach_conversations_insert_own ON public.coach_conversations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY coach_conversations_update_own ON public.coach_conversations
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY coach_conversations_delete_own ON public.coach_conversations
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ---------- coach_messages ----------
-- Owner can read messages whose conversation belongs to them.
-- Writes go through the streaming edge function (service role).

CREATE POLICY coach_messages_select_own ON public.coach_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_conversations c
      WHERE c.id = coach_messages.conversation_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- ---------- coach_usage_daily ----------

CREATE POLICY coach_usage_daily_select_own ON public.coach_usage_daily
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
