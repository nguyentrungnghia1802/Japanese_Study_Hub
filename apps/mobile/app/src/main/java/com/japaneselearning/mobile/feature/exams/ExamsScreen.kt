package com.japaneselearning.mobile.feature.exams

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
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
import com.japaneselearning.mobile.core.ui.SectionTitle
import com.japaneselearning.mobile.data.model.ExamFolder

@Composable
fun ExamsScreen(
    onOpenExam: (String) -> Unit,
    viewModel: ExamsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        SectionTitle("Đề thi", Modifier.padding(top = 20.dp))
        Text("Luyện tập và theo dõi điểm cao nhất của từng đề.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        OutlinedTextField(
            value = state.query,
            onValueChange = viewModel::setQuery,
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            placeholder = { Text("Tìm đề thi…") },
            singleLine = true,
        )
        Spacer(Modifier.height(12.dp))
        Row(
            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            AssistChip(
                onClick = { viewModel.selectFolder(null) },
                label = { Text("Tất cả") },
            )
            flattenFolders(state.folders.data.orEmpty()).forEach { (folder, depth) ->
                FolderChip(folder, depth, viewModel::selectFolder)
            }
        }
        Spacer(Modifier.height(12.dp))
        when {
            state.exams.isLoading && state.exams.data == null -> LoadingState()
            state.exams.error != null && state.exams.data == null -> ErrorState(state.exams.error ?: "Không tải được đề thi.", viewModel::load)
            state.exams.data.isNullOrEmpty() -> EmptyState(
                "Chưa có đề thi",
                if (state.query.isBlank()) "Tạo hoặc nhập đề thi trên Web để bắt đầu." else "Không tìm thấy đề phù hợp.",
            )
            else -> LazyColumn(
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.exams.data.orEmpty(), key = { it.id }) { exam ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { onOpenExam(exam.id) },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(exam.title, fontWeight = FontWeight.Bold)
                            Text(
                                buildString {
                                    append("${exam.questionCount} câu")
                                    exam.timeLimitSeconds?.let { append(" · ${it / 60} phút") }
                                },
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            exam.bestScore?.let {
                                Text(
                                    "Best score: ${it.formatScore()} / 100",
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FolderChip(folder: ExamFolder, depth: Int, onSelect: (String?) -> Unit) {
    AssistChip(
        onClick = { onSelect(folder.id) },
        label = { Text("${"  ".repeat(depth)}${folder.name}") },
    )
}

private fun flattenFolders(
    folders: List<ExamFolder>,
    depth: Int = 0,
): List<Pair<ExamFolder, Int>> = buildList {
    folders.forEach { folder ->
        add(folder to depth)
        addAll(flattenFolders(folder.children, depth + 1))
    }
}

internal fun Double.formatScore(): String =
    if (this % 1.0 == 0.0) this.toInt().toString() else "%.2f".format(this)
