package com.japaneselearning.mobile.data.cache

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import com.japaneselearning.mobile.data.model.DashboardSummary
import com.japaneselearning.mobile.data.model.Exam
import com.japaneselearning.mobile.data.model.FlashcardSet
import com.japaneselearning.mobile.data.model.RecentLearning
import javax.inject.Inject
import javax.inject.Singleton

const val STUDY_CACHE_MAX_ROWS = 100
const val STUDY_CACHE_MAX_AGE_MILLIS = 7L * 24L * 60L * 60L * 1000L

@Entity(tableName = "cached_flashcard_sets")
data class CachedFlashcardSetEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String?,
    val cardCount: Int,
    val isFavorite: Boolean,
    val cachedAt: Long,
)

@Entity(tableName = "cached_exams")
data class CachedExamEntity(
    @PrimaryKey val id: String,
    val folderId: String?,
    val title: String,
    val description: String?,
    val timeLimitSeconds: Int?,
    val questionCount: Int,
    val bestScore: Double?,
    val isFavorite: Boolean,
    val cachedAt: Long,
)

@Entity(tableName = "cached_recent_learning")
data class CachedRecentLearningEntity(
    @PrimaryKey val entityKey: String,
    val kind: String,
    val entityId: String,
    val title: String,
    val subtitle: String?,
    val cardCount: Int?,
    val questionCount: Int?,
    val cachedAt: Long,
)

@Entity(tableName = "cached_dashboard")
data class CachedDashboardEntity(
    @PrimaryKey val id: Int = 1,
    val totalFlashcardSets: Int,
    val totalCards: Int,
    val totalExams: Int,
    val cachedAt: Long,
)

@Dao
interface StudyReadCacheDao {
    @Query("SELECT * FROM cached_flashcard_sets ORDER BY title COLLATE NOCASE ASC LIMIT 100")
    suspend fun readFlashcardSets(): List<CachedFlashcardSetEntity>

    @Query("SELECT * FROM cached_exams ORDER BY title COLLATE NOCASE ASC LIMIT 100")
    suspend fun readExams(): List<CachedExamEntity>

    @Query("SELECT * FROM cached_recent_learning ORDER BY cachedAt DESC LIMIT 20")
    suspend fun readRecentLearning(): List<CachedRecentLearningEntity>

    @Query("SELECT * FROM cached_dashboard WHERE id = 1")
    suspend fun readDashboard(): CachedDashboardEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFlashcardSets(items: List<CachedFlashcardSetEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExams(items: List<CachedExamEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecentLearning(items: List<CachedRecentLearningEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDashboard(item: CachedDashboardEntity)

    @Query("DELETE FROM cached_flashcard_sets WHERE cachedAt < :cutoff")
    suspend fun deleteExpiredFlashcardSets(cutoff: Long)

    @Query("DELETE FROM cached_exams WHERE cachedAt < :cutoff")
    suspend fun deleteExpiredExams(cutoff: Long)

    @Query("DELETE FROM cached_recent_learning WHERE cachedAt < :cutoff")
    suspend fun deleteExpiredRecentLearning(cutoff: Long)

    @Query("DELETE FROM cached_flashcard_sets WHERE id NOT IN (SELECT id FROM cached_flashcard_sets ORDER BY cachedAt DESC LIMIT 100)")
    suspend fun trimFlashcardSets()

    @Query("DELETE FROM cached_exams WHERE id NOT IN (SELECT id FROM cached_exams ORDER BY cachedAt DESC LIMIT 100)")
    suspend fun trimExams()

    @Query("DELETE FROM cached_recent_learning WHERE entityKey NOT IN (SELECT entityKey FROM cached_recent_learning ORDER BY cachedAt DESC LIMIT 20)")
    suspend fun trimRecentLearning()
}

@Database(
    entities = [
        CachedFlashcardSetEntity::class,
        CachedExamEntity::class,
        CachedRecentLearningEntity::class,
        CachedDashboardEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class StudyReadCacheDatabase : RoomDatabase() {
    abstract fun studyReadCacheDao(): StudyReadCacheDao
}

data class CachedRead<T>(val data: T, val cachedAt: Long)

@Singleton
class StudyReadCache @Inject constructor(
    private val dao: StudyReadCacheDao,
) {
    suspend fun readFlashcardSets(): CachedRead<List<FlashcardSet>>? {
        cleanup()
        val rows = dao.readFlashcardSets()
        if (rows.isEmpty()) return null
        return CachedRead(rows.map(::toFlashcardSet), rows.maxOf { it.cachedAt })
    }

    suspend fun readExams(): CachedRead<List<Exam>>? {
        cleanup()
        val rows = dao.readExams()
        if (rows.isEmpty()) return null
        return CachedRead(rows.map(::toExam), rows.maxOf { it.cachedAt })
    }

    suspend fun readDashboard(): CachedRead<DashboardSummary>? {
        cleanup()
        val dashboard = dao.readDashboard() ?: return null
        return CachedRead(
            DashboardSummary(
                recentFlashcardSets = dao.readFlashcardSets().map(::toFlashcardSet).take(5),
                recentExams = dao.readExams().map(::toExam).take(5),
                totalFlashcardSets = dashboard.totalFlashcardSets,
                totalCards = dashboard.totalCards,
                totalExams = dashboard.totalExams,
                recentBestScores = emptyList(),
                recentLearning = dao.readRecentLearning().map(::toRecentLearning),
            ),
            dashboard.cachedAt,
        )
    }

    suspend fun saveFlashcardSets(items: List<FlashcardSet>) {
        val now = System.currentTimeMillis()
        dao.insertFlashcardSets(items.take(STUDY_CACHE_MAX_ROWS).map { toEntity(it, now) })
        dao.trimFlashcardSets()
    }

    suspend fun markFlashcardCreated(setId: String) {
        val cached = readFlashcardSets()?.data ?: return
        if (cached.none { it.id == setId }) return
        saveFlashcardSets(
            cached.map { set ->
                if (set.id == setId) set.copy(cardCount = set.cardCount + 1) else set
            },
        )
    }

    suspend fun saveExams(items: List<Exam>) {
        val now = System.currentTimeMillis()
        dao.insertExams(items.take(STUDY_CACHE_MAX_ROWS).map { toEntity(it, now) })
        dao.trimExams()
    }

    suspend fun saveDashboard(summary: DashboardSummary) {
        val now = System.currentTimeMillis()
        dao.insertDashboard(
            CachedDashboardEntity(
                totalFlashcardSets = summary.totalFlashcardSets,
                totalCards = summary.totalCards,
                totalExams = summary.totalExams,
                cachedAt = now,
            ),
        )
        dao.insertFlashcardSets(summary.recentFlashcardSets.take(5).map { toEntity(it, now) })
        dao.insertExams(summary.recentExams.take(5).map { toEntity(it, now) })
        dao.insertRecentLearning(summary.recentLearning.take(20).map { toEntity(it, now) })
        dao.trimFlashcardSets()
        dao.trimExams()
        dao.trimRecentLearning()
    }

    private suspend fun cleanup() {
        val cutoff = System.currentTimeMillis() - STUDY_CACHE_MAX_AGE_MILLIS
        dao.deleteExpiredFlashcardSets(cutoff)
        dao.deleteExpiredExams(cutoff)
        dao.deleteExpiredRecentLearning(cutoff)
    }

    private fun toEntity(item: FlashcardSet, cachedAt: Long) = CachedFlashcardSetEntity(
        id = item.id,
        title = item.title,
        description = item.description,
        cardCount = item.cardCount,
        isFavorite = item.isFavorite,
        cachedAt = cachedAt,
    )

    private fun toEntity(item: Exam, cachedAt: Long) = CachedExamEntity(
        id = item.id,
        folderId = item.folderId,
        title = item.title,
        description = item.description,
        timeLimitSeconds = item.timeLimitSeconds,
        questionCount = item.questionCount,
        bestScore = item.bestScore,
        isFavorite = item.isFavorite,
        cachedAt = cachedAt,
    )

    private fun toEntity(item: RecentLearning, cachedAt: Long) = CachedRecentLearningEntity(
        entityKey = "${item.kind}:${item.entityId}",
        kind = item.kind,
        entityId = item.entityId,
        title = item.title,
        subtitle = item.subtitle,
        cardCount = item.cardCount,
        questionCount = item.questionCount,
        cachedAt = cachedAt,
    )

    private fun toFlashcardSet(row: CachedFlashcardSetEntity) = FlashcardSet(
        id = row.id,
        title = row.title,
        description = row.description,
        cardCount = row.cardCount,
        isFavorite = row.isFavorite,
    )

    private fun toExam(row: CachedExamEntity) = Exam(
        id = row.id,
        folderId = row.folderId,
        title = row.title,
        description = row.description,
        timeLimitSeconds = row.timeLimitSeconds,
        questionCount = row.questionCount,
        bestScore = row.bestScore,
        isFavorite = row.isFavorite,
    )

    private fun toRecentLearning(row: CachedRecentLearningEntity) = RecentLearning(
        kind = row.kind,
        entityId = row.entityId,
        title = row.title,
        subtitle = row.subtitle,
        cardCount = row.cardCount,
        questionCount = row.questionCount,
    )
}
