# AI Context — TestKra (test-series-pro)

> A React Native + Expo mobile app for UPSC/SSC exam preparation with test series, analytics, and cloud sync.

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Framework | React Native 0.76 + Expo SDK 52 |
| Language | TypeScript (strict mode) |
| State | Zustand 4.x with AsyncStorage persistence |
| Backend | Supabase (Auth, PostgreSQL, RLS) |
| Navigation | React Navigation 7 (native-stack + bottom-tabs) |
| Animations | React Native Reanimated 3 |
| Charts | react-native-chart-kit |
| Lists | @shopify/flash-list |

## Project Structure

```
src/
├── App.tsx                  # Root: navigation, theme provider, error boundary
├── stores/
│   ├── authStore.ts         # Zustand — auth, session, profile sync
│   ├── testStore.ts         # Zustand — tests, answers, history, library, cloud sync
│   └── toastStore.ts        # Zustand — toast notifications
├── screens/
│   ├── HomeScreen.tsx        # Dashboard: greeting, streak, progress grid, recent activity
│   ├── TestsScreen.tsx       # Test series catalog / browsing
│   ├── TestInterfaceScreen.tsx # Active test-taking engine
│   ├── ResultsScreen.tsx     # Post-test results & score breakdown
│   ├── SolutionsScreen.tsx   # Detailed answer explanations
│   ├── StatsScreen.tsx       # Statistics: charts, filters (month/year), test history
│   ├── LibraryScreen.tsx     # Saved/wrong/learn question library
│   ├── ProfileScreen.tsx     # User profile & settings
│   ├── LoginScreen.tsx       # Email/password login
│   ├── SignupScreen.tsx      # Registration
│   ├── PricingScreen.tsx     # Subscription plans
│   └── SeedDataScreen.tsx    # Dev: seed test data
├── components/
│   ├── common/               # Button, Toast, Skeleton, LoadingScreen, ErrorBoundary, etc.
│   ├── home/                 # ProgressGrid, StreakCard, ContinueLearning
│   ├── test/                 # QuestionCard, QuestionPalette, Timer, etc.
│   ├── tests/                # TestSeriesCard, etc.
│   └── profile/              # Profile-specific components
├── constants/
│   └── theme.ts              # Design tokens: colors, typography, spacing, borderRadius
├── contexts/
│   └── ThemeContext.tsx       # Light/dark theme management
├── types/
│   └── index.ts              # TypeScript interfaces: User, Question, TestAttempt, LibraryItem
├── navigation/
│   └── AppNavigator.tsx      # Tab navigator + stack screens
├── lib/
│   └── supabase.ts           # Supabase client init
├── hooks/
│   └── useInAppUpdates.ts    # OTA update hook
└── utils/                    # Helper utilities
```

## Key Data Types (src/types/index.ts)

- **TestAttempt** — `status: 'In Progress' | 'Completed' | 'Abandoned'`
- **LibraryItemType** — `'saved' | 'wrong' | 'learn'` (mapped to DB: `'bookmark' | 'wrong' | 'note'`)
- **Question** — MCQ or NAT with options, correctAnswer index, explanation
- **Subject** — `'Polity' | 'History' | 'Geography' | 'Economy' | 'Science' | 'Environment' | 'CSAT'`

## Database (Supabase)

Key tables with RLS enabled:
- `profiles` — user metadata, streak, subscription status
- `attempts` — completed/in-progress test scores and answers
- `test_progress` — in-progress test state (for resume functionality)
- `bookmarks` — saved questions; **type constraint**: `('bookmark', 'wrong', 'note')`

> **Important**: The app's internal `LibraryItemType` values differ from the DB constraint. A mapping layer in `testStore.ts` translates between them.

## Architecture Notes

1. **Optimistic Updates**: All store mutations update local state first, then sync to Supabase in the background.
2. **Persistence**: Zustand stores use `AsyncStorage` for offline-first data.
3. **Theme System**: `ThemeContext` provides `colors`, `typography`, `spacing`, `borderRadius` tokens. All components use `useTheme()`.
4. **Stats Filtering**: `StatsScreen` supports month/year filtering. All metrics (Total Tests, Avg Score, Time Spent, Chart) only count tests with `status === 'Completed'`.
5. **Cumulative Graph**: The "Total Questions Solved" chart aggregates answered questions by day and shows a running total.

## Common Pitfalls

- **Bookmark type mismatch**: App uses `'saved'`/`'learn'`, DB expects `'bookmark'`/`'note'`. Always go through the mapping in `testStore.ts`.
- **Test completion**: A test is only `'Completed'` after the user explicitly finishes it. `'In Progress'` tests should be excluded from progress statistics.
- **Auth session**: `checkSession()` in `authStore.ts` handles token refresh failures gracefully and triggers `syncLibrary`/`syncProgress` on successful auth.

## Running the App

```bash
npm install
npx expo start          # Start dev server
```

## Context Maintenance Rules

When making changes, update this file with:

1. **What changed**: short bullets by feature/fix pack.
2. **Files touched**: key files only (absolute or workspace-relative paths).
3. **Verification run**: commands executed and outcome.
4. **Pending manual QA**: anything that still needs device testing.

Keep entries newest-first under `## Recent Changes`.

## Recent Changes

### 2026-02-14 — Codex (Pack 8: Login/Session Timeout Safety)
- **Prevented post-login infinite loading states**
  - Added timeout guards in `src/stores/authStore.ts` for:
    - `signInWithPassword` (15s)
    - `getSession` (10s)
    - profile fetch/restore queries (8s)
  - If Supabase/network stalls, auth now fails fast instead of leaving the app on a perpetual loading state.
- **Login now hydrates profile non-blocking**
  - `login()` sets authenticated base user immediately after successful sign-in.
  - Profile enrichment (`full_name`, `is_pro`, `streak`) now runs in a background async path so navigation is not blocked by slow profile queries.
- **Session restore query hardened**
  - `checkSession()` profile read switched to `.maybeSingle()` with timeout to avoid brittle `.single()` failure behavior on missing rows.
- **Files touched**
  - `src/stores/authStore.ts`
- **Validation**
  - `npx tsc --noEmit` passed.
  - `npx expo start --clear --tunnel` started successfully and produced a valid `exp.direct` URL.

### 2026-02-13 — Codex (Pack 7: Progress Lifecycle Cleanup)
- **Completed tests now clear cloud resume rows**
  - `finishTest()` in `src/stores/testStore.ts` now deletes the matching `test_progress` row (`user_id + test_id`) after successful completion flow.
  - Prevents stale “resume” records from reappearing after app restart or re-login.
- **`saveProgress()` cloud payload now uses latest elapsed time**
  - Refactored `saveProgress()` to compute a single snapshot (`finalTimeSpent`) and use it consistently for:
    - local in-progress history row
    - Supabase `test_progress.time_spent`
  - Also refreshes `questionVisitedAt` to `now` when still playing, avoiding double-counted elapsed time on repeated saves.
- **Safer active-session resets**
  - `finishTest()`, `resetActiveTest()`, and `clearAllData()` now clear all active-session fields (`currentIndex`, `timeRemaining`, `totalTime`, `endTime`, `sessionStartTime`, `timeSpent`, `questionVisitedAt`, `isPlaying`) to avoid stale state bleed.
- **Files touched**
  - `src/stores/testStore.ts`
- **Validation**
  - `npx tsc --noEmit` passed.
  - `npx expo start --clear --port 8085` started Metro successfully.

### 2026-02-13 — Codex (Pack 6: Progress Resume + Access Reliability)
- **Fixed non-Pro access gating**
  - `TestsScreen` now allows opening tests when any of these are true:
    - user is Pro
    - test is already unlocked/free (`isPurchased`)
    - there is an active in-progress attempt to resume
  - Prevents accidental redirect to Pricing for free/unlocked tests.
- **Cloud progress restore is now resume-safe**
  - `syncProgress()` in `src/stores/testStore.ts` now restores:
    - `currentIndex` from `test_progress.current_index`
    - `timeRemaining`, answers, marked-for-review, and time-spent maps
  - Progress entries now resolve better `testTitle` values using:
    - local `tests` state
    - existing history cache
    - Supabase `tests(id,title)` lookup for UUID ids
  - Reconciliation now replaces stale local in-progress rows with the richer version (cloud or local), instead of keeping outdated duplicates.
  - `fetchHistory()` now preserves existing non-completed attempts while refreshing completed history pages, so in-progress resume rows are not dropped on `fetchHistory(0)`.
- **Home recent activity behavior fixed**
  - `HomeScreen` now fetches history on mount (`fetchHistory(0)`), so cloud attempts show without needing to open Stats first.
  - Tapping an **In Progress** activity now resumes `TestInterface` (instead of incorrectly opening `Results`).
  - Score color/text now guards `totalMarks=0` rows to avoid NaN/Infinity edge cases.
- **Files touched**
  - `src/screens/TestsScreen.tsx`
  - `src/stores/testStore.ts`
  - `src/screens/HomeScreen.tsx`
- **Validation**
  - `npx tsc --noEmit` passed.
  - `npx expo start --clear --port 8084` started Metro successfully.

### 2026-02-13 — Codex (Pack 5: Expo/Config Hygiene)
- **Expo doctor fully green**
  - `npx expo-doctor` now reports `17/17 checks passed`.
- **Fixed asset format mismatches**
  - Converted app icon/splash/adaptive foreground files to true PNG content:
    - `assets/testkra_icon.png`
    - `assets/testkra_splash.png`
    - `assets/testkra_adaptive_foreground.png`
  - Added `assets/favicon.png` for web config parity.
- **Dependency compatibility alignment**
  - Installed/updated:
    - `@expo/metro-runtime@~4.0.1`
    - `@shopify/flash-list@1.7.3`
    - `react-native@0.76.9`
- **Expo doctor/install config**
  - Added `expo.doctor.reactNativeDirectoryCheck.exclude` and `expo.install.exclude` in `package.json` for:
    - `expo-av`
    - `react-native-chart-kit`
- **Validation**
  - `npx expo-doctor` passed (`17/17`).
  - `npx tsc --noEmit` passed.
  - `npx expo start --clear --port 8083` started Metro successfully.

### 2026-02-13 — Codex (Pack 4: Test/Data Consistency)
- **Normalized remote tests into app-safe shape**
  - Added deterministic mapping in `src/stores/testStore.ts` so fetched tests always provide:
    - `id`, `title`, `description`, `category`, `difficulty`
    - `totalTests`, `totalQuestions`, `duration`, `price`, `isPurchased`
  - Prevents UI regressions caused by mixed snake_case DB fields.
- **Removed brittle legacy question-fetch fallback**
  - `fetchQuestions()` now avoids arbitrary title heuristics for non-UUID ids and cleanly returns `[]` so `TestInterfaceScreen` can use mock fallback.
- **Preserved real test titles in cloud history**
  - `fetchHistory()` now resolves titles from:
    - cached store tests
    - existing local history
    - direct Supabase `tests(id,title)` lookup for UUID ids
    - final fallback: prettified test id
- **Aligned seed flow with schema expectations**
  - `src/screens/SeedDataScreen.tsx` now uses `.maybeSingle()` for safe existence checks.
  - Updated `supabase_schema.sql` to include `tests.total_tests` and reflect current `attempts` shape (`test_id text`, `questions jsonb`).
  - Added migration helper `fix_tests_total_tests.sql` for existing DBs.
- **Validation**
  - `npx tsc --noEmit` passed.
  - `npx expo start --clear --port 8083` started Metro successfully.

### 2026-02-13 — Codex (Pack 3: Data Sync Integrity)
- **Attempt upload dedupe + id consistency**
  - Added `id` to `attempts` insert/upsert payloads in `src/stores/testStore.ts`.
  - Prevented duplicate queue entries for offline/pending uploads.
- **History fetch stability**
  - `fetchHistory()` now orders by `started_at` (not `created_at`) in `src/stores/testStore.ts`.
- **Library cloud/local merge safety**
  - `syncLibrary()` now merges cloud + local by `questionId/type` and keeps the newest entry.
  - Added explicit app<->DB type mapping helpers (`saved/learn/wrong` <-> `bookmark/note/wrong`).
- **Library type changes now sync to cloud**
  - `updateLibraryItemType()` is async and performs cloud delete(old type) + upsert(new type) with rollback on failure.
- **Wrong-answer auto-save cloud sync**
  - New `wrong` items generated in `finishTest()` are now upserted to `bookmarks`.
- **Stats initial history load**
  - `StatsScreen` now calls `fetchHistory(0)` on mount.
- **Validation**
  - `npx tsc --noEmit` passed.
  - `npx expo start --clear --port 8083` started Metro successfully.

### 2026-02-13 — Codex (Pack 2: Pro Purchase Flow)
- **Real Pro activation path added**
  - Added `activatePro()` in `src/stores/authStore.ts` to update `profiles.is_pro` and local auth state.
- **Pricing flow wired to backend**
  - `src/screens/PricingScreen.tsx` now calls `activatePro()`, handles loading/success/error UX, and disables CTA when already Pro.
- **Profile subscription navigation**
  - `src/screens/ProfileScreen.tsx` subscription row now opens `Pricing`.
- **Validation**
  - `npx tsc --noEmit` passed.
  - `npx expo start --clear --port 8083` started Metro successfully.

### 2026-02-13 — Codex
- **Refactored `authStore.ts`**: Improved `logout` and `checkSession` with robust `try/catch/finally` blocks for better error handling and state cleanup.
- **OAuth redirect fix**: Updated Google OAuth redirect scheme to `testkra` in `src/screens/LoginScreen.tsx`.
- **Compile blocker removal**: Removed dead reset path calling non-existent store methods in `src/components/profile/EditProfileModal.tsx`.
- **Validation**
  - `npx tsc --noEmit` passed.
  - `npx expo start --clear --port 8083` started Metro successfully.

### 2026-02-13 — Antigravity
- **Fixed bookmark sync**: Added type mapping layer in `testStore.ts` (`saved` → `bookmark`, `learn` → `note`) to resolve database constraint violations.
- **Implemented Stats Filters**: Added Month/Year filters to `StatsScreen.tsx`.
- **Updated Progress Graph**: Changed specific "Performance Trend" to cumulative "Total Questions Solved".
- **Fixed Progress Logic**: Updated `ProgressGrid` and `StatsScreen` to only count tests with `status === 'Completed'`.

### 2026-02-16 — Codex (Release Hardening)
- **Runtime env guardrails**
  - Added `src/config/runtimeConfig.ts` to centralize runtime config and required env validation.
  - Added `src/components/common/ConfigErrorScreen.tsx` and startup block in `src/App.tsx` so missing Supabase env now fails fast with a clear screen.
  - Updated `src/lib/supabase.ts` to use explicit config flags and safe placeholders instead of silent empty strings.
- **Secure purchase entitlement path (Android-first)**
  - Added `expo-iap` dependency and plugin for Google Play Billing.
  - Added `src/services/payments/googlePlayBilling.ts` for purchase orchestration and backend verification.
  - Updated `src/screens/PricingScreen.tsx` to remove direct `activatePro()` purchase path and require verified backend response before entitlement.
  - iOS now clearly shows Android-first billing messaging.
- **Backend purchase verification + replay defense**
  - Added Supabase Edge Function: `supabase/functions/verify-google-play-purchase/index.ts`.
  - Added migration: `migrations/2026-02-16_billing_receipts.sql` (`purchase_receipts` table, constraints, RLS).
- **Admin seeder lockdown**
  - `SeedData` route is registered only in dev (`src/navigation/AppNavigator.tsx`).
  - `src/screens/SeedDataScreen.tsx` now self-blocks in non-dev builds.
- **Mock fallback disabled for release**
  - `src/screens/TestsScreen.tsx`: mock catalog fallback is now dev-only.
  - `src/screens/TestInterfaceScreen.tsx`: mock questions fallback is now dev-only.
- **Library question open resilience**
  - `LibraryItem` now stores optional cached question detail fields (`options`, `correctAnswer`, `explanation`, `questionType`).
  - Library open path now resolves in order: cached details -> cloud `questions` row by UUID -> dev mock fallback -> minimal detail fallback.
  - Updated cloud sync payloads/mapping in `src/stores/testStore.ts` and library save calls in `src/screens/TestInterfaceScreen.tsx`.
- **Signup confirmation safety**
  - `signup` return contract now distinguishes `signed_in` vs `email_confirmation_required` in `src/stores/authStore.ts`.
  - `src/screens/SignupScreen.tsx` now shows verify-email message and keeps unverified users out of authenticated state.
- **Schema alignment artifacts**
  - Added `migrations/2026-02-16_release_schema_alignment.sql`.
  - Added `migrations/verify_release_schema.sql`.
  - Updated canonical `supabase_schema.sql` to match runtime table usage (`bookmarks`, `test_progress`, `purchase_receipts`) and mark `library_items` as legacy.
- **Launch polish**
  - Hid non-functional Notifications toggle for release (`src/screens/ProfileScreen.tsx`).
  - Help & Support now opens `mailto:support@testkra.com` with alert fallback.
- **Release pipeline baseline**
  - Added `eas.json`.
  - Added build/typecheck scripts in `package.json`.
  - Added release QA checklist: `docs/release-smoke-checklist.md`.

## Pending Manual QA

- Verify Google OAuth full round-trip on device/emulator (`testkra://` callback).
- Verify Google Play purchase flow on Android real device:
  - Completed purchase grants `profiles.is_pro` only after backend verification.
  - Pending/cancelled purchase does not grant Pro.
  - Replay token attempt does not grant another account.
- Verify iOS Pricing behavior:
  - Purchase CTA remains disabled/blocked with clear Android-first message.
- Confirm `SeedData` screen is not reachable in release builds.
- Confirm release build with empty cloud tests/questions shows empty state (no mock fallback).
- Run SQL migrations in Supabase:
  - `migrations/2026-02-16_release_schema_alignment.sql`
  - `migrations/2026-02-16_billing_receipts.sql`
  - `migrations/verify_release_schema.sql`
- Deploy and test Supabase edge function:
  - `supabase/functions/verify-google-play-purchase/index.ts`
  - Set secrets: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`.
- Verify library detail modal opens for:
  - Cached saved data
  - Cloud UUID questions
  - Minimal fallback rows
- Run release smoke checklist: `docs/release-smoke-checklist.md`.
