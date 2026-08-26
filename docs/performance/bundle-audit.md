# Web bundle audit

Status: implemented for TASK-234, 2026-08-26

## Baseline and current build

The Phase 2 browser baseline recorded the V1 route sizes before the query/cache
work. A production Next build after the cache/navigation changes reported these
current first-load values after the 2026-08-27 security dependency updates:

| Route                    | Route JS | First load JS |
| ------------------------ | -------: | ------------: |
| `/`                      |  7.28 kB |        121 kB |
| `/flashcards`            |  8.67 kB |        123 kB |
| `/flashcards/[id]`       |  4.77 kB |        122 kB |
| `/flashcards/[id]/study` |  5.27 kB |        119 kB |
| `/exams`                 |  10.4 kB |        124 kB |
| `/exams/[id]`            |  3.22 kB |        121 kB |
| `/exams/[id]/edit`       |  6.11 kB |        112 kB |
| `/exams/[id]/take`       |  8.74 kB |        126 kB |
| `/search`                |  5.84 kB |        120 kB |

The current shared first-load total is 102 kB. The increase from the original
V1 figures is attributable to the required TanStack Query/cache and loading-state
layer plus the patched Next runtime; it is documented rather than hidden.

## Splitting decisions

The Markdown import modal and exam import modal are used only after an explicit
Import action. Dashboard, Flashcards, and Exams load them with `next/dynamic`
and `ssr: false`, so parser/preview UI is not part of the initial route module.
The exam take route remains explicitly non-prefetchable and does not import the
management import helpers.

Lucide icons remain direct named imports, which allows the existing bundler to
tree-shake unused icons. No new font or image dependency was introduced; the
UI continues to use the existing system font stack and text-based Japanese
content, so a glyph-subsetting change is not justified by the available evidence.

The production `next build` is the bundle gate. Re-run it after changes to import
or editor components and compare the route table above; a regression requires a
new measured explanation.
