# Learning favorites

TASK-241 adds a single-user favorite flag to flashcard sets and exams. It is a
simple organization aid; it does not introduce sharing, permissions, or a
social graph.

## API behavior

- `PUT /flashcard-sets/:id/favorite` with `{ "favorite": true|false }`
- `PUT /exams/:id/favorite` with `{ "favorite": true|false }`
- `GET /flashcard-sets?favorite=true|false`
- `GET /exams?favorite=true|false`

The mutation is an explicit set operation, so retries with the same value are
idempotent. It first resolves the active entity and therefore returns not-found
for soft-deleted content. List queries always include the existing
`deletedAt IS NULL` condition; favorites never resurrect deleted rows.

The database stores `is_favorite BOOLEAN NOT NULL DEFAULT false` directly on
each content aggregate. This keeps the feature bounded and avoids a separate
per-user relation while the project still has the V1 logical user.

## Clients

Web list cards and detail pages expose a star action. Both libraries have an
optional Favorites filter and invalidate only the affected domain, dashboard,
search, and detail query keys after a mutation.

Android list cards expose the same star action and a `Yêu thích` filter. The
repository sends the filter as a bounded API query and maps the state into the
domain model.
