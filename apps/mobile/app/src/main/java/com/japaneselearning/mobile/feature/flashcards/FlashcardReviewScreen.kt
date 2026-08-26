@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.japaneselearning.mobile.feature.flashcards

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
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
import com.japaneselearning.mobile.core.ui.ErrorState
import com.japaneselearning.mobile.core.ui.LoadingState
import com.japaneselearning.mobile.data.model.FlashcardReviewRating

@Composable
fun FlashcardReviewScreen(
    onBack: () -> Unit,
    viewModel: ReviewViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ôn tập đến hạn") },
                navigationIcon = {
                    androidx.compose.material3.IconButton(onClick = onBack) {
                        androidx.compose.material3.Icon(Icons.AutoMirrored.Filled.ArrowBack, "Quay lại")
                    }
                },
            )
        },
    ) { padding ->
        when {
            state.isLoading && state.summary == null -> LoadingState("Đang tải hàng đợi ôn tập…")
            state.error != null && state.summary == null -> ErrorState(
                state.error ?: "Không tải được hàng đợi ôn tập.",
                viewModel::load,
            )
            state.isLoadingMore && state.cards.isEmpty() -> LoadingState("Đang tải thẻ tiếp theo…")
            state.cards.isEmpty() -> ReviewComplete(
                padding = padding,
                actionError = state.actionError,
                onRetry = viewModel::retryNextBatch,
                onBack = onBack,
            )
            else -> ReviewContent(state, padding, viewModel)
        }
    }
}

@Composable
private fun ReviewContent(
    state: ReviewUiState,
    padding: androidx.compose.foundation.layout.PaddingValues,
    viewModel: ReviewViewModel,
) {
    val card = state.cards.first()
    val progress = ReviewSessionLogic.progress(state.reviewedCount, state.cards.size)
    val ratings = listOf(
        FlashcardReviewRating.AGAIN to "Again",
        FlashcardReviewRating.HARD to "Hard",
        FlashcardReviewRating.GOOD to "Good",
        FlashcardReviewRating.EASY to "Easy",
    )
    Column(
        modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ReviewCount("Đến hạn", state.summary?.dueCount ?: 0, Modifier.weight(1f))
            ReviewCount("Thẻ mới", state.summary?.newCount ?: 0, Modifier.weight(1f))
        }
        Spacer(Modifier.height(16.dp))
        Text(
            ReviewSessionLogic.progressLabel(state.reviewedCount, state.cards.size),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(8.dp))
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(16.dp))
        Card(
            modifier = Modifier.fillMaxWidth().weight(1f).clickable(enabled = !state.isSubmitting) { viewModel.flip() },
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (state.isBackVisible) {
                    MaterialTheme.colorScheme.secondaryContainer
                } else {
                    MaterialTheme.colorScheme.primaryContainer
                },
            ),
        ) {
            Column(
                modifier = Modifier.fillMaxSize().padding(28.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    if (state.isBackVisible) "裏面 / MEANING" else "表面 / PROMPT",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(20.dp))
                Text(
                    if (state.isBackVisible) card.back else card.front,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(20.dp))
                Text(
                    if (state.isBackVisible) "Chọn mức độ ghi nhớ bên dưới" else "Chạm để lật thẻ",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        if (state.actionError != null) {
            Spacer(Modifier.height(12.dp))
            Text(state.actionError, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
        }
        Spacer(Modifier.height(16.dp))
        ratings.chunked(2).forEach { row ->
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { (rating, label) ->
                    Button(
                        onClick = { viewModel.rate(rating) },
                        modifier = Modifier.weight(1f),
                        enabled = state.isBackVisible && !state.isSubmitting,
                    ) {
                        Text(if (state.isSubmitting) "Đang gửi…" else label)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun ReviewCount(label: String, value: Int, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value.toString(), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ReviewComplete(
    padding: androidx.compose.foundation.layout.PaddingValues,
    actionError: String?,
    onRetry: () -> Unit,
    onBack: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(padding).padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Đã ôn xong!", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(
            "Không còn thẻ đến hạn ngay bây giờ. FSRS sẽ lên lịch lần ôn tiếp theo trên máy chủ.",
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (actionError != null) {
            Spacer(Modifier.height(16.dp))
            Text(actionError, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = onRetry) { Text("Thử tải lại") }
        } else {
            Spacer(Modifier.height(16.dp))
            Button(onClick = onBack) { Text("Về bộ thẻ") }
        }
    }
}
