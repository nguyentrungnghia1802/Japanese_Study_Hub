@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.japaneselearning.mobile.feature.exams

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.japaneselearning.mobile.core.ui.EmptyState
import com.japaneselearning.mobile.core.ui.ErrorState
import com.japaneselearning.mobile.core.ui.LoadingState
import com.japaneselearning.mobile.data.model.ExamResult

@Composable
fun PracticeScreen(
    onBack: () -> Unit,
    viewModel: PracticeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    BackHandler(enabled = state.result == null) { onBack() }

    when {
        state.isLoading -> LoadingState("Đang chuẩn bị Practice…")
        state.error != null && state.attempt == null -> ErrorState(
            state.error ?: "Không thể bắt đầu Practice.",
            viewModel::load,
        )
        state.result != null -> PracticeResultScreen(state.result!!, onBack)
        state.attempt == null -> EmptyState("Practice không khả dụng", "Không có câu hỏi để luyện.")
        else -> PracticeQuestionScreen(state, viewModel, onBack)
    }
}

@Composable
private fun PracticeQuestionScreen(
    state: PracticeUiState,
    viewModel: PracticeViewModel,
    onBack: () -> Unit,
) {
    val attempt = state.attempt ?: return
    val question = attempt.questions.getOrNull(state.currentIndex) ?: return
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Practice · ${state.currentIndex + 1}/${attempt.questions.size}") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Thoát Practice")
                    }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text("PRACTICE MODE", color = MaterialTheme.colorScheme.tertiary, fontWeight = FontWeight.Bold)
                Spacer(Modifier.size(8.dp))
                Text(attempt.examTitle, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.size(16.dp))
                Text(question.content, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }
            itemsIndexed(question.options) { index, option ->
                val selected = state.answers[question.id] == option.id
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { viewModel.selectOption(option.id) },
                    colors = CardDefaults.cardColors(
                        containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                    ),
                ) {
                    Text(
                        "${('A'.code + index).toChar()}. ${option.content}",
                        modifier = Modifier.padding(16.dp),
                        color = if (selected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
            item {
                state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    OutlinedButton(onClick = viewModel::previous, enabled = state.currentIndex > 0 && !state.isSubmitting) { Text("Trước") }
                    if (state.currentIndex < attempt.questions.lastIndex) {
                        Button(onClick = viewModel::next, enabled = !state.isSubmitting) { Text("Tiếp") }
                    } else {
                        Button(onClick = viewModel::submit, enabled = !state.isSubmitting) { Text(if (state.isSubmitting) "Đang nộp…" else "Nộp Practice") }
                    }
                }
            }
        }
    }
}

@Composable
private fun PracticeResultScreen(result: ExamResult, onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Practice result") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.Close, contentDescription = "Đóng") }
                },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)) {
                    Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("PRACTICE MODE", color = MaterialTheme.colorScheme.tertiary, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.size(8.dp))
                        Text(result.examTitle, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text("${result.score.formatScore()} / 100", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
                        Text("Đúng ${result.correctCount}/${result.totalQuestions} câu")
                        Text("Không ảnh hưởng Best score", color = MaterialTheme.colorScheme.onTertiaryContainer)
                    }
                }
            }
            item { Text("Xem lại câu trả lời", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
            itemsIndexed(result.questions) { index, question ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Câu ${index + 1}", fontWeight = FontWeight.Bold)
                            Icon(
                                if (question.isCorrect) Icons.Default.CheckCircle else Icons.Default.Close,
                                contentDescription = null,
                                tint = if (question.isCorrect) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                            )
                        }
                        Text(question.content, fontWeight = FontWeight.SemiBold)
                        question.options.forEach { option ->
                            Text(
                                option.content + when {
                                    option.isCorrect -> "  ✓"
                                    option.id == question.selectedOptionId -> "  ✕"
                                    else -> ""
                                },
                                color = when {
                                    option.isCorrect -> MaterialTheme.colorScheme.primary
                                    option.id == question.selectedOptionId -> MaterialTheme.colorScheme.error
                                    else -> MaterialTheme.colorScheme.onSurfaceVariant
                                },
                            )
                        }
                    }
                }
            }
            item { TextButton(onClick = onBack) { Text("Quay lại câu sai") } }
        }
    }
}
