# Learning tags

TASK-242 adds a small shared tag vocabulary for the two personal learning
domains. Tags are deliberately flat: there is no parent/child relationship,
path syntax, or hierarchy to maintain.

## Normalization and bounds

- Names are normalized with Unicode NFKC, trimmed, and internal whitespace is
  collapsed to one space.
- The slug is the normalized name lower-cased with JavaScript's deterministic
  `toLowerCase()` behavior. Slugs are unique across flashcard sets and exams.
- A tag name is limited to 32 Unicode code points.
- One set or exam can have at most 20 tags. Assignment replaces the complete
  assignment atomically, so removing every tag is represented by `tags: []`.
- The shared tag table is limited to 2,000 rows. List responses are limited to
  100 tags by request and the server clamps larger limits.

Duplicate names in one assignment are deduplicated by normalized slug. A tag
can be reused across both domains, which makes cross-domain organization useful
where folders are exam-only and title/description search is not a stable
classification.

## API

All routes require the existing authenticated session:

- `GET /tags?limit=100` lists normalized tags.
- `POST /tags` creates or returns a normalized tag with `{ "name": "..." }`.
- `PATCH /tags/:slug` renames a tag and keeps assignments attached.
- `DELETE /tags/:slug` deletes the tag and its assignments through cascading
  foreign keys.
- `PUT /flashcard-sets/:id/tags` replaces a set's tags with
  `{ "tags": ["name", "..."] }`.
- `PUT /exams/:id/tags` replaces an exam's tags with the same body.
- `GET /flashcard-sets?tag=slug` and `GET /exams?tag=slug` filter active
  resources by one normalized slug.

Deleted sets/exams cannot receive new assignments and are excluded from tag
filtered lists. Tag assignment is separate from Markdown import/export so the
canonical V1 content format remains unchanged; imported resources start with
no tags and can be organized afterward.

## Clients

Web displays tags on collection cards, offers a bounded tag filter, and exposes
an editor on each set/exam detail page. Android displays tags on library/detail
views and offers the same tag filter where the device layout permits it. Both
clients use the API as the source of truth and keep no independent tag store.
