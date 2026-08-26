# Phase 2 Navigation Audit

Status: complete for TASK-215, verified 2026-08-26

The Web route tree was audited for `window.location`, `location.reload`, and
ordinary anchor navigation. Internal destinations use Next `Link` or
`router.push`/`router.replace`; the remaining DOM anchor created by the library
pages is intentionally limited to a Markdown download and does not navigate the
application document.

Route loading boundaries now exist at the app root and for the flashcard, exam,
and search segments, including dynamic entity segments. They keep the shared
layout and navbar mounted while a cold route request is pending.

Flashcard search and exam folder/search filters are reflected in the route query
string with `router.replace(..., { scroll: false })`. This keeps the current
library context when opening a detail page and returning through browser history,
without introducing a per-query persistence key. Next links retain the normal
history and scroll behavior for detail/study/editor transitions.

The existing auth guard and login/logout redirects were left on the Next router
path and remain covered by the Web login test. No mutation handler calls a full
document reload.
