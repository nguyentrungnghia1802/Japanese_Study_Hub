package com.japaneselearning.mobile.feature.flashcards

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.AssistChip
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import com.japaneselearning.mobile.core.ui.CachedContentNotice
import com.japaneselearning.mobile.core.ui.SectionTitle

@Composable
fun FlashcardsScreen(
    onOpenSet: (String) -> Unit,
    viewModel: FlashcardsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        SectionTitle("Flashcards", Modifier.padding(top = 20.dp))
        Text("Ôn lại từ vựng và mẫu câu theo bộ thẻ.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        CachedContentNotice(state.screen.isStale, state.screen.isLoading && state.screen.data != null)
        Spacer(Modifier.height(16.dp))
        OutlinedTextField(
            value = state.query,
            onValueChange = viewModel::setQuery,
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            placeholder = { Text("Tìm bộ thẻ…") },
            singleLine = true,
        )
        Spacer(Modifier.height(12.dp))
        FilterChip(
            selected = state.favoriteOnly,
            onClick = { viewModel.setFavoriteOnly(!state.favoriteOnly) },
            label = { Text("Yêu thích") },
            leadingIcon = {
                Icon(
                    if (state.favoriteOnly) Icons.Default.Star else Icons.Default.StarBorder,
                    contentDescription = null,
                )
            },
        )
        if (!state.tags.data.isNullOrEmpty()) {
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                FilterChip(
                    selected = state.selectedTag == null,
                    onClick = { viewModel.setTag(null) },
                    label = { Text("Tất cả tag") },
                )
                state.tags.data.orEmpty().forEach { tag ->
                    FilterChip(
                        selected = state.selectedTag == tag.slug,
                        onClick = { viewModel.setTag(tag.slug) },
                        label = { Text(tag.name) },
                    )
                }
            }
        }
        Spacer(Modifier.height(12.dp))

        when {
            state.screen.isLoading && state.screen.data == null -> LoadingState()
            state.screen.error != null && state.screen.data == null -> ErrorState(state.screen.error ?: "Không tải được bộ thẻ.", viewModel::load)
            state.screen.data.isNullOrEmpty() -> EmptyState(
                "Chưa có bộ thẻ",
                if (state.query.isBlank()) "Tạo hoặc nhập bộ thẻ trên Web để học trên điện thoại." else "Không tìm thấy kết quả phù hợp.",
            )
            else -> LazyColumn(
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.screen.data.orEmpty(), key = { it.id }) { set ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { onOpenSet(set.id) },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(set.title, fontWeight = FontWeight.Bold)
                                if (!set.description.isNullOrBlank()) {
                                    Text(
                                        set.description,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 2,
                                    )
                                }
                                if (set.tags.isNotEmpty()) {
                                    Row(
                                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    ) {
                                        set.tags.take(5).forEach { tag ->
                                            AssistChip(
                                                onClick = { viewModel.setTag(tag.slug) },
                                                label = { Text(tag.name) },
                                            )
                                        }
                                    }
                                }
                            }
                            IconButton(
                                onClick = { viewModel.setFavorite(set.id, !set.isFavorite) },
                            ) {
                                Icon(
                                    if (set.isFavorite) Icons.Default.Star else Icons.Default.StarBorder,
                                    contentDescription = if (set.isFavorite) "Bỏ yêu thích" else "Thêm yêu thích",
                                    tint = if (set.isFavorite) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text("${set.cardCount} thẻ", color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    }
}
