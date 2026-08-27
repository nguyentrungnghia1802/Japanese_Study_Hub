@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.japaneselearning.mobile.feature.exams

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.japaneselearning.mobile.core.ui.EmptyState
import com.japaneselearning.mobile.core.ui.ErrorState
import com.japaneselearning.mobile.core.ui.LoadingState
import com.japaneselearning.mobile.data.model.MistakeAttemptSummary
import com.japaneselearning.mobile.data.model.RetainedMistakeItem

@Composable
fun MistakesScreen(
    onBack: () -> Unit,
    onOpenPractice: (examId: String, mistakeId: String) -> Unit,
    onOpenLookup: (query: String) -> Unit,
    viewModel: MistakesViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Review mistakes") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                    }
                },
                actions = {
                    if (state.items.isNotEmpty()) {
                        IconButton(onClick = viewModel::clearAll, enabled = state.busyId == null) {
                            Icon(Icons.Default.DeleteSweep, contentDescription = "Xóa tất cả")
                        }
                    }
                },
            )
        },
    ) { padding ->
        when {
            state.isLoading && state.items.isEmpty() -> LoadingState("Đang tải câu sai…")
            state.error != null && state.items.isEmpty() -> ErrorState(
                state.error ?: "Không tải được câu sai.",
                viewModel::load,
            )
            state.items.isEmpty() -> EmptyState(
                "Không có câu sai",
                "Nộp một bài thi có câu sai hoặc bỏ trống để xem lịch sử tại đây.",
            )
            else -> MistakesContent(state, padding, viewModel, onOpenPractice, onOpenLookup)
        }
    }

    state.flashcardDraft?.let { draft ->
        MistakeFlashcardDialog(state, draft.front, draft.back, viewModel)
    }
}

@Composable
private fun MistakesContent(
    state: MistakesUiState,
    padding: PaddingValues,
    viewModel: MistakesViewModel,
    onOpenPractice: (examId: String, mistakeId: String) -> Unit,
    onOpenLookup: (query: String) -> Unit,
) {
    val selectedDetailItems = MistakeReviewLogic.visibleItems(
        state.detail?.items.orEmpty(),
        state.reviewFilter,
    )
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text(
                "Các câu dưới đây lấy từ bài thi chính thức; Practice không làm thay đổi 3 lần gần nhất.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (state.actionError != null) {
                Spacer(Modifier.height(8.dp))
                Text(state.actionError, color = MaterialTheme.colorScheme.error)
            }
        }
        if (state.examIds.size > 1) {
            item {
                Text("Đề thi", fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    state.examIds.forEach { examId ->
                        val title = state.items.firstOrNull { it.examId == examId }?.examTitle ?: examId
                        OutlinedButton(
                            onClick = { viewModel.selectExam(examId) },
                            enabled = state.busyId == null,
                        ) { Text(title.take(18)) }
                    }
                }
            }
        }
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        state.items.firstOrNull { it.examId == state.selectedExamId }?.examTitle
                            ?: "Official exam history",
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        "Chọn một trong tối đa 3 bài đã nộp",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
                IconButton(onClick = viewModel::load, enabled = state.busyId == null) {
                    Icon(Icons.Default.Refresh, contentDescription = "Tải lại")
                }
            }
        }
        if (state.historyError != null) {
            item {
                Text(state.historyError, color = MaterialTheme.colorScheme.error)
                OutlinedButton(onClick = viewModel::load) { Text("Thử lại") }
            }
        } else if (state.historyLoading && state.attempts.isEmpty()) {
            item { LoadingState("Đang tải lịch sử…") }
        } else {
            item {
                AttemptSelector(state.attempts, state.selectedAttemptId, viewModel::selectAttempt)
            }
            item {
                FilterSelector(state, viewModel)
            }
            item {
                FrequentMistakeBlock(state.frequent, viewModel)
            }
            if (selectedDetailItems.isEmpty()) {
                item {
                    EmptyState(
                        "Không có câu trong bộ lọc",
                        "Bài đã chọn không có câu sai hoặc bỏ trống phù hợp.",
                    )
                }
            } else {
                items(selectedDetailItems, key = { it.id }) { item ->
                    RetainedMistakeCard(
                        item = item,
                        selected = selectedDetailItems.getOrNull(state.reviewIndex)?.id == item.id,
                        onSelect = { viewModel.setReviewIndex(selectedDetailItems.indexOf(item)) },
                        onOpenLookup = { query -> onOpenLookup(query) },
                        onCreateFlashcard = { viewModel.beginCreateFlashcard(item) },
                        onOpenPractice = { onOpenPractice(item.examId, item.id) },
                    )
                }
            }
        }
        item {
            Text(
                "Hàng đợi nhanh hiện có ${state.items.size}/${MistakesViewModel.MAX_QUEUE_SIZE} câu; lịch sử chi tiết chỉ giữ 3 bài chính thức mới nhất.",
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium,
            )
        }
    }
}

@Composable
private fun AttemptSelector(
    attempts: List<MistakeAttemptSummary>,
    selectedAttemptId: String?,
    onSelect: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        attempts.take(3).forEachIndexed { index, attempt ->
            OutlinedButton(
                onClick = { onSelect(attempt.attemptId) },
                modifier = Modifier.fillMaxWidth(),
                border = if (attempt.attemptId == selectedAttemptId) {
                    androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
                } else {
                    null
                },
            ) {
                Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.Start) {
                    Text(if (index == 0) "Mới nhất" else "Lần ${index + 1}", fontWeight = FontWeight.Bold)
                    Text(
                        "${attempt.score}% · ${attempt.correctCount}/${attempt.totalQuestions} · ${attempt.mistakeCount} câu · ${attempt.submittedAt}",
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
            }
        }
    }
}

@Composable
private fun FilterSelector(state: MistakesUiState, viewModel: MistakesViewModel) {
    val filters = listOf(
        MistakeReviewFilter.ALL to "Tất cả",
        MistakeReviewFilter.WRONG to "Sai",
        MistakeReviewFilter.UNANSWERED to "Bỏ trống",
    )
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        filters.forEach { (filter, label) ->
            val count = state.detail?.items?.count { MistakeReviewLogic.matches(filter, it) } ?: 0
            OutlinedButton(onClick = { viewModel.setReviewFilter(filter) }) {
                Text("$label ($count)")
            }
        }
    }
}

@Composable
private fun FrequentMistakeBlock(
    summary: com.japaneselearning.mobile.data.model.FrequentMistakeSummary?,
    viewModel: MistakesViewModel,
) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text("Câu lặp lại nhiều", fontWeight = FontWeight.Bold)
            Text(
                "Mẫu số: ${summary?.retainedAttemptCount ?: 0} bài được giữ",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            summary?.items?.take(10)?.forEach { mistake ->
                TextButton(onClick = { viewModel.openFrequent(mistake) }) {
                    Text(
                        "${mistake.occurrenceCount}/${mistake.retainedAttemptCount} · ${mistake.questionContent.take(70)}",
                        textAlign = TextAlign.Start,
                    )
                }
            }
        }
    }
}

@Composable
private fun RetainedMistakeCard(
    item: RetainedMistakeItem,
    selected: Boolean,
    onSelect: () -> Unit,
    onOpenLookup: (query: String) -> Unit,
    onCreateFlashcard: () -> Unit,
    onOpenPractice: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = if (selected) androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null,
        onClick = onSelect,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Câu ${item.questionPosition + 1}", fontWeight = FontWeight.Bold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (item.isUnanswered) Icons.AutoMirrored.Filled.HelpOutline else Icons.Default.Warning,
                        contentDescription = null,
                        tint = if (item.isUnanswered) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.error,
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(if (item.isUnanswered) "Bỏ trống" else "Trả lời sai")
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(item.questionContent, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            item.options.sortedBy { it.position }.forEach { option ->
                val isSelected = option.id == item.selectedOptionId
                val isCorrect = option.id == item.correctOptionId || option.isCorrect
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (isCorrect) Icons.Default.CheckCircle else if (isSelected) Icons.Default.Close else Icons.Default.Language,
                        contentDescription = null,
                        tint = if (isCorrect) MaterialTheme.colorScheme.primary else if (isSelected) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        option.content + when {
                            isCorrect -> " · Đáp án đúng"
                            isSelected -> " · Đã chọn"
                            else -> ""
                        },
                        color = if (isCorrect) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 10.dp)) {
                OutlinedButton(onClick = { onOpenLookup(item.questionContent) }) {
                    Icon(Icons.Default.Language, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Lookup")
                }
                OutlinedButton(onClick = onCreateFlashcard) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Thêm thẻ")
                }
                OutlinedButton(onClick = onOpenPractice) { Text("Practice") }
            }
        }
    }
}

@Composable
private fun MistakeFlashcardDialog(
    state: MistakesUiState,
    front: String,
    back: String,
    viewModel: MistakesViewModel,
) {
    var selectedSetId by remember { mutableStateOf("") }
    LaunchedEffect(state.flashcardSets) {
        if (selectedSetId.isBlank()) selectedSetId = state.flashcardSets.firstOrNull()?.id.orEmpty()
    }
    AlertDialog(
        onDismissRequest = viewModel::closeFlashcardDraft,
        title = { Text("Thêm câu sai vào Flashcard") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Chọn bộ thẻ và chỉnh nội dung trước khi lưu.")
                if (state.isLoadingFlashcardSets) {
                    Text("Đang tải bộ thẻ…")
                } else if (state.flashcardSets.isEmpty()) {
                    Text("Chưa có bộ thẻ để chọn.", color = MaterialTheme.colorScheme.error)
                } else {
                    state.flashcardSets.take(MistakesViewModel.MAX_FLASHCARD_SETS).forEach { set ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(
                                selected = selectedSetId == set.id,
                                onClick = { selectedSetId = set.id },
                            )
                            Text("${set.title} (${set.cardCount})")
                        }
                    }
                }
                OutlinedTextField(
                    value = front,
                    onValueChange = viewModel::updateFlashcardFront,
                    label = { Text("Mặt trước") },
                    minLines = 2,
                    maxLines = 5,
                )
                OutlinedTextField(
                    value = back,
                    onValueChange = viewModel::updateFlashcardBack,
                    label = { Text("Mặt sau") },
                    minLines = 2,
                    maxLines = 5,
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { viewModel.createFlashcard(selectedSetId) },
                enabled = selectedSetId.isNotBlank() && !state.isLoadingFlashcardSets && state.busyId == null,
            ) { Text("Lưu thẻ") }
        },
        dismissButton = { TextButton(onClick = viewModel::closeFlashcardDraft) { Text("Hủy") } },
    )
}
