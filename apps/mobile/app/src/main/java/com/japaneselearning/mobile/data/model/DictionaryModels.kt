package com.japaneselearning.mobile.data.model

enum class DictionaryLookupDirection {
    AUTO,
    JA_TO_VI,
    VI_TO_JA,
}

data class DictionarySourceAttribution(
    val provider: String,
    val name: String,
    val url: String,
    val license: String?,
    val attribution: String,
)

data class DictionaryWordResult(
    val writtenForm: String,
    val reading: String?,
    val meanings: List<String>,
    val partOfSpeech: List<String>,
    val common: Boolean?,
    val frequencyRank: Int?,
    val source: DictionarySourceAttribution,
)

data class DictionaryRelatedWord(
    val writtenForm: String,
    val reading: String?,
    val meaning: String?,
)

data class DictionaryKanjiResult(
    val character: String,
    val onYomi: List<String>,
    val kunYomi: List<String>,
    val vietnameseMeanings: List<String>,
    val strokeCount: Int?,
    val jlpt: Int?,
    val grade: Int?,
    val frequencyRank: Int?,
    val relatedWords: List<DictionaryRelatedWord>,
    val source: DictionarySourceAttribution,
)

data class DictionaryExampleResult(
    val japaneseSentence: String,
    val vietnameseTranslation: String,
    val source: DictionarySourceAttribution,
)

data class DictionaryLookup(
    val query: String,
    val direction: DictionaryLookupDirection,
    val results: List<DictionaryWordResult>,
    val kanji: DictionaryKanjiResult?,
    val examples: List<DictionaryExampleResult>,
    val sources: List<DictionarySourceAttribution>,
)

data class DictionarySuggestion(
    val text: String,
)

data class DictionarySuggestions(
    val query: String,
    val direction: DictionaryLookupDirection,
    val suggestions: List<DictionarySuggestion>,
    val source: DictionarySourceAttribution,
)

data class DictionaryHistoryItem(
    val id: String,
    val query: String,
    val direction: DictionaryLookupDirection,
    val primaryLabel: String?,
    val createdAt: String,
)

data class DictionaryHistory(
    val items: List<DictionaryHistoryItem>,
    val total: Int,
)

data class DictionaryFavorite(
    val id: String,
    val term: String,
    val reading: String?,
    val meaningSummary: String,
    val direction: DictionaryLookupDirection,
    val source: DictionarySourceAttribution,
    val createdAt: String,
    val updatedAt: String,
)

data class DictionaryFavoriteDraft(
    val term: String,
    val reading: String?,
    val meaningSummary: String,
    val direction: DictionaryLookupDirection,
    val source: DictionarySourceAttribution,
)

data class DictionaryFavorites(
    val items: List<DictionaryFavorite>,
    val total: Int,
    val limit: Int,
    val offset: Int,
)
