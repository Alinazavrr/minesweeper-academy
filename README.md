# Minesweeper Academy + Arena

> Сапёр как продукт, а не как ностальгия. Тренируй паттерны, соревнуйся в Daily, разбирай свои партии с AI-коучем.

**Живая версия:** https://minesweeper-academy-65wn.vercel.app

Проект для nFactorial — переосмысление классического сапёра. Не ещё один клон с гридом и таймером, а платформа уровня chess.com для сапёра: с обучением, соревнованиями, аналитикой и AI-коучем.

---

## Что это

Большинство сайтов с сапёром — 20-летние клоны: поле, мины, секундомер. Они награждают за угадывание, ничему не учат и не дают повода вернуться завтра. **Minesweeper Academy + Arena** превращает сапёр в реальный продукт: место, где можно **учиться** логике, **тренироваться** на паттернах, **соревноваться** в форматах Bullet / Blitz / Rapid и **разбирать** каждую партию с AI-коучем.

**Позиционирование.** Для людей, которые любят логические игры, Minesweeper Academy + Arena — единственная платформа, объединяющая обучение, соревнование и аналитику. Мы относимся к сапёру как к навыку, а не как к убийце времени.

---

## Что построено (MVP / Phase 1 — готово)

| Фича | Где |
| --- | --- |
| **Детерминированный движок** (`@minesweeper/engine`) | TypeScript-пакет: PRNG Mulberry32, генерация поля, applyAction, CSP-солвер. 98 unit-тестов. Один и тот же seed → одинаковая партия в браузере, на сервере и в воркере |
| **Quick Play** | `/play` — Beginner / Intermediate / Expert, защита первого клика, флаги, аккорды, подсказки, сохранение в БД |
| **Auth + сессии** | Email/пароль + Google OAuth через Supabase SSR. `/auth/callback` PKCE, `/account` с историей последних 10 партий |
| **Daily Challenge** | `/daily` — одна доска для всех игроков мира, детерминированный seed на UTC-дату, глобальный лидерборд, share-карточка для соцсетей (1200×630 PNG через `@vercel/og`) |
| **AI Coach** | `/coach` — стриминговый чат с `gpt-4o-mini` через серверный route handler, лимиты по тарифу (Free=5/день, Pro Lite=20, Pro=100), история диалогов, ветка post-game review для каждой партии |
| **Post-Game Review** | `/games/[id]/review` — бинарный replay-формат (<8 байт на действие, full-Expert <1.5KB), скраббер по ходам, отметки ошибок, оверлей пропущенных безопасных клеток, кнопка «Обсудить с коучем» |
| **Academy** | `/learn` — 4 урока (1-1 reduction, 1-2-1, 1-2-2-1, базы теории вероятностей) + 2 концептуальных stub'а, демо-доски с аннотациями, играбельные practice-доски |
| **Stats** | `/stats` — win rate по сложностям, лучшие времена, streak по Daily, 30-партийный спарклайн 3BV/s, точность флагов |
| **Pro tier + платежи (фейковые)** | Модалка с тремя тарифами, RPC `fake_purchase_subscription` через SECURITY DEFINER, переключение тарифа с записью в `subscriptions` |
| **Mines — внутренняя валюта** | RPC `award_mines_for_game` начисляет за каждую партию ровно один раз: Beginner/Intermediate/Expert win = 5/15/50, Daily win = 25, поражение = 20% от выигрыша (мин. 1). Audit-лог в `mines_transactions` |
| **Shop + скины** | `/shop` — два косметических скина по 100 Mines: **Cobalt UI** (перекрашивает весь сайт в синий) и **Cobalt Board** (перекрашивает поле). Таблица `user_cosmetics`, RPC `purchase_skin` + `set_equipped_skin`, надевание/снятие |
| **Arena Preview** | `/arena` — Phase 2 «coming soon» панель: карточки Bullet / Blitz / Rapid, анимированный мок live score race, vision-блок. Очереди намеренно недоступны — это честная заглушка |
| **Тема + аналитика** | Ручной переключатель System/Light/Dark без FOUC, PostHog-события (`landing_view`, `daily_complete`, `coach_message_sent`, `post_game_review_opened`, `pro_modal_view` и т.д.) |
| **Глобальная навигация** | `<SiteNav>` в root layout: Play / Daily / Arena / Learn / Coach / Stats / Shop + баланс Mines + auth CTA. Каждая страница связана с каждой |

---

## Что хотели построить (полное видение из `ideas/PROJECT_PLAN.md`)

Phase 1 (MVP) — закрыт. Полное видение:

- **No-Guess Mode по умолчанию** — серверный пул досок, которые гарантированно решаются чистой логикой. Без 50/50 в ранкеде.
- **Arena (Phase 2)** — синхронизированный старт, параллельные забеги, **live score race**: бары всех участников обновляются в реальном времени каждый раз, когда кто-то решает доску. Bullet (60s) / Blitz (3min) / Rapid (5min). Если за 10 секунд нет реальных оппонентов — очередь добивается ботами (стороной replay-записи) на том же канале broadcast'а, с честной подписью «Bot». Сезоны → значки Bronze / Silver / Gold / Diamond.
- **Per-format Elo + лидерборды** с фильтрами по стране / друзьям / временному окну.
- **Полноценный shop** — больше скинов, эмодзи-флаги, темы под событийные сезоны.
- **Mobile-first контролы** — настраиваемый long-press для флагов, zoom на Expert.
- **Достижения** — за паттерны (10 раз решил 1-2-1 без подсказки), за streak'и, за accuracy.

---

## Что дальше

Кратчайший путь от MVP до релиза:

1. **Browser walkthrough** всех фич в реальном браузере (Playwright MCP) — закрыть верификационный долг.
2. **PostHog ключ** в Vercel — события уже стрелями через `fetch`, осталось только подключить эндпоинт.
3. **Phase 1.5 hardening** — серверный валидатор Daily-сабмишенов (replay через движок, отказ на невозможные cadence), screen-reader live regions, мобильный flag-mode toggle.
4. **Pro tier UX split** — Pro Lite даёт обрезанный review (только число ошибок), полный action log — только Pro.
5. **Phase 2 — Arena** по плану в `ideas/PROJECT_PLAN.md` §10: queue, matchmaker, bot replay pool, websocket для score-race broadcast.

---

## Технологии

| Слой | Стек |
| --- | --- |
| Фреймворк | **Next.js 16** (App Router) + **React 19** + **TypeScript 5** |
| Стилизация | **Tailwind CSS v4** (CSS-config, без `tailwind.config.ts`) + **shadcn/ui** |
| Клиентский state | **Zustand** |
| Серверный state / кэш | **TanStack Query** |
| Backend | **Supabase** (Postgres + Auth + RLS на каждой таблице + Realtime под Phase 2) |
| AI-коуч | **OpenAI `gpt-4o-mini`** через серверный route handler (ключ никогда не уходит в браузер) |
| Хостинг | **Vercel** (preview-деплой на каждый PR, production с `main`) |
| OG-картинки | `@vercel/og` (edge route) |
| Тесты | **Vitest** — 53 app-теста + 98 engine-тестов |
| Движок | `@minesweeper/engine` — pure TS workspace package, ноль DOM-зависимостей |

**Ключевые архитектурные решения:**

- **Движок чистый** — `Math.random()`, DOM, React, Node-only API запрещены. Один и тот же код в браузере, Web Worker и serverless-валидаторе.
- **Детерминизм** — каждая случайная операция через seed-driven Mulberry32 PRNG. Никакой плавающей точки в генерации досок. Тот же seed + действия → байт-идентичное состояние в любой среде.
- **Версионирование движка** — каждая сохранённая партия пишет свой `engine_version`. Мажорный bump → валидатор обязан грузить старые версии.
- **service-role ключ только на сервере** — никогда не импортируется в client component, никогда не пишется в логи. Клиент `service.ts` живёт только под `src/server/` и `src/lib/db/`.
- **Tier-gating на сервере** — Pro-фичи проверяются на уровне RLS / RPC, а не только скрываются на клиенте.
- **TDD на движке** — новая публичная функция → тест сначала, реализация после.
- **Миграции аддитивны** — никаких rename in-place, только добавление колонок и introduce-then-deprecate.

---

## Воркфлоу разработки

Проект собран в режиме **AI-pair programming** с тремя инструментами в связке:

| Инструмент | Что делает |
| --- | --- |
| **Claude Code** | Основная среда — план/спек ↔ архитектура ↔ имплементация ↔ тесты. Дёргает Supabase MCP для миграций и регенерации типов, GitHub MCP для PR-ов, Playwright MCP для проверки UI в реальном браузере |
| **Codex** | Дополнительный быстрый пасс по правкам, генерация типов, мелкие рефакторы |
| **Paperclip** | Заметки, скетчи продукта, прокидывание контекста между сессиями |

**Дисциплина:**

1. Любая новая фича сначала читает `ideas/PROJECT_PLAN.md` и ссылается на параграф `§` оттуда.
2. Изменения движка → TDD: тест в `packages/engine/src/<feature>.test.ts`, убеждаемся что красный, потом реализация.
3. Изменения схемы → миграция через Supabase MCP `apply_migration` → `pnpm types:gen` для регенерации `src/types/supabase.ts`.
4. Перед PR: `pnpm typecheck && pnpm lint && pnpm test:all` зелёные. Для UI — пройти golden path в браузере.
5. Один логический коммит = один `feat:` / `fix:` / `chore:`. PR на `main`, preview на Vercel.

---

## Структура проекта

```
.
├── ideas/
│   └── PROJECT_PLAN.md        # Единственный источник истины по продукту (1042 строки)
├── packages/
│   └── engine/                # Чистый TS-движок сапёра. ZERO DOM-зависимостей
│       ├── src/
│       │   ├── prng.ts        # Mulberry32 PRNG
│       │   ├── generate.ts    # Генерация поля
│       │   ├── apply.ts       # applyAction — единственный мутатор
│       │   ├── solver.ts      # CSP-солвер для подсказок и review
│       │   ├── replay.ts      # Бинарная сериализация replay'я
│       │   └── *.test.ts      # 98 unit-тестов
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (routes)/          # account, arena, auth, coach, daily, games, learn, play, shop, stats
│   │   ├── api/               # Серверные route handlers (Coach SSE, OG-картинка)
│   │   ├── layout.tsx         # Root layout: SiteNav + SkinApplier + ThemeScript
│   │   └── globals.css        # Tailwind v4 + кастомные variant'ы + скины
│   ├── components/
│   │   ├── analytics/         # PostHog-обёртки
│   │   ├── arena/             # ScoreRaceMock — мок live-race для preview
│   │   ├── auth/, billing/    # AuthForm, ProTierDialog
│   │   ├── coach/             # CoachChat (SSE), CoachLayout, ConversationList, Markdown
│   │   ├── cosmetics/         # SkinApplier (применяет классы к <html>), ShopCard
│   │   ├── daily/             # DailyView, ShareButton
│   │   ├── game/              # Board, Cell, Hud, QuickPlay
│   │   ├── landing/           # LandingPreviewBoard
│   │   ├── lessons/           # DemoBoard, PracticeRunner
│   │   ├── nav/               # SiteNav — глобальный header
│   │   ├── review/            # ReplayPlayer
│   │   ├── stats/             # Sparkline
│   │   └── theme/             # ThemeScript (FOUC-free), ThemeToggle
│   ├── lib/
│   │   ├── analytics/         # track.ts — keepalive POST в PostHog
│   │   ├── auth/, billing/, currency/
│   │   ├── cosmetics/         # catalog.ts — каталог скинов
│   │   ├── db/                # Типизированные обёртки над Supabase + RPC: coach, cosmetics, currency, daily, games, stats, subscriptions
│   │   ├── games/             # daily seed, replay encode/decode
│   │   ├── lessons/           # Реестр уроков
│   │   ├── markdown/          # Безопасный inline-рендерер
│   │   └── supabase/          # client.ts / server.ts / service.ts / proxy.ts
│   ├── stores/
│   │   └── game.ts            # Zustand store для Quick Play
│   └── types/
│       └── supabase.ts        # Авто-сгенерированные типы из БД
├── supabase/
│   └── migrations/            # Аддитивные SQL-миграции (0001 → 0009)
├── AGENTS.md                  # Заметки для AI-агентов о ломающих изменениях Next 16
├── CLAUDE.md                  # Конвенции проекта (стек, hard rules, как добавить фичу)
└── README.md                  # ← вы здесь
```

---

## Локальный запуск

```bash
# 1. Установить зависимости
pnpm install

# 2. Скопировать .env.example в .env.local и заполнить ключами
cp .env.example .env.local
# Нужны:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY   (только для серверных RPC)
#   OPENAI_API_KEY              (для AI-коуча)
#   NEXT_PUBLIC_POSTHOG_KEY     (опционально — без него аналитика логируется в console.debug)

# 3. Поднять dev-сервер
pnpm dev

# 4. Проверки перед PR
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm test:all    # vitest по приложению + по движку
```

База данных и миграции — через Supabase MCP (`apply_migration`, `generate_typescript_types`). После применения миграции типы регенерируются в `src/types/supabase.ts` через `mcp__supabase__generate_typescript_types` либо через Supabase CLI:

```bash
supabase gen types typescript --linked > src/types/supabase.ts
```

---

## Лицензия и контекст

Проект собран для **nFactorial Incubator** как демо founder-vision. Спец, архитектура и видение — в `ideas/PROJECT_PLAN.md`. Конвенции для дальнейшей разработки — в `CLAUDE.md`.

Engine ↔ UI ↔ DB ↔ Coach — все слои детерминированы и независимо тестируемы. Если интересно поднять Phase 2 (Arena с реальным matchmaking) — план готов, осталось имплементировать `arena_queue`, websocket-broadcast для score race, и bot replay pool.
