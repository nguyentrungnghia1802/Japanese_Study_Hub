# Web bundle audit

Status: implemented for TASK-234, 2026-08-26

## Baseline and current build

The Phase 2 browser baseline recorded the V1 route sizes before the query/cache
work. A production Next build after the cache/navigation changes reported these
current first-load values:

| Route                    | Route JS | First load JS |
| ------------------------ | -------: | ------------: |
| `/`                      |  3.50 kB |        118 kB |
| `/flashcards`            |  7.52 kB |        116 kB |
| `/flashcards/[id]`       |  6.02 kB |        112 kB |
| `/flashcards/[id]/study` |  4.72 kB |        111 kB |
| `/exams`                 |  6.50 kB |        118 kB |
| `/exams/[id]`            |  4.45 kB |        110 kB |
| `/exams/[id]/edit`       |  6.18 kB |        103 kB |
| `/exams/[id]/take`       |  8.24 kB |        117 kB |
| `/search`                |  4.44 kB |        102 kB |

The shared first-load baseline is 87.3 kB. The increase from the original V1
figures is attributable to the required TanStack Query/cache and loading-state
layer; it is documented rather than hidden.

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
