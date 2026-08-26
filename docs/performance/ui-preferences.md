# Phase 2 UI preference policy

Status: implemented for TASK-222, 2026-08-26

The Web client persists only three tiny, non-sensitive UI choices in
`localStorage`:

- `jsh_ui_preferences_v1.sort`: `createdAt_desc`, `updatedAt_desc`, or
  `title_asc`.
- `jsh_ui_preferences_v1.exam_folder`: an exam-folder UUID or the empty value.
- `jsh_ui_preferences_v1.library_tab`: one of `ALL`, `SETS`, `CARDS`, `EXAMS`,
  or `FOLDERS`.

Search text is intentionally not persisted. A search can contain Japanese
learning content or a private note, so it remains in the route/component state.
API response bodies, tokens, passwords, answers, and other learning payloads
are never written as preferences.

`apps/web/src/lib/ui-preferences.ts` owns the versioned allow-list. Reads remove
invalid legacy values, writes reject values outside the allow-list, every value
is capped at 256 UTF-8 bytes, and the fixed key set prevents per-query storage
growth. The helper also tolerates unavailable browser storage, so preference
failure cannot block the learning flows.

The preference module has unit coverage for the allow-list, invalid-value reset,
and byte-bounded storage behavior. A future schema change must use a new key
version and a deliberate migration rather than accepting arbitrary old data.
