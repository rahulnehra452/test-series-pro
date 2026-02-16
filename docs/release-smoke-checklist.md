# Release Smoke Checklist

## Build Validation

1. Run `npm run typecheck`.
2. Run `npm run build:android:preview`.
3. Install preview APK on a real Android test device.

## Auth + Session

1. Sign up with email confirmation enabled.
2. Confirm unverified users are not treated as logged in.
3. Verify login works after email confirmation.
4. Verify Google OAuth login still completes and restores profile.

## Catalog + Test Flow

1. Confirm tests load from cloud when `tests` rows exist.
2. Confirm release build does not show mock tests when cloud catalog is empty.
3. Open a test with cloud questions and submit successfully.
4. Confirm release build does not fall back to mock questions.

## Library

1. Save and mark revision from test interface.
2. Open a saved question with UUID id from cloud and confirm detail modal opens.
3. Confirm options/explanation appear when cached payload is available.
4. Confirm minimal fallback detail still opens when full payload is missing.

## Pro Purchase (Android)

1. Open Pricing and verify checkout is available only on Android.
2. Complete a Google Play test purchase with a licensed tester account.
3. Confirm Pro is granted only after backend verification.
4. Confirm cancelled/pending purchases do not grant Pro.
5. Retry with previously used purchase token on another account and confirm it is rejected.

## Profile + Support

1. Confirm Notifications toggle is hidden in release.
2. Confirm Help & Support opens the mail client (`support@testkra.com`) or shows fallback alert.
3. Confirm SeedData screen is unreachable in release build.

## Backend Verification

1. Deploy edge function: `supabase/functions/verify-google-play-purchase/index.ts`.
2. Set secrets:
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
   - `GOOGLE_PLAY_PACKAGE_NAME`
3. Run SQL migrations in order:
   - `migrations/2026-02-16_release_schema_alignment.sql`
   - `migrations/2026-02-16_billing_receipts.sql`
   - `migrations/verify_release_schema.sql`
