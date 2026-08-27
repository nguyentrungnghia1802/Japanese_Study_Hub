package com.japaneselearning.mobile.data.repository

import com.japaneselearning.mobile.data.model.DictionaryExampleResult
import com.japaneselearning.mobile.data.model.DictionaryKanjiResult
import com.japaneselearning.mobile.data.model.DictionaryLookup
import com.japaneselearning.mobile.data.model.DictionaryLookupDirection
import com.japaneselearning.mobile.data.model.DictionaryRelatedWord
import com.japaneselearning.mobile.data.model.DictionarySourceAttribution
import com.japaneselearning.mobile.data.model.DictionarySuggestion
import com.japaneselearning.mobile.data.model.DictionarySuggestions
import com.japaneselearning.mobile.data.model.DictionaryWordResult
import com.japaneselearning.mobile.data.remote.DictionaryExampleResultDto
import com.japaneselearning.mobile.data.remote.DictionaryKanjiResultDto
import com.japaneselearning.mobile.data.remote.DictionaryLookupDirectionDto
import com.japaneselearning.mobile.data.remote.DictionaryLookupResponseDto
import com.japaneselearning.mobile.data.remote.DictionaryRelatedWordDto
import com.japaneselearning.mobile.data.remote.DictionarySourceAttributionDto
import com.japaneselearning.mobile.data.remote.DictionarySuggestionResponseDto
import com.japaneselearning.mobile.data.remote.DictionaryWordResultDto

private const val MAX_RESULTS = 20
private const val MAX_MEANINGS = 8
private const val MAX_EXAMPLES = 5
private const val MAX_RELATED_WORDS = 10
private const val MAX_SOURCES = 6
private const val MAX_SUGGESTIONS = 10

fun DictionaryLookupResponseDto.toDomain(): DictionaryLookup = DictionaryLookup(
    query = query,
    direction = direction.toDomain(),
    results = results.take(MAX_RESULTS).map(DictionaryWordResultDto::toDomain),
    kanji = kanji?.toDomain(),
    examples = examples.take(MAX_EXAMPLES).map(DictionaryExampleResultDto::toDomain),
    sources = sources.take(MAX_SOURCES).map(DictionarySourceAttributionDto::toDomain),
)

fun DictionarySuggestionResponseDto.toDomain(): DictionarySuggestions = DictionarySuggestions(
    query = query,
    direction = direction.toDomain(),
    suggestions = suggestions.take(MAX_SUGGESTIONS).map { DictionarySuggestion(it.text) },
    source = source.toDomain(),
)

private fun DictionaryLookupDirectionDto.toDomain(): DictionaryLookupDirection = when (this) {
    DictionaryLookupDirectionDto.AUTO -> DictionaryLookupDirection.AUTO
    DictionaryLookupDirectionDto.JA_TO_VI -> DictionaryLookupDirection.JA_TO_VI
    DictionaryLookupDirectionDto.VI_TO_JA -> DictionaryLookupDirection.VI_TO_JA
}

private fun DictionaryWordResultDto.toDomain() = DictionaryWordResult(
    writtenForm = writtenForm,
    reading = reading,
    meanings = meanings.take(MAX_MEANINGS),
    partOfSpeech = partOfSpeech.take(5),
    common = common,
    frequencyRank = frequencyRank,
    source = source.toDomain(),
)

private fun DictionaryKanjiResultDto.toDomain() = DictionaryKanjiResult(
    character = character,
    onYomi = onYomi,
    kunYomi = kunYomi,
    vietnameseMeanings = vietnameseMeanings.take(MAX_MEANINGS),
    strokeCount = strokeCount,
    jlpt = jlpt,
    grade = grade,
    frequencyRank = frequencyRank,
    relatedWords = relatedWords.take(MAX_RELATED_WORDS).map(DictionaryRelatedWordDto::toDomain),
    source = source.toDomain(),
)

private fun DictionaryRelatedWordDto.toDomain() = DictionaryRelatedWord(
    writtenForm = writtenForm,
    reading = reading,
    meaning = meaning,
)

private fun DictionaryExampleResultDto.toDomain() = DictionaryExampleResult(
    japaneseSentence = japaneseSentence,
    vietnameseTranslation = vietnameseTranslation,
    source = source.toDomain(),
)

private fun DictionarySourceAttributionDto.toDomain() = DictionarySourceAttribution(
    provider = provider,
    name = name,
    url = url,
    license = license,
    attribution = attribution,
)
