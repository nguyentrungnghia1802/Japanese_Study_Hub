@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.japaneselearning.mobile.feature.flashcards

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
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
fun FlashcardDetailScreen(
    onBack: () -> Unit,
    onStudy: (String) -> Unit,
    viewModel: FlashcardDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.data?.title ?: "Bộ thẻ") },
                navigationIcon = {
                IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Quay lại") }
                },
            )
        },
    ) { padding ->
        when {
            state.isLoading && state.data == null -> LoadingState()
            state.error != null && state.data == null -> ErrorState(state.error ?: "Không tải được bộ thẻ.", viewModel::load)
            state.data == null -> EmptyState("Không có bộ thẻ", "Dữ liệu không còn tồn tại.")
            else -> {
                val set = state.data!!
                LazyColumn(
                    modifier = Modifier.padding(padding),
                    contentPadding = PaddingValues(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Column {
                            Text(set.description.orEmpty(), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Button(
                                onClick = { onStudy(set.id) },
                                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                                enabled = set.cards.isNotEmpty(),
                            ) {
                                Icon(Icons.Default.PlayArrow, contentDescription = null)
                                Text("Bắt đầu học", modifier = Modifier.padding(start = 8.dp))
                            }
                        }
                    }
                    item { Text("${set.cards.size} thẻ", fontWeight = FontWeight.Bold) }
                    items(set.cards, key = { it.id }) { card ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Row(modifier = Modifier.padding(16.dp)) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(card.front, fontWeight = FontWeight.SemiBold)
                                    Text(card.back, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
