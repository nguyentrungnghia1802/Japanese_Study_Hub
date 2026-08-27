# Phase 2 Android smoke/E2E verification

Date: 2026-08-27
Scope: TASK-304

## Environment

- Android emulator `emulator-5554`, AVD `Medium_Phone_API_36.1`.
- Debug APK built with `-PapiBaseUrl=http://10.0.2.2:4000/api/v1`.
- Local NestJS API on port 4000 and PostgreSQL on localhost:5432.
- The local test account was used for authentication; its password is not
  stored in this report.
- UI assertions were collected with Android UIAutomator text/bounds dumps.
- The connected instrumentation gate ran one smoke test on the same emulator.

## Journey results

- Login/session restore: passed. After a successful login, force-stopping and
  reopening the app showed the authenticated shell from the cached identity
  before the remote `/auth/me` verification completed.
- Cached library startup: passed. Dashboard, flashcard library, and exam
  library opened with data previously written to the Room read cache.
- Background refresh: passed. Warm library screens showed `Đang làm mới từ
máy chủ…` while the remote request was in flight.
- Flashcard study: passed. Opened the temporary two-card set, flipped both
  cards, and advanced through the study session.
- FSRS review: passed. Revealed and rated both new cards `Good`; the queue
  changed from two new cards to the completed state and displayed the server
  scheduling message.
- Exam list and timed exam: passed. Opened the temporary five-minute exam,
  verified the `Câu 1/1` header and countdown, selected an incorrect option,
  and submitted through the confirmation dialog.
- Result review: passed. The result showed `0 / 100`, `Đúng 0/1 câu`, and
  highlighted the selected and correct options only after submission.
- Mistake review: passed. The submitted question appeared in `Review
mistakes` with sanitized prompt/options and a `Practice` action.
- Practice isolation: passed. The correct practice answer produced `100 /
100` and `Không ảnh hưởng Best score`.
- No-answer-leakage: passed. Live exam and Practice UI dumps contained only
  question/options text; correctness fields were absent until the graded
  result screen.
- Offline/read-cache degraded behavior: passed. With the local API process
  stopped, the app restored its cached identity and retained cached dashboard,
  flashcard, and exam data after refresh failure. Library screens displayed
  `Đang hiển thị dữ liệu đã lưu; có thể đã cũ.` instead of clearing the list.
- Reconnect: passed. After restarting the local API and reopening the app,
  the exam library refreshed successfully and the stale notice disappeared.

## Regression fixed during verification

The flashcard library previously discarded the Room projection when its
background request failed because the error path reused the pre-cache `null`
snapshot. The view model now retains the latest displayed data and marks it
stale; `FlashcardsViewModelTest` prevents the regression from returning.

## Cleanup and boundary

The temporary Android set, cards, exam, attempt, mistake, and related tags
were deleted through the local API and verified absent from the API search
results. This is an emulator-backed local smoke run; it does not claim
production HTTPS, release signing, or physical-device validation.

## Owner production confirmation

The owner confirmed on 2026-08-27 that the production Android build connected
to the deployed API and that the production install/signing check completed.
The repository build metadata for that release is `versionCode 1`,
`versionName 1.0.0`. The physical device, signed APK, and any store/device
logs remain owner-controlled and are intentionally not copied into the repo.
