package com.japaneselearning.mobile.feature.exams

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.core.ui.ScreenState
import com.japaneselearning.mobile.data.model.Exam
import com.japaneselearning.mobile.data.model.ExamFolder
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ExamsUiState(
    val query: String = "",
    val selectedFolderId: String? = null,
    val favoriteOnly: Boolean = false,
    val folders: ScreenState<List<ExamFolder>> = ScreenState(),
    val exams: ScreenState<List<Exam>> = ScreenState(),
)

@HiltViewModel
class ExamsViewModel @Inject constructor(
    private val repository: StudyRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ExamsUiState())
    val state: StateFlow<ExamsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(folders = ScreenState(isLoading = true), exams = ScreenState(isLoading = true)) }
            try {
                val folders = repository.listExamFolders()
                _state.update { it.copy(folders = ScreenState(isLoading = false, data = folders)) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(folders = ScreenState(isLoading = false, error = error.message ?: "Không tải được thư mục."))
                }
            }
            loadExams()
        }
    }

    fun selectFolder(folderId: String?) {
        _state.update { it.copy(selectedFolderId = folderId) }
        loadExams()
    }

    fun setQuery(query: String) {
        _state.update { it.copy(query = query) }
        loadExams()
    }

    fun setFavoriteOnly(enabled: Boolean) {
        _state.update { it.copy(favoriteOnly = enabled) }
        loadExams()
    }

    fun setFavorite(examId: String, favorite: Boolean) {
        viewModelScope.launch {
            try {
                repository.setExamFavorite(examId, favorite)
                loadExams()
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(exams = it.exams.copy(error = error.message ?: "Không cập nhật được yêu thích."))
                }
            }
        }
    }

    private fun loadExams() {
        viewModelScope.launch {
            val current = _state.value.exams.data
            _state.update { it.copy(exams = ScreenState(isLoading = true, data = current)) }
            try {
                val exams = repository.listExams(
                    folderId = _state.value.selectedFolderId,
                    search = _state.value.query.trim().takeIf(String::isNotEmpty),
                    favoriteOnly = _state.value.favoriteOnly,
                )
                _state.update { it.copy(exams = ScreenState(isLoading = false, data = exams)) }
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(exams = ScreenState(isLoading = false, data = current, error = error.message ?: "Không tải được đề thi."))
                }
            }
        }
    }
}
