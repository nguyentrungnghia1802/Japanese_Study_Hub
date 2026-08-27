package com.japaneselearning.mobile.data.repository

import com.japaneselearning.mobile.core.network.ApiErrorMapper
import com.japaneselearning.mobile.core.storage.TokenStore
import com.japaneselearning.mobile.data.cache.StudyReadCache
import com.japaneselearning.mobile.data.model.DashboardSummary
import com.japaneselearning.mobile.data.model.DictionaryFavorite
import com.japaneselearning.mobile.data.model.DictionaryFavoriteDraft
import com.japaneselearning.mobile.data.model.DictionaryFavorites
import com.japaneselearning.mobile.data.model.DictionaryHistory
import com.japaneselearning.mobile.data.model.DictionaryLookup
import com.japaneselearning.mobile.data.model.DictionaryLookupDirection
import com.japaneselearning.mobile.data.model.DictionarySuggestions
import com.japaneselearning.mobile.data.model.Exam
import com.japaneselearning.mobile.data.model.ExamFolder
import com.japaneselearning.mobile.data.model.ExamResult
import com.japaneselearning.mobile.data.model.Flashcard
import com.japaneselearning.mobile.data.model.FlashcardReviewCard
import com.japaneselearning.mobile.data.model.FlashcardReviewQueue
import com.japaneselearning.mobile.data.model.FlashcardReviewRating
import com.japaneselearning.mobile.data.model.FlashcardReviewResult
import com.japaneselearning.mobile.data.model.FlashcardReviewSummary
import com.japaneselearning.mobile.data.model.FlashcardSet
import com.japaneselearning.mobile.data.model.LiveAttempt
import com.japaneselearning.mobile.data.model.LearningTag
import com.japaneselearning.mobile.data.model.SearchResults
import com.japaneselearning.mobile.data.model.User
import com.japaneselearning.mobile.data.model.WrongAnswerReviewItem
import com.japaneselearning.mobile.data.model.WrongAnswerReviewQueue
import com.japaneselearning.mobile.data.model.FrequentMistakeSummary
import com.japaneselearning.mobile.data.model.MistakeAttemptDetail
import com.japaneselearning.mobile.data.model.MistakeAttemptSummary
import com.japaneselearning.mobile.data.remote.AnswerDto
import com.japaneselearning.mobile.data.remote.CreateFlashcardRequest
import com.japaneselearning.mobile.data.remote.DashboardDto
import com.japaneselearning.mobile.data.remote.ExamDto
import com.japaneselearning.mobile.data.remote.ExamFolderDto
import com.japaneselearning.mobile.data.remote.ExamResultDto
import com.japaneselearning.mobile.data.remote.ExamQuestionDto
import com.japaneselearning.mobile.data.remote.FavoriteRequest
import com.japaneselearning.mobile.data.remote.FlashcardDto
import com.japaneselearning.mobile.data.remote.FlashcardSetDto
import com.japaneselearning.mobile.data.remote.FlashcardReviewResponseDto
import com.japaneselearning.mobile.data.remote.FlashcardReviewScheduleDto
import com.japaneselearning.mobile.data.remote.FlashcardReviewSummaryDto
import com.japaneselearning.mobile.data.remote.LiveAttemptDto
import com.japaneselearning.mobile.data.remote.SearchResultsDto
import com.japaneselearning.mobile.data.remote.StudyApi
import com.japaneselearning.mobile.data.remote.LoginRequest
import com.japaneselearning.mobile.data.remote.SaveAnswersRequest
import com.japaneselearning.mobile.data.remote.StartMistakePracticeRequest
import com.japaneselearning.mobile.data.remote.SubmitAttemptRequest
import com.japaneselearning.mobile.data.remote.SetTagsRequest
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CancellationException

interface StudyRepository {
    suspend fun login(username: String, password: String): User

    suspend fun me(): User

    suspend fun logout()

    suspend fun listFlashcardSets(
        search: String? = null,
        favoriteOnly: Boolean = false,
        tag: String? = null,
    ): List<FlashcardSet>

    suspend fun getFlashcardSet(setId: String): FlashcardSet

    suspend fun getFlashcardReviewSummary(): FlashcardReviewSummary

    suspend fun getFlashcardReviewQueue(limit: Int = 20): FlashcardReviewQueue

    suspend fun submitFlashcardReview(
        cardId: String,
        rating: FlashcardReviewRating,
        clientRequestId: String,
    ): FlashcardReviewResult

    suspend fun setFlashcardFavorite(setId: String, favorite: Boolean): FlashcardSet

    suspend fun setFlashcardTags(setId: String, tags: List<String>): FlashcardSet

    suspend fun listTags(): List<LearningTag>

    suspend fun listExamFolders(): List<ExamFolder>

    suspend fun listExams(
        folderId: String? = null,
        search: String? = null,
        favoriteOnly: Boolean = false,
        tag: String? = null,
    ): List<Exam>

    suspend fun getExam(examId: String): Exam

    suspend fun setExamFavorite(examId: String, favorite: Boolean): Exam

    suspend fun setExamTags(examId: String, tags: List<String>): Exam

    suspend fun startAttempt(examId: String): LiveAttempt

    suspend fun getAttempt(attemptId: String): LiveAttempt

    suspend fun saveAnswer(attemptId: String, questionId: String, selectedOptionId: String?)

    suspend fun submitAttempt(attemptId: String, answers: Map<String, String?>): ExamResult

    suspend fun getSubmittedAttemptResult(attemptId: String): ExamResult = error("unused")

    suspend fun startMistakePractice(examId: String, mistakeIds: List<String>): LiveAttempt

    suspend fun getWrongAnswerReviewQueue(limit: Int = 20): WrongAnswerReviewQueue

    suspend fun dismissWrongAnswer(mistakeId: String)

    suspend fun clearWrongAnswers(examId: String? = null)

    suspend fun getMistakeAttempts(examId: String): List<MistakeAttemptSummary> = error("unused")

    suspend fun getMistakeAttemptDetail(attemptId: String): MistakeAttemptDetail = error("unused")

    suspend fun getFrequentMistakes(examId: String): FrequentMistakeSummary = error("unused")

    suspend fun dictionaryLookup(
        query: String,
        direction: DictionaryLookupDirection = DictionaryLookupDirection.AUTO,
        limit: Int = 20,
        includeExamples: Boolean = false,
    ): DictionaryLookup = error("unused")

    suspend fun dictionarySuggestions(
        query: String,
        direction: DictionaryLookupDirection = DictionaryLookupDirection.AUTO,
        limit: Int = 10,
    ): DictionarySuggestions = error("unused")

    suspend fun dictionaryHistory(limit: Int = 10): DictionaryHistory = error("unused")

    suspend fun clearDictionaryHistory(): Unit = error("unused")

    suspend fun dictionaryFavorites(limit: Int = 20, offset: Int = 0): DictionaryFavorites = error("unused")

    suspend fun saveDictionaryFavorite(draft: DictionaryFavoriteDraft): DictionaryFavorite = error("unused")

    suspend fun removeDictionaryFavorite(favoriteId: String): Unit = error("unused")

    suspend fun createFlashcard(setId: String, front: String, back: String): Flashcard = error("unused")

    suspend fun getDashboard(): DashboardSummary

    suspend fun search(query: String): SearchResults
}

@Singleton
class StudyRepositoryImpl @Inject constructor(
    private val api: StudyApi,
    private val tokenStore: TokenStore,
    private val readCache: StudyReadCache,
) : StudyRepository {
    override suspend fun login(username: String, password: String): User {
        val response = request { api.login(LoginRequest(username, password)) }
        tokenStore.saveSession(response.accessToken, response.user.username)
        return User(response.user.username)
    }

    override suspend fun me(): User {
        val response = request { api.me() }
        if (!response.authenticated) {
            tokenStore.clear()
            throw IllegalStateException("Session is not authenticated")
        }
        return User(response.username)
    }

    override suspend fun logout() {
        runCatching { request { api.logout() } }
        tokenStore.clear()
    }

    override suspend fun listFlashcardSets(search: String?, favoriteOnly: Boolean, tag: String?): List<FlashcardSet> {
        val sets = request {
            api.listFlashcardSets(search = search, favorite = favoriteOnly.takeIf { it }, tag = tag)
        }.items.map(::mapSet)
        if (search.isNullOrBlank() && !favoriteOnly && tag == null) runCatching { readCache.saveFlashcardSets(sets) }
        return sets
    }

    override suspend fun getFlashcardSet(setId: String): FlashcardSet {
        val set = mapSet(request { api.getFlashcardSet(setId) })
        runCatching { readCache.saveFlashcardSets(listOf(set)) }
        return set
    }

    override suspend fun getFlashcardReviewSummary(): FlashcardReviewSummary =
        mapReviewSummary(request { api.getFlashcardReviewSummary() })

    override suspend fun getFlashcardReviewQueue(limit: Int): FlashcardReviewQueue {
        val boundedLimit = limit.coerceIn(1, 20)
        val response = request { api.getFlashcardReviewQueue(boundedLimit) }
        return com.japaneselearning.mobile.data.model.FlashcardReviewQueue(
            serverNow = response.serverNow,
            cards = response.cards.map(::mapReviewCard),
        )
    }

    override suspend fun submitFlashcardReview(
        cardId: String,
        rating: FlashcardReviewRating,
        clientRequestId: String,
    ): FlashcardReviewResult = mapReviewResult(
        request {
            api.submitFlashcardReview(
                cardId,
                com.japaneselearning.mobile.data.remote.SubmitFlashcardReviewRequest(
                    rating = rating.name,
                    clientRequestId = clientRequestId,
                ),
            )
        },
    )

    override suspend fun setFlashcardFavorite(setId: String, favorite: Boolean): FlashcardSet =
        mapSet(request { api.setFlashcardFavorite(setId, FavoriteRequest(favorite)) })

    override suspend fun setFlashcardTags(setId: String, tags: List<String>): FlashcardSet =
        mapSet(request { api.setFlashcardTags(setId, SetTagsRequest(tags)) })

    override suspend fun listTags(): List<LearningTag> =
        request { api.listTags() }.map(::mapTag)

    override suspend fun listExamFolders(): List<ExamFolder> =
        request { api.listExamFolders() }.map(::mapFolder)

    override suspend fun listExams(
        folderId: String?,
        search: String?,
        favoriteOnly: Boolean,
        tag: String?,
    ): List<Exam> {
        val exams = request {
            api.listExams(
                folderId = folderId,
                search = search,
                favorite = favoriteOnly.takeIf { it },
                tag = tag,
            )
        }.items.map(::mapExam)
        if (search.isNullOrBlank() && folderId == null && !favoriteOnly && tag == null) runCatching { readCache.saveExams(exams) }
        return exams
    }

    override suspend fun getExam(examId: String): Exam =
        mapExam(request { api.getExam(examId) })

    override suspend fun setExamFavorite(examId: String, favorite: Boolean): Exam =
        mapExam(request { api.setExamFavorite(examId, FavoriteRequest(favorite)) })

    override suspend fun setExamTags(examId: String, tags: List<String>): Exam =
        mapExam(request { api.setExamTags(examId, SetTagsRequest(tags)) })

    override suspend fun startAttempt(examId: String): LiveAttempt =
        mapAttempt(request { api.startAttempt(examId) })

    override suspend fun getAttempt(attemptId: String): LiveAttempt =
        mapAttempt(request { api.getAttempt(attemptId) })

    override suspend fun saveAnswer(
        attemptId: String,
        questionId: String,
        selectedOptionId: String?,
    ) {
        request {
            api.saveAnswers(
                attemptId,
                SaveAnswersRequest(listOf(AnswerDto(questionId, selectedOptionId))),
            )
        }
    }

    override suspend fun submitAttempt(
        attemptId: String,
        answers: Map<String, String?>,
    ): ExamResult {
        val request = SubmitAttemptRequest(
            answers = answers.map { (questionId, selectedOptionId) ->
                AnswerDto(questionId, selectedOptionId)
            },
        )
        return mapResult(request { api.submitAttempt(attemptId, request) })
    }

    override suspend fun getSubmittedAttemptResult(attemptId: String): ExamResult =
        mapResult(request { api.getSubmittedAttemptResult(attemptId) })

    override suspend fun startMistakePractice(examId: String, mistakeIds: List<String>): LiveAttempt =
        mapAttempt(request { api.startMistakePractice(StartMistakePracticeRequest(examId, mistakeIds)) })

    override suspend fun getWrongAnswerReviewQueue(limit: Int): WrongAnswerReviewQueue {
        val response = request { api.getWrongAnswerReviewQueue(limit.coerceIn(1, 20)) }
        return WrongAnswerReviewQueue(
            items = response.items.map(::mapWrongAnswer),
            total = response.total,
        )
    }

    override suspend fun dismissWrongAnswer(mistakeId: String) {
        request { api.dismissWrongAnswer(mistakeId) }
    }

    override suspend fun clearWrongAnswers(examId: String?) {
        request { api.clearWrongAnswers(examId) }
    }

    override suspend fun getMistakeAttempts(examId: String): List<MistakeAttemptSummary> = request {
        api.getMistakeAttempts(examId).attempts.take(3).map(::mapMistakeAttemptSummary)
    }

    override suspend fun getMistakeAttemptDetail(attemptId: String): MistakeAttemptDetail = request {
        api.getMistakeAttemptDetail(attemptId).let { response ->
            MistakeAttemptDetail(
                attempt = mapMistakeAttemptSummary(response.attempt),
                items = response.items.take(100).map(::mapRetainedMistake),
            )
        }
    }

    override suspend fun getFrequentMistakes(examId: String): FrequentMistakeSummary = request {
        api.getFrequentMistakes(examId).let { response ->
            FrequentMistakeSummary(
                examId = response.examId,
                examVersion = response.examVersion,
                retainedAttemptCount = response.retainedAttemptCount.coerceIn(0, 3),
                items = response.items.take(100).map(::mapFrequentMistake),
            )
        }
    }

    override suspend fun dictionaryLookup(
        query: String,
        direction: DictionaryLookupDirection,
        limit: Int,
        includeExamples: Boolean,
    ): DictionaryLookup = request {
        api.dictionaryLookup(
            query = query.trim(),
            direction = direction.toRemote(),
            limit = limit.coerceIn(1, 20),
            includeExamples = includeExamples,
        ).toDomain()
    }

    override suspend fun dictionarySuggestions(
        query: String,
        direction: DictionaryLookupDirection,
        limit: Int,
    ): DictionarySuggestions = request {
        api.dictionarySuggestions(
            query = query.trim(),
            direction = direction.toRemote(),
            limit = limit.coerceIn(1, 10),
        ).toDomain()
    }

    override suspend fun dictionaryHistory(limit: Int): DictionaryHistory = request {
        val response = api.dictionaryHistory(limit.coerceIn(1, 100))
        DictionaryHistory(
            items = response.items.take(100).map { it.toDomain() },
            total = response.total,
        )
    }

    override suspend fun clearDictionaryHistory() {
        request { api.clearDictionaryHistory() }
    }

    override suspend fun dictionaryFavorites(limit: Int, offset: Int): DictionaryFavorites = request {
        api.dictionaryFavorites(limit.coerceIn(1, 100), offset.coerceIn(0, 10_000)).toDomain()
    }

    override suspend fun saveDictionaryFavorite(draft: DictionaryFavoriteDraft): DictionaryFavorite = request {
        api.saveDictionaryFavorite(
            com.japaneselearning.mobile.data.remote.SaveDictionaryFavoriteRequest(
                term = draft.term,
                reading = draft.reading,
                meaningSummary = draft.meaningSummary,
                direction = draft.direction.toRemote(),
                sourceProvider = draft.source.provider,
                sourceName = draft.source.name,
                sourceUrl = draft.source.url,
                sourceLicense = draft.source.license,
                sourceAttribution = draft.source.attribution,
            ),
        ).toDomain()
    }

    override suspend fun removeDictionaryFavorite(favoriteId: String) {
        request { api.removeDictionaryFavorite(favoriteId) }
    }

    override suspend fun createFlashcard(setId: String, front: String, back: String): Flashcard = request {
        mapCard(api.createFlashcard(setId, CreateFlashcardRequest(front = front, back = back)))
    }

    override suspend fun getDashboard(): DashboardSummary {
        val dashboard = mapDashboard(request { api.dashboard() })
        runCatching { readCache.saveDashboard(dashboard) }
        return dashboard
    }

    override suspend fun search(query: String): SearchResults =
        mapSearch(request { api.search(query) })

    private suspend fun <T> request(block: suspend () -> T): T {
        return try {
            block()
        } catch (cancellation: CancellationException) {
            throw cancellation
        } catch (throwable: Throwable) {
            val mapped = ApiErrorMapper.map(throwable)
            if (mapped.isUnauthorized) tokenStore.clear()
            throw mapped
        }
    }

    private fun mapSet(dto: FlashcardSetDto) = FlashcardSet(
        id = dto.id,
        title = dto.title,
        description = dto.description,
        cardCount = dto.cardCount,
        isFavorite = dto.isFavorite,
        tags = dto.tags.map(::mapTag),
        cards = dto.cards.orEmpty().map(::mapCard),
    )

    private fun mapTag(dto: com.japaneselearning.mobile.data.remote.TagDto) = LearningTag(
        id = dto.id,
        slug = dto.slug,
        name = dto.name,
    )

    private fun mapCard(dto: FlashcardDto) = com.japaneselearning.mobile.data.model.Flashcard(
        id = dto.id,
        setId = dto.setId,
        front = dto.front,
        back = dto.back,
        position = dto.position,
    )

    private fun mapReviewCard(dto: com.japaneselearning.mobile.data.remote.FlashcardReviewCardDto) =
        FlashcardReviewCard(
            id = dto.id,
            setId = dto.setId,
            front = dto.front,
            back = dto.back,
            position = dto.position,
            schedule = mapSchedule(dto.schedule),
        )

    private fun mapSchedule(dto: FlashcardReviewScheduleDto) =
        com.japaneselearning.mobile.data.model.FlashcardSchedule(
            state = dto.state,
            dueAt = dto.dueAt,
            stability = dto.stability,
            difficulty = dto.difficulty,
            elapsedDays = dto.elapsedDays,
            scheduledDays = dto.scheduledDays,
            learningSteps = dto.learningSteps,
            reps = dto.reps,
            lapses = dto.lapses,
            lastReviewedAt = dto.lastReviewedAt,
        )

    private fun mapReviewSummary(dto: FlashcardReviewSummaryDto) = FlashcardReviewSummary(
        serverNow = dto.serverNow,
        dueCount = dto.dueCount,
        newCount = dto.newCount,
        reviewCount = dto.reviewCount,
    )

    private fun mapReviewResult(dto: FlashcardReviewResponseDto) = FlashcardReviewResult(
        cardId = dto.cardId,
        rating = FlashcardReviewRating.valueOf(dto.rating),
        stateBefore = dto.stateBefore,
        stateAfter = dto.stateAfter,
        dueAtBefore = dto.dueAtBefore,
        dueAtAfter = dto.dueAtAfter,
        schedule = mapSchedule(dto.schedule),
    )

    private fun mapFolder(dto: ExamFolderDto): ExamFolder = ExamFolder(
        id = dto.id,
        parentId = dto.parentId,
        name = dto.name,
        examCount = dto.examCount ?: 0,
        children = dto.children.map(::mapFolder),
    )

    private fun mapExam(dto: ExamDto): Exam = Exam(
        id = dto.id,
        folderId = dto.folderId,
        title = dto.title,
        description = dto.description,
        timeLimitSeconds = dto.timeLimitSeconds,
        questionCount = dto.questionCount,
        bestScore = dto.bestScore ?: dto.bestResult?.bestScore,
        isFavorite = dto.isFavorite,
        tags = dto.tags.map(::mapTag),
        questions = dto.questions.orEmpty().map(::mapQuestion),
    )

    private fun mapQuestion(dto: ExamQuestionDto) = com.japaneselearning.mobile.data.model.ExamQuestion(
        id = dto.id,
        content = dto.content,
        options = dto.options.map { option ->
            com.japaneselearning.mobile.data.model.ExamOption(
                id = option.id,
                content = option.content,
                isCorrect = option.isCorrect,
            )
        },
    )

    private fun mapWrongAnswer(dto: com.japaneselearning.mobile.data.remote.WrongAnswerReviewItemDto) =
        WrongAnswerReviewItem(
            id = dto.id,
            examId = dto.examId,
            examTitle = dto.examTitle,
            examVersion = dto.examVersion,
            questionId = dto.questionId,
            questionType = dto.questionType,
            questionContent = dto.questionContent,
            options = dto.options.map { option ->
                com.japaneselearning.mobile.data.model.LiveOption(option.id, option.content)
            },
            selectedOptionId = dto.selectedOptionId,
            sourceAttemptId = dto.sourceAttemptId,
            createdAt = dto.createdAt,
            updatedAt = dto.updatedAt,
        )

    private fun mapMistakeAttemptSummary(dto: com.japaneselearning.mobile.data.remote.MistakeAttemptSummaryDto) =
        MistakeAttemptSummary(
            attemptId = dto.attemptId,
            examId = dto.examId,
            examTitle = dto.examTitle,
            examVersion = dto.examVersion,
            submittedAt = dto.submittedAt,
            score = dto.score,
            correctCount = dto.correctCount,
            totalQuestions = dto.totalQuestions,
            durationSeconds = dto.durationSeconds,
            mistakeCount = dto.mistakeCount,
        )

    private fun mapRetainedMistake(dto: com.japaneselearning.mobile.data.remote.RetainedMistakeItemDto) =
        com.japaneselearning.mobile.data.model.RetainedMistakeItem(
            id = dto.id,
            examId = dto.examId,
            examTitle = dto.examTitle,
            examVersion = dto.examVersion,
            questionId = dto.questionId,
            questionType = dto.questionType,
            questionContent = dto.questionContent,
            questionPosition = dto.questionPosition,
            options = dto.options.map { option ->
                com.japaneselearning.mobile.data.model.RetainedMistakeOption(
                    id = option.id,
                    content = option.content,
                    position = option.position,
                    isCorrect = option.isCorrect,
                )
            },
            selectedOptionId = dto.selectedOptionId,
            correctOptionId = dto.correctOptionId,
            isCorrect = dto.isCorrect,
            isUnanswered = dto.isUnanswered,
            sourceAttemptId = dto.sourceAttemptId,
            submittedAt = dto.submittedAt,
        )

    private fun mapFrequentMistake(dto: com.japaneselearning.mobile.data.remote.FrequentMistakeDto) =
        com.japaneselearning.mobile.data.model.FrequentMistake(
            examId = dto.examId,
            examVersion = dto.examVersion,
            questionId = dto.questionId,
            questionType = dto.questionType,
            questionContent = dto.questionContent,
            questionPosition = dto.questionPosition,
            options = dto.options.map { option ->
                com.japaneselearning.mobile.data.model.RetainedMistakeOption(
                    id = option.id,
                    content = option.content,
                    position = option.position,
                    isCorrect = option.isCorrect,
                )
            },
            correctOptionId = dto.correctOptionId,
            occurrenceCount = dto.occurrenceCount,
            retainedAttemptCount = dto.retainedAttemptCount,
            sourceAttemptId = dto.sourceAttemptId,
        )

    private fun mapAttempt(dto: LiveAttemptDto) = LiveAttempt(
        attemptId = dto.attemptId,
        examId = dto.examId,
        examTitle = dto.examTitle,
        expiresAt = dto.expiresAt,
        questions = dto.questions.map { question ->
            com.japaneselearning.mobile.data.model.LiveQuestion(
                id = question.id,
                content = question.content,
                options = question.options.map { option ->
                    com.japaneselearning.mobile.data.model.LiveOption(option.id, option.content)
                },
            )
        },
        savedAnswers = dto.savedAnswers,
        isPractice = dto.isPractice,
    )

    private fun mapResult(dto: ExamResultDto) = ExamResult(
        attemptId = dto.attemptId,
        examId = dto.examId,
        examTitle = dto.examTitle,
        score = dto.score,
        correctCount = dto.correctCount,
        totalQuestions = dto.totalQuestions,
        durationSeconds = dto.durationSeconds,
        questions = dto.questions.map { question ->
            com.japaneselearning.mobile.data.model.GradedQuestion(
                questionId = question.questionId,
                content = question.content,
                selectedOptionId = question.selectedOptionId,
                correctOptionId = question.correctOptionId,
                isCorrect = question.isCorrect,
                options = question.options.map { option ->
                    com.japaneselearning.mobile.data.model.GradedOption(
                        id = option.id,
                        content = option.content,
                        isCorrect = option.isCorrect,
                    )
                },
            )
        },
        isNewBest = dto.isNewBest,
        bestScore = dto.bestScore,
        isPractice = dto.isPractice,
    )

    private fun mapDashboard(dto: DashboardDto) = DashboardSummary(
        recentFlashcardSets = dto.recentFlashcardSets.map(::mapSet),
        recentExams = dto.recentExams.map(::mapExam),
        totalFlashcardSets = dto.totalFlashcardSets,
        totalCards = dto.totalCards,
        totalExams = dto.totalExams,
        recentBestScores = dto.recentBestScores.map {
            com.japaneselearning.mobile.data.model.RecentBestScore(it.examId, it.examTitle, it.bestScore)
        },
        recentLearning = dto.recentLearning.map {
            com.japaneselearning.mobile.data.model.RecentLearning(
                kind = it.kind,
                entityId = it.entityId,
                title = it.title,
                subtitle = it.subtitle,
                cardCount = it.cardCount,
                questionCount = it.questionCount,
            )
        },
    )

    private fun mapSearch(dto: SearchResultsDto) = SearchResults(
        flashcardSets = dto.flashcardSets.map(::mapSet),
        flashcards = dto.flashcards.map {
            com.japaneselearning.mobile.data.model.Flashcard(
                id = it.id,
                setId = it.setId,
                front = it.front,
                back = it.back,
                position = it.position,
            )
        },
        exams = dto.exams.map(::mapExam),
        folders = dto.folders.map(::mapFolder),
        total = dto.total,
    )
}
