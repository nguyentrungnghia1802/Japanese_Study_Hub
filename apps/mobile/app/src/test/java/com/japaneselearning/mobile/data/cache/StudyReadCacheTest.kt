package com.japaneselearning.mobile.data.cache

import com.japaneselearning.mobile.data.model.Exam
import com.japaneselearning.mobile.data.model.FlashcardSet
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class StudyReadCacheTest {
    @Test
    fun `summary cache is bounded and never carries content trees`() = runTest {
        val dao = FakeStudyReadCacheDao()
        val cache = StudyReadCache(dao)

        cache.saveFlashcardSets((1..120).map { id ->
            FlashcardSet("set-$id", "Set $id", "desc", id, false, cards = emptyList())
        })

        val cached = cache.readFlashcardSets()
        assertEquals(STUDY_CACHE_MAX_ROWS, cached?.data?.size)
        assertTrue(cached!!.data.all { it.cards.isEmpty() })
    }

    @Test
    fun `expired rows are removed before they can be served`() = runTest {
        val dao = FakeStudyReadCacheDao()
        val now = System.currentTimeMillis()
        dao.flashcardSets += CachedFlashcardSetEntity(
            id = "expired",
            title = "Expired",
            description = null,
            cardCount = 1,
            isFavorite = false,
            cachedAt = now - STUDY_CACHE_MAX_AGE_MILLIS - 1,
        )
        dao.flashcardSets += CachedFlashcardSetEntity(
            id = "fresh",
            title = "Fresh",
            description = null,
            cardCount = 1,
            isFavorite = false,
            cachedAt = now,
        )

        val cached = StudyReadCache(dao).readFlashcardSets()

        assertEquals(listOf("fresh"), cached?.data?.map { it.id })
        assertTrue(dao.flashcardSets.none { it.id == "expired" })
    }

    @Test
    fun `dashboard cache stores recent metadata without answer-bearing question data`() = runTest {
        val dao = FakeStudyReadCacheDao()
        StudyReadCache(dao).saveDashboard(
            com.japaneselearning.mobile.data.model.DashboardSummary(
                recentFlashcardSets = listOf(FlashcardSet("set", "Set", null, 2, false)),
                recentExams = listOf(Exam("exam", null, "Exam", null, 600, 2, 80.0, false)),
                totalFlashcardSets = 1,
                totalCards = 2,
                totalExams = 1,
                recentBestScores = emptyList(),
                recentLearning = emptyList(),
            ),
        )

        val cached = StudyReadCache(dao).readDashboard()

        assertEquals(1, cached?.data?.totalExams)
        assertTrue(cached!!.data.recentExams.single().questions.isEmpty())
    }

    @Test
    fun `created card updates only the cached set count and stays metadata-only`() = runTest {
        val dao = FakeStudyReadCacheDao()
        val cache = StudyReadCache(dao)
        cache.saveFlashcardSets(listOf(FlashcardSet("set", "Set", null, 2, false)))

        cache.markFlashcardCreated("set")

        val cached = cache.readFlashcardSets()!!.data.single()
        assertEquals(3, cached.cardCount)
        assertTrue(cached.cards.isEmpty())
    }
}

private class FakeStudyReadCacheDao : StudyReadCacheDao {
    val flashcardSets = mutableListOf<CachedFlashcardSetEntity>()
    val exams = mutableListOf<CachedExamEntity>()
    val recentLearning = mutableListOf<CachedRecentLearningEntity>()
    var dashboard: CachedDashboardEntity? = null

    override suspend fun readFlashcardSets() = flashcardSets.toList()
    override suspend fun readExams() = exams.toList()
    override suspend fun readRecentLearning() = recentLearning.toList()
    override suspend fun readDashboard() = dashboard
    override suspend fun insertFlashcardSets(items: List<CachedFlashcardSetEntity>) {
        items.forEach { item -> flashcardSets.removeAll { it.id == item.id }; flashcardSets += item }
    }
    override suspend fun insertExams(items: List<CachedExamEntity>) {
        items.forEach { item -> exams.removeAll { it.id == item.id }; exams += item }
    }
    override suspend fun insertRecentLearning(items: List<CachedRecentLearningEntity>) {
        items.forEach { item -> recentLearning.removeAll { it.entityKey == item.entityKey }; recentLearning += item }
    }
    override suspend fun insertDashboard(item: CachedDashboardEntity) { dashboard = item }
    override suspend fun deleteExpiredFlashcardSets(cutoff: Long) { flashcardSets.removeAll { it.cachedAt < cutoff } }
    override suspend fun deleteExpiredExams(cutoff: Long) { exams.removeAll { it.cachedAt < cutoff } }
    override suspend fun deleteExpiredRecentLearning(cutoff: Long) { recentLearning.removeAll { it.cachedAt < cutoff } }
    override suspend fun trimFlashcardSets() {
        while (flashcardSets.size > STUDY_CACHE_MAX_ROWS) flashcardSets.removeAt(0)
    }
    override suspend fun trimExams() {
        while (exams.size > STUDY_CACHE_MAX_ROWS) exams.removeAt(0)
    }
    override suspend fun trimRecentLearning() {
        while (recentLearning.size > 20) recentLearning.removeAt(0)
    }
}
