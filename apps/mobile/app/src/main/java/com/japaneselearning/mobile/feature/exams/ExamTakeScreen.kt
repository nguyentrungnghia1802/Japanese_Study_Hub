@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.japaneselearning.mobile.feature.exams

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.japaneselearning.mobile.core.ui.EmptyState
import com.japaneselearning.mobile.core.ui.ErrorState
import com.japaneselearning.mobile.core.ui.LoadingState
import com.japaneselearning.mobile.core.ui.Badge
import com.japaneselearning.mobile.data.model.ExamResult
import com.japaneselearning.mobile.data.model.GradedQuestion

@Composable
fun ExamTakeScreen(
    onBack: () -> Unit,
    onOpenLookup: () -> Unit,
    viewModel: ExamTakeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showSubmitDialog by remember { mutableStateOf(false) }

    BackHandler(enabled = state.result == null) { onBack() }

    when {
        state.isLoading -> LoadingState("Đang khôi phục bài thi…")
        state.error != null && state.attempt == null -> ErrorState(state.error ?: "Không thể bắt đầu bài thi.", viewModel::retry)
        state.result != null -> ExamResultScreen(
            result = state.result!!,
            onBack = onBack,
            onOpenLookup = onOpenLookup,
            filter = state.reviewFilter,
            reviewIndex = state.reviewIndex,
            onFilterChanged = viewModel::setReviewFilter,
            onIndexChanged = viewModel::setReviewIndex,
        )
        state.attempt == null -> EmptyState("Không thể bắt đầu", "Bài thi chưa sẵn sàng.")
        else -> {
            val attempt = state.attempt!!
            val question = attempt.questions.getOrNull(state.currentIndex)
            if (question == null) {
                EmptyState("Bài thi không hợp lệ", "Không có câu hỏi để hiển thị.")
            } else {
                Scaffold(
                    topBar = {
                        TopAppBar(
                            title = { Text("Câu ${state.currentIndex + 1}/${attempt.questions.size}") },
                            navigationIcon = {
                                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Thoát") }
                            },
                            actions = {
                                val remaining = state.remainingSeconds
                                if (remaining != null) {
                                    Row(modifier = Modifier.padding(end = 12.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                                        Icon(Icons.Default.Timer, contentDescription = null, tint = timerColor(remaining))
                                        Text(
                                            ExamSessionLogic.formatTimer(remaining),
                                            modifier = Modifier.padding(start = 4.dp),
                                            color = timerColor(remaining),
                                            fontWeight = FontWeight.Bold,
                                        )
                                    }
                                }
                            },
                        )
                    },
                ) { padding ->
                    LazyColumn(
                        modifier = Modifier.padding(padding),
                        contentPadding = PaddingValues(20.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                attempt.questions.forEachIndexed { index, item ->
                                    FilterChip(
                                        selected = index == state.currentIndex,
                                        onClick = { viewModel.goTo(index) },
                                        label = {
                                            Text(if (state.answers[item.id].isNullOrBlank()) "${index + 1}" else "✓ ${index + 1}")
                                        },
                                    )
                                }
                            }
                        }
                        item {
                            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                                Text(
                                    question.content,
                                    modifier = Modifier.padding(20.dp).fillMaxWidth(),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                        itemsIndexed(question.options) { index, option ->
                            val selected = state.answers[question.id] == option.id
                            FilterChip(
                                selected = selected,
                                onClick = { viewModel.selectOption(option.id) },
                                modifier = Modifier.fillMaxWidth(),
                                label = {
                                    Text(
                                        "${('A'.code + index).toChar()}. ${option.content}",
                                        modifier = Modifier.padding(vertical = 8.dp),
                                    )
                                },
                            )
                        }
                        item {
                            if (state.error != null) {
                                Text(state.error ?: "Không lưu được đáp án.", color = MaterialTheme.colorScheme.error)
                                Spacer(Modifier.height(4.dp))
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                OutlinedButton(
                                    onClick = viewModel::previous,
                                    modifier = Modifier.weight(1f),
                                    enabled = state.currentIndex > 0,
                                ) { Text("Trước") }
                                if (state.currentIndex < attempt.questions.lastIndex) {
                                    Button(onClick = viewModel::next, modifier = Modifier.weight(1f)) { Text("Tiếp") }
                                } else {
                                    Button(
                                        onClick = { showSubmitDialog = true },
                                        modifier = Modifier.weight(1f),
                                        enabled = !state.isSubmitting,
                                    ) { Text(if (state.isSubmitting) "Đang nộp…" else "Nộp bài") }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showSubmitDialog) {
        val unanswered = state.attempt?.let { it.questions.size - ExamSessionLogic.answeredCount(state.answers) } ?: 0
        AlertDialog(
            onDismissRequest = { showSubmitDialog = false },
            title = { Text("Nộp bài?") },
            text = { Text(if (unanswered > 0) "Còn $unanswered câu chưa trả lời. Bạn vẫn muốn nộp?" else "Bài sẽ được chấm bởi máy chủ và không thể sửa sau khi nộp.") },
            confirmButton = {
                TextButton(onClick = { showSubmitDialog = false; viewModel.submit() }) { Text("Nộp bài") }
            },
            dismissButton = { TextButton(onClick = { showSubmitDialog = false }) { Text("Hủy") } },
        )
    }
}

@Composable
private fun ExamResultScreen(
    result: ExamResult,
    onBack: () -> Unit,
    onOpenLookup: () -> Unit,
    filter: ReviewFilter,
    reviewIndex: Int,
    onFilterChanged: (ReviewFilter) -> Unit,
    onIndexChanged: (Int) -> Unit,
) {
    val filteredQuestions = result.questions.withIndex().filter { (_, question) ->
        ReviewFilterLogic.matches(filter, question)
    }
    val selectedQuestion = filteredQuestions.getOrNull(reviewIndex.coerceIn(0, (filteredQuestions.size - 1).coerceAtLeast(0)))
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Kết quả") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Default.Close, "Đóng") } },
                actions = {
                    IconButton(onClick = onOpenLookup) {
                        Icon(Icons.Default.Search, "Tra cứu")
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                    Column(modifier = Modifier.padding(24.dp), horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
                        if (result.isNewBest) Badge("NEW PERSONAL BEST", MaterialTheme.colorScheme.secondary)
                        Text(result.examTitle, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.size(8.dp))
                        Text("${result.score.formatScore()} / 100", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
                        Text("Đúng ${result.correctCount}/${result.totalQuestions} câu")
                        result.durationSeconds?.let { Text("Thời gian: ${ExamSessionLogic.formatTimer(it.toLong())}") }
                        Text("Best score: ${result.bestScore.formatScore()} / 100", color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
            item { Text("Xem lại câu trả lời", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    ReviewFilter.values().forEach { option ->
                        FilterChip(
                            selected = filter == option,
                            onClick = { onFilterChanged(option) },
                            label = {
                                Text(
                                    when (option) {
                                        ReviewFilter.ALL -> "Tất cả (${result.questions.size})"
                                        ReviewFilter.WRONG -> "Sai (${result.questions.count { ReviewFilterLogic.matches(ReviewFilter.WRONG, it) }})"
                                        ReviewFilter.UNANSWERED -> "Chưa trả lời (${result.questions.count { ReviewFilterLogic.matches(ReviewFilter.UNANSWERED, it) }})"
                                    },
                                )
                            },
                        )
                    }
                }
            }
            if (filteredQuestions.isEmpty()) {
                item { EmptyState("Không có câu phù hợp", "Bộ lọc này không có câu hỏi để xem lại.") }
            } else {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        filteredQuestions.forEachIndexed { index, indexedQuestion ->
                            FilterChip(
                                selected = index == reviewIndex,
                                onClick = { onIndexChanged(index) },
                                label = { Text("Câu ${indexedQuestion.index + 1}") },
                            )
                        }
                    }
                }
                selectedQuestion?.let { (index, question) ->
                    item { GradedQuestionCard(index, question, onOpenLookup) }
                }
            }
        }
    }
}

@Composable
private fun GradedQuestionCard(index: Int, question: GradedQuestion, onOpenLookup: (() -> Unit)? = null) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Câu ${index + 1}", fontWeight = FontWeight.Bold)
                Row {
                    Icon(
                        if (question.isCorrect) Icons.Default.CheckCircle else Icons.Default.Close,
                        contentDescription = null,
                        tint = if (question.isCorrect) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                    )
                    Text(
                        if (question.isCorrect) " Đúng" else " Sai / chưa trả lời",
                        color = if (question.isCorrect) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                    )
                }
            }
            Text(question.content, fontWeight = FontWeight.SemiBold)
            question.options.forEachIndexed { optionIndex, option ->
                val selected = option.id == question.selectedOptionId
                val tint = when {
                    option.isCorrect -> MaterialTheme.colorScheme.primary
                    selected -> MaterialTheme.colorScheme.error
                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                }
                Text(
                    "${('A'.code + optionIndex).toChar()}. ${option.content}${if (option.isCorrect) "  ✓" else if (selected) "  ✕" else ""}",
                    color = tint,
                )
            }
            if (onOpenLookup != null) {
                OutlinedButton(onClick = onOpenLookup, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Search, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text("Tra cứu thêm")
                }
            }
        }
    }
}

private fun timerColor(seconds: Long) = when {
    seconds <= 30L -> androidx.compose.ui.graphics.Color(0xFFB3261E)
    seconds <= 120L -> androidx.compose.ui.graphics.Color(0xFFE85D4A)
    else -> androidx.compose.ui.graphics.Color.Unspecified
}
