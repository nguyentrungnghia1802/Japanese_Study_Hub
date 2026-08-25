package com.japaneselearning.mobile.data.model

data class User(val username: String)

data class Flashcard(
    val id: String,
    val setId: String,
    val front: String,
    val back: String,
    val position: Int,
)

data class FlashcardSet(
    val id: String,
    val title: String,
    val description: String?,
    val cardCount: Int,
    val cards: List<Flashcard> = emptyList(),
)

data class ExamFolder(
    val id: String,
    val parentId: String?,
    val name: String,
    val examCount: Int,
    val children: List<ExamFolder> = emptyList(),
)

data class Exam(
    val id: String,
    val folderId: String?,
    val title: String,
    val description: String?,
    val timeLimitSeconds: Int?,
    val questionCount: Int,
    val bestScore: Double?,
    val questions: List<ExamQuestion> = emptyList(),
)

data class ExamQuestion(
    val id: String,
    val content: String,
    val options: List<ExamOption>,
)

data class ExamOption(
    val id: String,
    val content: String,
    val isCorrect: Boolean? = null,
)

data class LiveAttempt(
    val attemptId: String,
    val examId: String,
    val examTitle: String,
    val expiresAt: String?,
    val questions: List<LiveQuestion>,
    val savedAnswers: Map<String, String?>,
)

data class LiveQuestion(
    val id: String,
    val content: String,
    val options: List<LiveOption>,
)

data class LiveOption(val id: String, val content: String)

data class ExamResult(
    val attemptId: String,
    val examId: String,
    val examTitle: String,
    val score: Double,
    val correctCount: Int,
    val totalQuestions: Int,
    val durationSeconds: Int?,
    val questions: List<GradedQuestion>,
    val isNewBest: Boolean,
    val bestScore: Double,
)

data class GradedQuestion(
    val questionId: String,
    val content: String,
    val selectedOptionId: String?,
    val correctOptionId: String,
    val isCorrect: Boolean,
    val options: List<GradedOption>,
)

data class GradedOption(
    val id: String,
    val content: String,
    val isCorrect: Boolean,
)

data class DashboardSummary(
    val recentFlashcardSets: List<FlashcardSet>,
    val recentExams: List<Exam>,
    val totalFlashcardSets: Int,
    val totalCards: Int,
    val totalExams: Int,
    val recentBestScores: List<RecentBestScore>,
)

data class RecentBestScore(val examId: String, val examTitle: String, val bestScore: Double)

data class SearchResults(
    val flashcardSets: List<FlashcardSet>,
    val flashcards: List<Flashcard>,
    val exams: List<Exam>,
    val folders: List<ExamFolder>,
    val total: Int,
)
