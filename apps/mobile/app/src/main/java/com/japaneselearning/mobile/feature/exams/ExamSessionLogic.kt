package com.japaneselearning.mobile.feature.exams

object ExamSessionLogic {
    fun answeredCount(answers: Map<String, String?>): Int =
        answers.values.count { !it.isNullOrBlank() }

    fun nextIndex(current: Int, size: Int): Int =
        if (size == 0) 0 else (current + 1).coerceAtMost(size - 1)

    fun previousIndex(current: Int): Int = (current - 1).coerceAtLeast(0)

    fun remainingSeconds(expiresAtMillis: Long, nowMillis: Long): Long =
        ((expiresAtMillis - nowMillis) / 1000L).coerceAtLeast(0L)

    fun formatTimer(seconds: Long): String {
        val minutes = seconds / 60
        val remaining = seconds % 60
        return "%02d:%02d".format(minutes, remaining)
    }
}
