@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.japaneselearning.mobile.feature.lookup

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.japaneselearning.mobile.core.ui.EmptyState
import com.japaneselearning.mobile.core.ui.ErrorState
import com.japaneselearning.mobile.core.ui.LoadingState
import com.japaneselearning.mobile.core.ui.SectionTitle
import com.japaneselearning.mobile.data.model.DictionaryExampleResult
import com.japaneselearning.mobile.data.model.DictionaryFavorite
import com.japaneselearning.mobile.data.model.DictionaryHistoryItem
import com.japaneselearning.mobile.data.model.DictionaryKanjiResult
import com.japaneselearning.mobile.data.model.DictionaryLookup
import com.japaneselearning.mobile.data.model.DictionaryLookupDirection
import com.japaneselearning.mobile.data.model.DictionarySourceAttribution
import com.japaneselearning.mobile.data.model.DictionaryWordResult
import com.japaneselearning.mobile.data.model.FlashcardSet

@Composable
fun DictionaryScreen(
    onBack: (() -> Unit)? = null,
    activeExamBlocked: Boolean = false,
    viewModel: DictionaryViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showFlashcardDialog by remember { mutableStateOf(false) }

    LaunchedEffect(activeExamBlocked) {
        viewModel.setLookupBlocked(activeExamBlocked)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tra cứu") },
                navigationIcon = {
                    if (onBack != null) {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                        }
                    }
                },
            )
        },
    ) { padding ->
        if (activeExamBlocked) {
            EmptyState(
                "Đang làm bài thi",
                "Tra cứu bị khóa trong lúc làm bài để bảo vệ tính toàn vẹn của kỳ thi. Hãy nộp bài hoặc thoát bài thi trước.",
            )
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                OutlinedTextField(
                    value = state.query,
                    onValueChange = viewModel::setQuery,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    placeholder = { Text("日本語 hoặc tiếng Việt") },
                )
            }
            item {
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    DirectionChip("Tự nhận diện", DictionaryLookupDirection.AUTO, state.direction, viewModel::setDirection)
                    DirectionChip("Nhật → Việt", DictionaryLookupDirection.JA_TO_VI, state.direction, viewModel::setDirection)
                    DirectionChip("Việt → Nhật", DictionaryLookupDirection.VI_TO_JA, state.direction, viewModel::setDirection)
                }
            }
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = state.includeExamples, onCheckedChange = viewModel::setIncludeExamples)
                    Text("Kèm ví dụ câu")
                    Spacer(Modifier.weight(1f))
                    Button(onClick = viewModel::lookup, enabled = state.query.isNotBlank() && !state.lookup.isLoading) {
                        Icon(Icons.Default.Search, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Tra cứu")
                    }
                }
            }
            if (state.suggestions.data?.suggestions?.isNotEmpty() == true && state.lookup.data == null) {
                item { SectionTitle("Gợi ý") }
                itemsIndexed(state.suggestions.data!!.suggestions, key = { index, suggestion -> "suggestion-$index-${suggestion.text}" }) { _, suggestion ->
                    Text(
                        suggestion.text,
                        modifier = Modifier.fillMaxWidth().clickable { viewModel.selectSuggestion(suggestion.text) }.padding(vertical = 8.dp),
                    )
                }
            }
            item { LookupContent(state, viewModel, onAddFlashcard = { showFlashcardDialog = true }) }
            item { SavedItemsContent(state, viewModel) }
        }
    }

    if (showFlashcardDialog) {
        AddFlashcardDialog(
            state = state,
            viewModel = viewModel,
            onDismiss = { showFlashcardDialog = false },
        )
    }
}

@Composable
private fun DirectionChip(
    label: String,
    direction: DictionaryLookupDirection,
    selected: DictionaryLookupDirection,
    onSelect: (DictionaryLookupDirection) -> Unit,
) {
    FilterChip(selected = selected == direction, onClick = { onSelect(direction) }, label = { Text(label) })
}

@Composable
private fun LookupContent(
    state: DictionaryUiState,
    viewModel: DictionaryViewModel,
    onAddFlashcard: () -> Unit,
) {
    when {
        state.lookup.isLoading -> LoadingState("Đang tra cứu từ điển…")
        state.lookup.error != null -> ErrorState(state.lookup.error ?: "Tra cứu thất bại.", viewModel::retryLookup)
        state.lookup.data == null -> EmptyState("Tra cứu từ hoặc kanji", "Kết quả và ví dụ sẽ được lấy từ API của máy chủ.")
        else -> {
            val result = state.lookup.data!!
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Kết quả cho “${result.query}”", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    val favorite = viewModel.favoriteForResult(result)
                    IconButton(onClick = viewModel::toggleFavorite, enabled = !state.favoriteBusy) {
                        Icon(
                            if (favorite == null) Icons.Default.FavoriteBorder else Icons.Default.Favorite,
                            contentDescription = if (favorite == null) "Lưu yêu thích" else "Bỏ yêu thích",
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = onAddFlashcard) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Thêm flashcard")
                    }
                }
                if (result.results.isEmpty() && result.kanji == null && result.examples.isEmpty()) {
                    EmptyState("Không có kết quả", "Thử đổi hướng tra cứu hoặc kiểm tra lại chính tả.")
                }
                result.results.forEach { word -> WordResultCard(word) }
                result.kanji?.let { KanjiResultCard(it) }
                if (result.examples.isNotEmpty()) {
                    SectionTitle("Ví dụ")
                    result.examples.forEachIndexed { index, example -> ExampleCard(index, example) }
                }
                SourcesBlock(result.sources.ifEmpty { result.results.map { it.source }.distinctBy { it.url } })
            }
        }
    }
}

@Composable
private fun WordResultCard(word: DictionaryWordResult) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(word.writtenForm, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            word.reading?.let { Text("Đọc: $it", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            if (word.partOfSpeech.isNotEmpty()) Text(word.partOfSpeech.joinToString(" · "), color = MaterialTheme.colorScheme.primary)
            word.meanings.forEachIndexed { index, meaning -> Text("${index + 1}. $meaning") }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                word.common?.let { Text(if (it) "Thông dụng" else "Ít dùng", style = MaterialTheme.typography.labelMedium) }
                word.frequencyRank?.let { Text("Tần suất #$it", style = MaterialTheme.typography.labelMedium) }
            }
            SourceLine(word.source)
        }
    }
}

@Composable
private fun KanjiResultCard(kanji: DictionaryKanjiResult) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(kanji.character, style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold)
            if (kanji.vietnameseMeanings.isNotEmpty()) Text("Nghĩa: ${kanji.vietnameseMeanings.joinToString(", ")}")
            if (kanji.onYomi.isNotEmpty()) Text("On: ${kanji.onYomi.joinToString(", ")}")
            if (kanji.kunYomi.isNotEmpty()) Text("Kun: ${kanji.kunYomi.joinToString(", ")}")
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                kanji.strokeCount?.let { Text("Nét: $it") }
                kanji.jlpt?.let { Text("JLPT: N$it") }
                kanji.grade?.let { Text("Lớp: $it") }
                kanji.frequencyRank?.let { Text("Tần suất #$it") }
            }
            if (kanji.relatedWords.isNotEmpty()) {
                Text("Từ liên quan", fontWeight = FontWeight.SemiBold)
                kanji.relatedWords.forEach { related ->
                    Text(listOfNotNull(related.writtenForm, related.reading, related.meaning).joinToString(" · "))
                }
            }
            SourceLine(kanji.source)
        }
    }
}

@Composable
private fun ExampleCard(index: Int, example: DictionaryExampleResult) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("${index + 1}. ${example.japaneseSentence}", fontWeight = FontWeight.SemiBold)
            Text(example.vietnameseTranslation, color = MaterialTheme.colorScheme.onSurfaceVariant)
            SourceLine(example.source)
        }
    }
}

@Composable
private fun SourcesBlock(sources: List<DictionarySourceAttribution>) {
    if (sources.isNotEmpty()) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Nguồn", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
            sources.distinctBy { it.url }.forEach { source -> SourceLine(source) }
        }
    }
}

@Composable
private fun SourceLine(source: DictionarySourceAttribution) {
    Text(
        "Nguồn: ${source.attribution}${source.license?.let { " · $it" } ?: ""}",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun SavedItemsContent(state: DictionaryUiState, viewModel: DictionaryViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        SectionTitle("Lịch sử gần đây")
        when {
            state.history.isLoading -> CircularProgressIndicator(modifier = Modifier.padding(8.dp))
            state.history.error != null -> Text("Không tải được lịch sử: ${state.history.error}", color = MaterialTheme.colorScheme.error)
            state.history.data?.items.isNullOrEmpty() -> Text("Chưa có lượt tra cứu nào.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            else -> {
                state.history.data!!.items.take(DictionaryViewModel.MAX_HISTORY).forEach { item -> HistoryRow(item, viewModel::openHistory) }
                TextButton(onClick = viewModel::clearHistory) { Text("Xóa lịch sử") }
            }
        }
        SectionTitle("Yêu thích")
        when {
            state.favorites.isLoading -> CircularProgressIndicator(modifier = Modifier.padding(8.dp))
            state.favorites.error != null -> Text("Không tải được yêu thích: ${state.favorites.error}", color = MaterialTheme.colorScheme.error)
            state.favorites.data?.items.isNullOrEmpty() -> Text("Chưa lưu mục yêu thích.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            else -> state.favorites.data!!.items.take(DictionaryViewModel.MAX_FAVORITES).forEach { item -> FavoriteRow(item, viewModel) }
        }
        state.actionError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }
}

@Composable
private fun HistoryRow(item: DictionaryHistoryItem, onOpen: (DictionaryHistoryItem) -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().clickable { onOpen(item) }) {
        Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.primaryLabel ?: item.query, fontWeight = FontWeight.SemiBold)
                Text("${item.query} · ${directionLabel(item.direction)}", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(item.createdAt.take(10), style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun FavoriteRow(item: DictionaryFavorite, viewModel: DictionaryViewModel) {
    Card(modifier = Modifier.fillMaxWidth().clickable { viewModel.openFavorite(item) }) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(listOfNotNull(item.term, item.reading).joinToString(" · "), fontWeight = FontWeight.SemiBold)
                Text(item.meaningSummary, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = { viewModel.removeFavorite(item.id) }) {
                Icon(Icons.Default.Delete, contentDescription = "Xóa yêu thích")
            }
        }
    }
}

@Composable
private fun AddFlashcardDialog(
    state: DictionaryUiState,
    viewModel: DictionaryViewModel,
    onDismiss: () -> Unit,
) {
    val draft = viewModel.flashcardDraft()
    var front by remember(draft) { mutableStateOf(draft?.let { listOfNotNull(it.term, it.reading).joinToString(" ") } ?: "") }
    var back by remember(draft) { mutableStateOf(draft?.meaningSummary ?: "") }
    var selectedSetId by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { viewModel.loadFlashcardSets() }
    LaunchedEffect(state.flashcardSets.data) {
        if (selectedSetId == null) selectedSetId = state.flashcardSets.data?.firstOrNull()?.id
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Thêm flashcard") },
        text = {
            Column(modifier = Modifier.heightIn(max = 520.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = front, onValueChange = { front = it }, label = { Text("Mặt trước") }, singleLine = false)
                OutlinedTextField(value = back, onValueChange = { back = it }, label = { Text("Mặt sau") }, singleLine = false)
                Text("Chọn bộ thẻ", fontWeight = FontWeight.SemiBold)
                when {
                    state.flashcardSets.isLoading -> CircularProgressIndicator()
                    state.flashcardSets.error != null -> Text(state.flashcardSets.error ?: "Không tải được bộ thẻ.", color = MaterialTheme.colorScheme.error)
                    state.flashcardSets.data.isNullOrEmpty() -> Text("Bạn cần tạo bộ thẻ trước trên Web.")
                    else -> state.flashcardSets.data!!.forEach { set ->
                        FilterChip(
                            selected = selectedSetId == set.id,
                            onClick = { selectedSetId = set.id },
                            label = { Text("${set.title} (${set.cardCount})") },
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val setId = selectedSetId ?: return@Button
                    viewModel.createFlashcard(setId, front, back, onDismiss)
                },
                enabled = selectedSetId != null && front.isNotBlank() && back.isNotBlank() && !state.flashcardSets.isLoading,
            ) { Text("Lưu") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Hủy") } },
    )
}

private fun directionLabel(direction: DictionaryLookupDirection): String = when (direction) {
    DictionaryLookupDirection.AUTO -> "Tự nhận diện"
    DictionaryLookupDirection.JA_TO_VI -> "Nhật → Việt"
    DictionaryLookupDirection.VI_TO_JA -> "Việt → Nhật"
}
