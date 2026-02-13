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

## Pending Manual QA

- Verify Google OAuth full round-trip on device/emulator (`testkra://` callback).
- Verify purchase path end-to-end:
  - Non-Pro user -> Pricing -> Buy -> `isPro` updates in Profile and Tests access is unlocked.
- Verify library type changes persist after app restart and across devices.
