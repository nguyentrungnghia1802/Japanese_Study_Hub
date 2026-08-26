# List rendering and virtualization decision

Status: completed for TASK-235, 2026-08-26

The Web library pages currently request and render bounded pages: 20 flashcard
sets and 50 exams. A local benchmark inserted temporary, clearly prefixed rows,
loaded the actual production Web build, and measured 20 matching flashcard cards
with a 1,435-character body plus 50 matching exam cards with a 4,621-character
body. Both lists rendered completely and remained responsive in the in-app
browser; the temporary rows were deleted after measurement.

Virtualization is therefore not justified yet. Adding a windowing library would
complicate keyboard navigation, focus, search, and the existing card actions for
lists that are already bounded below the measured threshold. The API remains
paginated and caps collection requests at 100, so a future UI that exposes larger
pages must repeat the benchmark before changing this decision.

The no-virtualization decision preserves ordinary DOM semantics and accessibility
for the current list sizes. If measured production data shows a sustained render
cost or a page size above 100 is approved, implement virtualization with an
accessible listbox/card strategy and regression tests for keyboard focus,
filtering, sorting, and action buttons.
