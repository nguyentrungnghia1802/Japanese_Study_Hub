package com.japaneselearning.mobile.data.remote

import kotlinx.serialization.Serializable

@Serializable
enum class DictionaryLookupDirectionDto {
    AUTO,
    JA_TO_VI,
    VI_TO_JA,
}

@Serializable
data class DictionaryLookupRequestDto(
    val query: String,
    val direction: DictionaryLookupDirectionDto = DictionaryLookupDirectionDto.AUTO,
    val limit: Int = 20,
    val includeExamples: Boolean = false,
)

@Serializable
data class DictionarySourceAttributionDto(
    val provider: String,
    val name: String,
    val url: String,
    val license: String? = null,
    val attribution: String,
)

@Serializable
data class DictionaryWordResultDto(
    val writtenForm: String,
    val reading: String? = null,
    val meanings: List<String> = emptyList(),
    val partOfSpeech: List<String> = emptyList(),
    val common: Boolean? = null,
    val frequencyRank: Int? = null,
    val source: DictionarySourceAttributionDto,
)

@Serializable
data class DictionaryRelatedWordDto(
    val writtenForm: String,
    val reading: String? = null,
    val meaning: String? = null,
)

@Serializable
data class DictionaryKanjiResultDto(
    val character: String,
    val onYomi: List<String> = emptyList(),
    val kunYomi: List<String> = emptyList(),
    val vietnameseMeanings: List<String> = emptyList(),
    val strokeCount: Int? = null,
    val jlpt: Int? = null,
    val grade: Int? = null,
    val frequencyRank: Int? = null,
    val relatedWords: List<DictionaryRelatedWordDto> = emptyList(),
    val source: DictionarySourceAttributionDto,
)

@Serializable
data class DictionaryExampleResultDto(
    val japaneseSentence: String,
    val vietnameseTranslation: String,
    val source: DictionarySourceAttributionDto,
)

@Serializable
data class DictionaryLookupResponseDto(
    val query: String,
    val direction: DictionaryLookupDirectionDto,
    val results: List<DictionaryWordResultDto> = emptyList(),
    val kanji: DictionaryKanjiResultDto? = null,
    val examples: List<DictionaryExampleResultDto> = emptyList(),
    val sources: List<DictionarySourceAttributionDto> = emptyList(),
)

@Serializable
data class DictionarySuggestionDto(val text: String)

@Serializable
data class DictionarySuggestionResponseDto(
    val query: String,
    val direction: DictionaryLookupDirectionDto,
    val suggestions: List<DictionarySuggestionDto> = emptyList(),
    val source: DictionarySourceAttributionDto,
)
