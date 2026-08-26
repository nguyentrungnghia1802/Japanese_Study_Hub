# Phase 2 Route Prefetch Policy

Status: complete for TASK-216, verified 2026-08-26

The Web uses Next App Router prefetching through `PrefetchLink` for a small set
of likely next destinations. List item links opt out of automatic viewport
prefetch and request a route only after deliberate pointer hover or keyboard
focus. A module-scoped budget limits targeted route prefetches to 24 distinct
URLs per tab, and duplicate URLs are ignored.

Exam take routes are explicitly excluded because route prefetch must never start
or cache a live attempt payload. The prefetch layer only warms the route bundle;
the data query still runs when the destination is actually opened.
