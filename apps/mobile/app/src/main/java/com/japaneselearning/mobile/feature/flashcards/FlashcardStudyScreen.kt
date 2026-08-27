@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.japaneselearning.mobile.feature.flashcards

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Shuffle
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
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
fun FlashcardStudyScreen(
    onBack: () -> Unit,
    onOpenLookup: () -> Unit,
    viewModel: StudyViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.set?.title ?: "Học flashcard") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Quay lại") }
                },
                actions = {
                    IconButton(onClick = onOpenLookup) {
                        Icon(Icons.Default.Search, "Tra cứu")
                    }
                    IconButton(onClick = viewModel::shuffle) {
                        Icon(Icons.Default.Shuffle, "Trộn thẻ")
                    }
                },
            )
        },
    ) { padding ->
        when {
            state.isLoading -> LoadingState("Đang chuẩn bị bộ thẻ…")
            state.error != null -> ErrorState(state.error ?: "Không tải được nội dung học.", viewModel::load)
            state.cards.isEmpty() -> EmptyState("Bộ thẻ trống", "Hãy thêm thẻ trên Web trước khi học.")
            else -> {
                val card = state.cards[state.index]
                Column(
                    modifier = Modifier.fillMaxSize().padding(padding).padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        StudySessionLogic.progress(state.index, state.cards.size),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.size(16.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth().weight(1f).clickable { viewModel.flip() },
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
                                if (state.isBackVisible) "裏面" else "表面",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.size(20.dp))
                            Text(
                                if (state.isBackVisible) card.back else card.front,
                                modifier = Modifier.fillMaxWidth(),
                                textAlign = TextAlign.Center,
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(Modifier.size(20.dp))
                            Text("Chạm để lật thẻ", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    Spacer(Modifier.size(16.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(
                            onClick = viewModel::previous,
                            modifier = Modifier.weight(1f),
                            enabled = state.index > 0,
                        ) { Text("Trước") }
                        Button(
                            onClick = viewModel::next,
                            modifier = Modifier.weight(1f),
                            enabled = state.index < state.cards.lastIndex,
                        ) { Text("Tiếp") }
                    }
                }
            }
        }
    }
}
