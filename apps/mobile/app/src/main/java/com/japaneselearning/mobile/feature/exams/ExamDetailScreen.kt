@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.japaneselearning.mobile.feature.exams

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.japaneselearning.mobile.core.ui.EmptyState
import com.japaneselearning.mobile.core.ui.ErrorState
import com.japaneselearning.mobile.core.ui.LoadingState

@Composable
fun ExamDetailScreen(
    onBack: () -> Unit,
    onStart: (String) -> Unit,
    viewModel: ExamDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.data?.title ?: "Chi tiết đề thi") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Quay lại") } },
            )
        },
    ) { padding ->
        when {
            state.isLoading && state.data == null -> LoadingState()
            state.error != null && state.data == null -> ErrorState(state.error ?: "Không tải được đề thi.", viewModel::load)
            state.data == null -> EmptyState("Không tìm thấy đề thi", "Đề có thể đã bị xóa.")
            else -> {
                val exam = state.data!!
                Column(
                    modifier = Modifier.padding(padding).padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Text(exam.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    exam.description?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    if (exam.tags.isNotEmpty()) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            exam.tags.forEach { tag ->
                                AssistChip(onClick = {}, label = { Text(tag.name) })
                            }
                        }
                    }
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text("${exam.questionCount} câu hỏi")
                            Text(
                                exam.timeLimitSeconds?.let { "${it / 60} phút" } ?: "Không giới hạn",
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                    Text(
                        "Đáp án chỉ được chấm và hiển thị sau khi nộp bài.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(
                        onClick = { onStart(exam.id) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = exam.questionCount > 0,
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null)
                        Text("Bắt đầu làm bài", modifier = Modifier.padding(start = 8.dp))
                    }
                }
            }
        }
    }
}
