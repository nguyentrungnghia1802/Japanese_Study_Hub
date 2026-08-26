package com.japaneselearning.mobile.feature.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import com.japaneselearning.mobile.core.ui.LogoMark
import com.japaneselearning.mobile.core.ui.SectionTitle
import com.japaneselearning.mobile.core.ui.StatCard

@Composable
fun DashboardScreen(
    onOpenFlashcards: () -> Unit,
    onOpenExams: () -> Unit,
    onLogout: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    when {
        state.isLoading && state.data == null -> LoadingState()
        state.error != null && state.data == null -> ErrorState(state.error ?: "Không tải được dữ liệu.", viewModel::load)
        state.data == null -> EmptyState("Chưa có dữ liệu", "Hãy thử tải lại trang tổng quan.")
        else -> {
            val data = state.data
            LazyColumn(
                contentPadding = PaddingValues(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            LogoMark(compact = true)
                            Column {
                                Text("Japanese Study Hub", fontWeight = FontWeight.Bold)
                                Text("日本語学習", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        IconButton(onClick = onLogout) {
                            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Đăng xuất")
                        }
                    }
                }
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text("おかえりなさい！", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(6.dp))
                            Text("Tiếp tục học một chút mỗi ngày để tiến bộ bền vững.")
                        }
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatCard("Bộ flashcard", data!!.totalFlashcardSets.toString(), Modifier.weight(1f))
                        StatCard("Thẻ đã tạo", data.totalCards.toString(), Modifier.weight(1f))
                        StatCard("Đề thi", data.totalExams.toString(), Modifier.weight(1f))
                    }
                }
                item { SectionTitle("Học nhanh") }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Button(onClick = onOpenFlashcards, modifier = Modifier.weight(1f)) {
                            Icon(Icons.AutoMirrored.Filled.MenuBook, contentDescription = null)
                            Spacer(Modifier.size(8.dp))
                            Text("Flashcard")
                        }
                        Button(onClick = onOpenExams, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.Quiz, contentDescription = null)
                            Spacer(Modifier.size(8.dp))
                            Text("Đề thi")
                        }
                    }
                }
                item { SectionTitle("Tiếp tục học") }
                if (data!!.recentLearning.isEmpty()) {
                    item { Text("Chưa có hoạt động gần đây.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                } else {
                    items(data.recentLearning) { recent ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(recent.title, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        if (recent.kind == "FLASHCARD_SET") "${recent.cardCount ?: 0} thẻ" else "${recent.questionCount ?: 0} câu hỏi",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                Button(onClick = {
                                    if (recent.kind == "FLASHCARD_SET") onOpenFlashcards() else onOpenExams()
                                }) { Text("Mở") }
                            }
                        }
                    }
                }
                item { SectionTitle("Bộ thẻ gần đây") }
                if (data!!.recentFlashcardSets.isEmpty()) {
                    item { Text("Chưa có bộ flashcard nào.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                } else {
                    items(data.recentFlashcardSets) { set ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(set.title, fontWeight = FontWeight.SemiBold)
                                Text("${set.cardCount} thẻ", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
                item { SectionTitle("Điểm tốt gần đây") }
                if (data!!.recentBestScores.isEmpty()) {
                    item { Text("Chưa có kết quả thi.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                } else {
                    items(data.recentBestScores) { score ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(score.examTitle)
                            Text("${score.bestScore.formatScore()} / 100", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

private fun Double.formatScore(): String =
    if (this % 1.0 == 0.0) this.toInt().toString() else "%.2f".format(this)
