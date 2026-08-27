# Phase 3 dictionary provider evaluation — 2026-08-27

This record is the evidence for TASK-402. It selects replaceable, documented
providers for the backend adapter boundary. Web and Android must not call any
of these services directly, and raw provider payloads must never cross the
API boundary or be persisted in lookup history/favorites.

## Decision

| Capability                                              | Selected provider                                      | Backend usage                                                                                                                                                  | Fallback / no-result policy                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Japanese ↔ Vietnamese dictionary lookup and suggestions | [dict.minhqnd.com](https://dict.minhqnd.com/)          | Use the documented `/api/v1/lookup` and `/api/v1/suggest` endpoints. Normalize only entries that contain the requested language direction and Vietnamese text. | For Vietnamese → Japanese, query the documented [Vietnamese Wiktionary MediaWiki API](https://vi.wiktionary.org/w/api.php) only when the primary response has no usable Japanese translation. If neither provider has a safe result, return the typed `NO_RESULT` domain outcome; never infer or machine-translate a result. |
| Single-kanji metadata                                   | [kanjiapi.dev](https://kanjiapi.dev/)                  | Use `/v1/kanji/{character}` for one validated Unicode kanji. Accept readings, stroke count, JLPT/grade/frequency only from fields supplied by the provider.    | Kanji enrichment is optional. A provider failure leaves the primary dictionary result usable. English-only meanings are not shown as Vietnamese.                                                                                                                                                                             |
| Japanese/Vietnamese examples                            | [Tatoeba API v1](https://api.tatoeba.org/openapi.json) | Use `GET /v1/sentences` with `lang=jpn`, `trans:lang=vie`, and `showtrans:lang=vie`; normalize at most five sentence/translation pairs.                        | Examples are best-effort enrichment. A timeout, rate limit, or empty result never fails the primary lookup.                                                                                                                                                                                                                  |

The Wiktionary fallback is deliberately narrow: the adapter will parse only
Vietnamese entries and explicit Japanese translation templates such as
`t+|ja|...` from the returned wikitext. It is not a general scraper or a
translation engine. The parser will ignore ambiguous Han-Vietnamese sections,
English-only glosses, and unrecognized templates.

## Real smoke tests

The requests below were run from the repository host with a 20-second client
timeout and a descriptive User-Agent. Responses were inspected only for the
minimum fields needed to choose the providers; no provider payload was stored
in application data.

| Check                                 | Request                                                                                                                  | Result                                                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Japanese kanji word → Vietnamese      | `GET https://dict.minhqnd.com/api/v1/lookup?word=日本&lang=ja&def_lang=vi` (and the documented no-language lookup)       | HTTP 200 for `日本`; Vietnamese meaning contained “Nhật Bản”.                                                                                                                                           |
| Kana word → Vietnamese                | `GET https://dict.minhqnd.com/api/v1/lookup?word=ありがとう&lang=ja&def_lang=vi` (and the documented no-language lookup) | HTTP 200; Vietnamese meaning contained “Cám ơn”. Coverage is sparse for kana-only queries, so no-result is valid.                                                                                       |
| Common Japanese compound → Vietnamese | `GET https://dict.minhqnd.com/api/v1/lookup?word=日本語&lang=ja&def_lang=vi` (and the documented no-language lookup)     | HTTP 200; Vietnamese meaning contained “Tiếng Nhật”.                                                                                                                                                    |
| Vietnamese → Japanese                 | `GET https://dict.minhqnd.com/api/v1/lookup?word=Nhật%20Bản&lang=vi&def_lang=vi` and `...word=sách...`                   | HTTP 200; results included Japanese translations `日本`/`にっぽん`/`にほん` for “Nhật Bản” and `本` for “sách”. A query such as “học sinh” can have no Japanese translation and must not be fabricated. |
| Suggestions                           | `GET https://dict.minhqnd.com/api/v1/suggest?q=学生` and `...q=học...`                                                   | HTTP 200 with bounded suggestion arrays.                                                                                                                                                                |
| Single-kanji metadata                 | `GET https://kanjiapi.dev/v1/kanji/猫`                                                                                   | HTTP 200; response exposed `on_readings`, `kun_readings`, `stroke_count`, `grade`, `jlpt`, `freq_mainichi_shinbun`, and `meanings`. English `meanings` are metadata only, not Vietnamese definitions.   |
| Japanese/Vietnamese examples          | `GET https://api.tatoeba.org/v1/sentences?lang=jpn&q=猫&trans:lang=vie&showtrans:lang=vie&sort=relevance&limit=3`        | HTTP 200; returned Japanese sentences and Vietnamese translations with per-sentence license/owner metadata. The same smoke test for `日本語` returned 45 available pairs.                               |
| Licensed VI → JA fallback             | `GET https://vi.wiktionary.org/w/api.php?action=parse&page=sách&prop=wikitext&format=json&formatversion=2`               | HTTP 200; the entry contains an explicit Japanese `t+                                                                                                                                                   | ja  | 本` translation template. The production parser will accept only that explicit template form. |

The `dict.minhqnd` service also returned HTTP 404 for deliberately missing or
unsupported language-direction queries. That is mapped to `NO_RESULT`, not a
provider-internal error. A real rate-limit response was not induced: sending a
flood of requests to a public service would be abusive and would not be a
repeatable release check. The adapter contract therefore treats HTTP 429 as a
typed `RATE_LIMITED` result, does not retry it, and covers that behavior with
deterministic provider-boundary tests in TASK-410. Strict timeout behavior is
also enforced and tested at that boundary rather than by holding a public
service connection open.

## Licensing and attribution

- `dict.minhqnd.com` documents the API/data attribution as CC BY-SA 4.0 and
  asks consumers to attribute `@minhqnd` / `dict.minhqnd.com`. The normalized
  result will retain a source label and attribution URL.
- `kanjiapi.dev` documents the API and its KANJIDIC/EDRDG-derived data. The
  normalized kanji result will retain the provider attribution and link; its
  English glosses will not be relabeled as Vietnamese.
- Tatoeba v1 responses include sentence-level license and owner fields. The
  example contract will preserve source attribution and license information;
  the UI will render a compact attribution link. Tatoeba examples are not
  copied into history/favorites.
- Vietnamese Wiktionary content is used only through its documented MediaWiki
  API and must retain a Wiktionary attribution link/license notice. The
  fallback parser stores normalized Japanese terms only in the response; raw
  wikitext is never persisted.

## Adapter boundary requirements

All providers must be called through API-owned interfaces. Each adapter must:

1. enforce a strict timeout and bounded response body before parsing;
2. validate the small external JSON shape at the boundary;
3. retry at most one transient 5xx/network failure with a short backoff, never
   retrying 4xx/rate-limit responses;
4. normalize Unicode/whitespace without losing Japanese characters or
   Vietnamese diacritics;
5. return safe typed errors and structured source metadata; and
6. keep raw payloads out of logs, client DTOs, history, favorites, and caches
   except for the bounded in-memory normalized response cache defined by
   TASK-404.

This selection satisfies the required verified JA → VI, VI → JA, kanji, and
optional-example paths while leaving provider replacement localized to the API.
