package com.japaneselearning.mobile.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.japaneselearning.mobile.core.network.ApiException
import com.japaneselearning.mobile.core.storage.TokenStore
import com.japaneselearning.mobile.data.model.User
import com.japaneselearning.mobile.data.repository.StudyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AuthUiState(
    val isLoading: Boolean = true,
    val user: User? = null,
    val error: String? = null,
    val isSubmitting: Boolean = false,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: StudyRepository,
    private val tokenStore: TokenStore,
) : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    init {
        restoreSession()
    }

    fun login(username: String, password: String) {
        if (username.isBlank() || password.isBlank()) {
            _state.update { it.copy(error = "Vui lòng nhập tên đăng nhập và mật khẩu.") }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true, error = null) }
            try {
                val user = repository.login(username.trim(), password)
                _state.value = AuthUiState(isLoading = false, user = user)
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                _state.update {
                    it.copy(
                        isLoading = false,
                        isSubmitting = false,
                        error = error.message ?: "Đăng nhập thất bại.",
                    )
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            _state.value = AuthUiState(isLoading = false)
        }
    }

    fun clearError() = _state.update { it.copy(error = null) }

    private fun restoreSession() {
        viewModelScope.launch {
            try {
                if (tokenStore.readToken().isNullOrBlank()) {
                    _state.value = AuthUiState(isLoading = false)
                    return@launch
                }
                val cachedUsername = tokenStore.readUsername()
                if (!cachedUsername.isNullOrBlank()) {
                    _state.value = AuthUiState(isLoading = false, user = User(cachedUsername))
                    try {
                        _state.update { it.copy(user = repository.me()) }
                    } catch (cancellation: CancellationException) {
                        throw cancellation
                    } catch (error: Throwable) {
                        if (error is ApiException && error.isUnauthorized) {
                            _state.value = AuthUiState(isLoading = false)
                        }
                        // Keep the cached identity for transient/offline failures;
                        // content screens can use their bounded read cache and retry.
                    }
                    return@launch
                }
                val user = repository.me()
                _state.value = AuthUiState(isLoading = false, user = user)
            } catch (cancellation: CancellationException) {
                throw cancellation
            } catch (error: Throwable) {
                tokenStore.clear()
                _state.value = AuthUiState(isLoading = false, error = error.message)
            }
        }
    }
}
