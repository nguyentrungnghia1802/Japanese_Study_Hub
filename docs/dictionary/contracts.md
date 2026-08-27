# Lookup contracts

The API owns Lookup normalization. Web and Android consume the shared
TypeScript contract in `packages/contracts/src/dictionary.dto.ts` and the
equivalent Kotlin DTO/domain mapping in
`apps/mobile/app/src/main/java/com/japaneselearning/mobile/data/remote/DictionaryModels.kt`
and `.../data/model/DictionaryModels.kt`.

## Lookup response

`DictionaryLookupResponseDto` contains only normalized project data:

- the normalized query and resolved `AUTO`/`JA_TO_VI`/`VI_TO_JA` direction;
- bounded word results with written form, optional reading, Vietnamese
  meanings, optional part-of-speech/frequency hints, and source attribution;
- optional single-kanji enrichment with readings, stroke count, trustworthy
  JLPT/grade/frequency fields, Vietnamese meanings, and bounded related words;
- optional, bounded Japanese/Vietnamese examples; and
- the compact set of source attributions needed for UI display.

Provider response fields, raw wikitext, provider IDs, owner data, and
authorization material are not part of this contract. The API may return the
standard error envelope with one of the stable `DictionaryErrorCode` values:
`INVALID_QUERY`, `NO_RESULT`, `TIMEOUT`, `PROVIDER_UNAVAILABLE`,
`RATE_LIMITED`, or `INVALID_PROVIDER_RESPONSE`.

## Bounds

The shared limits are the source of truth for client-side display bounds:

- 20 word results;
- 10 suggestions;
- 8 meanings per result;
- 5 examples;
- 10 related words per kanji; and
- 6 source attributions.

The API remains authoritative and enforces these limits again. Android maps
the response into domain models and defensively applies the same collection
bounds; it does not persist dictionary responses in the Phase 2 read cache.

## Direction and no-result semantics

`AUTO` is resolved by the API. Japanese kana/kanji input defaults to
`JA_TO_VI`; Vietnamese/Latin input defaults to `VI_TO_JA` when the input is
valid for that direction. An explicit direction always wins. Unicode NFKC
normalization removes only harmless formatting variation and preserves
Japanese characters and Vietnamese diacritics.

No-result is a normal typed domain outcome. It is never filled by an inferred
translation, an English-only kanji gloss, or a provider payload copied into a
client.
