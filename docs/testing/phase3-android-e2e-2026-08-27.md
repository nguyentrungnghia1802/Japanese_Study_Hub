# Phase 3 Android smoke/E2E verification

Date: 2026-08-27  
Scope: TASK-515

## Local gate results

- `:app:testDebugUnitTest`, `:app:lintDebug`, `:app:assembleDebug`,
  `:app:assembleProduction`, and `:app:verifyApiBaseUrls` passed from
  `apps/mobile`.
- `adb devices` returned only `List of devices attached` with no connected
  emulator or physical device.
- `:app:connectedDebugAndroidTest --no-daemon --console=plain` compiled the
  instrumentation APKs but stopped at the device gate with
  `DeviceException: No connected devices!`.

## Unclaimed device journey

No Android UI smoke/E2E result is claimed for login, Lookup, history/favorites,
Flashcard continuity, active Exam restriction, submitted-review continuity,
last-three mistakes, or provider retry states. These checks require an owner-
controlled emulator/device and must be rerun with the API base URL and test
account configured for that environment.

This boundary is intentionally separate from the passing Android compile,
unit-test, lint, APK-build, and API-URL checks. It does not claim production
connectivity, release signing, or physical-device behavior.
