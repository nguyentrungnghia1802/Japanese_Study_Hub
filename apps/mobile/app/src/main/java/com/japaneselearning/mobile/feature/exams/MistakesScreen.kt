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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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

@Composable
fun MistakesScreen(
    onBack: () -> Unit,
    onOpenPractice: (examId: String, mistakeId: String) -> Unit,
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
                "Nộp một bài thi có câu sai hoặc bỏ trống để luyện lại tại đây.",
            )
            else -> MistakesContent(state, padding, viewModel, onOpenPractice)
        }
    }
}

@Composable
private fun MistakesContent(
    state: MistakesUiState,
    padding: PaddingValues,
    viewModel: MistakesViewModel,
    onOpenPractice: (examId: String, mistakeId: String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(padding),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text(
                "Các câu dưới đây lấy từ bài đã nộp; đáp án đúng không được gửi trước khi luyện.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (state.actionError != null) {
                Spacer(Modifier.height(8.dp))
                Text(state.actionError, color = MaterialTheme.colorScheme.error)
            }
        }
        items(state.items, key = { it.id }) { mistake ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(mistake.examTitle, fontWeight = FontWeight.Bold)
                            Text(
                                "Content version ${mistake.examVersion}",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.labelMedium,
                            )
                        }
                        IconButton(
                            onClick = { viewModel.dismiss(mistake.id) },
                            enabled = state.busyId == null,
                        ) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "Bỏ câu sai")
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(mistake.questionContent, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { onOpenPractice(mistake.examId, mistake.id) },
                        enabled = state.busyId == null,
                    ) {
                        Text("Practice")
                    }
                    Spacer(Modifier.height(8.dp))
                    mistake.options.forEach { option ->
                        Text(
                            option.content + if (option.id == mistake.selectedOptionId) "  · Đáp án đã chọn" else "",
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            color = if (option.id == mistake.selectedOptionId) {
                                MaterialTheme.colorScheme.error
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            },
                        )
                    }
                    if (mistake.selectedOptionId == null) {
                        Text(
                            "Bỏ trống trong bài đã nộp",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.labelMedium,
                        )
                    }
                }
            }
        }
        item {
            Text(
                "Đang hiển thị tối đa ${MistakesViewModel.MAX_QUEUE_SIZE} câu sai.",
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.labelMedium,
            )
        }
    }
}
