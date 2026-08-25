package com.japaneselearning.mobile.feature.search

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
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

@Composable
fun SearchScreen(
    onOpenFlashcard: (String) -> Unit,
    onOpenExam: (String) -> Unit,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        SectionTitle("Tìm kiếm", Modifier.padding(top = 20.dp))
        OutlinedTextField(
            value = state.query,
            onValueChange = viewModel::setQuery,
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            placeholder = { Text("Tìm bằng tiếng Việt hoặc 日本語…") },
            singleLine = true,
        )
        Spacer(Modifier.height(10.dp))
        Button(onClick = viewModel::search, modifier = Modifier.fillMaxWidth(), enabled = state.query.isNotBlank()) {
            Text("Tìm kiếm")
        }
        Spacer(Modifier.height(10.dp))
        when {
            state.screen.isLoading -> LoadingState()
            state.screen.error != null -> ErrorState(state.screen.error ?: "Tìm kiếm thất bại.", viewModel::retry)
            state.query.isBlank() -> EmptyState("Tìm nội dung học", "Nhập từ khóa để tìm bộ thẻ, thẻ, đề thi hoặc thư mục.")
            state.screen.data == null || state.screen.data?.total == 0 -> EmptyState("Không có kết quả", "Thử một từ khóa khác.")
            else -> {
                val result = state.screen.data!!
                LazyColumn(
                    contentPadding = PaddingValues(bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    item { Text("${result.total} kết quả", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    if (result.flashcardSets.isNotEmpty()) item { SectionTitle("Bộ flashcard") }
                    items(result.flashcardSets, key = { "set-${it.id}" }) { set ->
                        SearchResultCard(set.title, "${set.cardCount} thẻ", Modifier.clickable { onOpenFlashcard(set.id) })
                    }
                    if (result.flashcards.isNotEmpty()) item { SectionTitle("Thẻ") }
                    items(result.flashcards, key = { "card-${it.id}" }) { card ->
                        SearchResultCard(card.front, card.back, Modifier.clickable { onOpenFlashcard(card.setId) })
                    }
                    if (result.exams.isNotEmpty()) item { SectionTitle("Đề thi") }
                    items(result.exams, key = { "exam-${it.id}" }) { exam ->
                        SearchResultCard(exam.title, "${exam.questionCount} câu", Modifier.clickable { onOpenExam(exam.id) })
                    }
                    if (result.folders.isNotEmpty()) item { SectionTitle("Thư mục đề thi") }
                    items(result.folders, key = { "folder-${it.id}" }) { folder ->
                        SearchResultCard(folder.name, "${folder.examCount} đề", Modifier)
                    }
                }
            }
        }
    }
}

@Composable
private fun SearchResultCard(title: String, subtitle: String, modifier: Modifier) {
    Card(modifier = modifier.fillMaxWidth()) {
        Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold)
                Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
