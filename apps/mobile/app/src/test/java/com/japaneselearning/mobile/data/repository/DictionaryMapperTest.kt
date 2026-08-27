package com.japaneselearning.mobile.data.repository

import com.japaneselearning.mobile.data.model.DictionaryLookupDirection
import com.japaneselearning.mobile.data.remote.DictionaryExampleResultDto
import com.japaneselearning.mobile.data.remote.DictionaryKanjiResultDto
import com.japaneselearning.mobile.data.remote.DictionaryLookupDirectionDto
import com.japaneselearning.mobile.data.remote.DictionaryLookupResponseDto
import com.japaneselearning.mobile.data.remote.DictionaryRelatedWordDto
import com.japaneselearning.mobile.data.remote.DictionarySourceAttributionDto
import com.japaneselearning.mobile.data.remote.DictionaryWordResultDto
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DictionaryMapperTest {
    private val source = DictionarySourceAttributionDto(
        provider = "MINHQND",
        name = "Dictionary",
        url = "https://dict.minhqnd.com/",
        license = "CC BY-SA 4.0",
        attribution = "@minhqnd",
    )

    @Test
    fun `maps Japanese Unicode and Vietnamese diacritics without relabeling glosses`() {
        val mapped = DictionaryLookupResponseDto(
            query = "  日本語  ",
            direction = DictionaryLookupDirectionDto.JA_TO_VI,
            results = listOf(
                DictionaryWordResultDto(
                    writtenForm = "日本語",
                    reading = "にほんご",
                    meanings = listOf("Tiếng Nhật"),
                    partOfSpeech = listOf("danh từ"),
                    common = true,
                    frequencyRank = 12,
                    source = source,
                ),
            ),
            kanji = DictionaryKanjiResultDto(
                character = "日",
                onYomi = listOf("ニチ", "ジツ"),
                kunYomi = listOf("ひ", "か"),
                vietnameseMeanings = listOf("ngày", "mặt trời"),
                strokeCount = 4,
                jlpt = 5,
                grade = 1,
                frequencyRank = 1,
                relatedWords = listOf(DictionaryRelatedWordDto("日本", "にほん", "Nhật Bản")),
                source = source,
            ),
            examples = listOf(DictionaryExampleResultDto("日本語を話します。", "Tôi nói tiếng Nhật.", source)),
            sources = listOf(source),
        ).toDomain()

        assertEquals(DictionaryLookupDirection.JA_TO_VI, mapped.direction)
        assertEquals("日本語", mapped.results.single().writtenForm)
        assertEquals("にほんご", mapped.results.single().reading)
        assertEquals("Tiếng Nhật", mapped.results.single().meanings.single())
        assertEquals("Tôi nói tiếng Nhật.", mapped.examples.single().vietnameseTranslation)
        assertEquals("日", mapped.kanji?.character)
        assertEquals(listOf("ニチ", "ジツ"), mapped.kanji?.onYomi)
    }

    @Test
    fun `defensively bounds collections from a malformed oversized response`() {
        val oversized = DictionaryLookupResponseDto(
            query = "猫",
            direction = DictionaryLookupDirectionDto.AUTO,
            results = List(25) { index ->
                DictionaryWordResultDto("猫$index", null, List(12) { "意味" }, emptyList(), null, null, source)
            },
            kanji = DictionaryKanjiResultDto(
                character = "猫",
                relatedWords = List(15) { DictionaryRelatedWordDto("猫", null, null) },
                source = source,
            ),
            examples = List(8) { DictionaryExampleResultDto("猫です。", "Đây là mèo.", source) },
            sources = List(9) { source },
        ).toDomain()

        assertEquals(20, oversized.results.size)
        assertEquals(8, oversized.results.first().meanings.size)
        assertEquals(10, oversized.kanji?.relatedWords?.size)
        assertEquals(5, oversized.examples.size)
        assertEquals(6, oversized.sources.size)
        assertTrue(oversized.results.all { it.source.provider == "MINHQND" })
    }
}
