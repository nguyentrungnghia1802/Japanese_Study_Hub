package com.japaneselearning.mobile.core.storage

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.authDataStore by preferencesDataStore(name = "auth_preferences")
private val Context.attemptDataStore by preferencesDataStore(name = "attempt_preferences")

@Singleton
class EncryptedTokenStore @Inject constructor(
    @param:ApplicationContext private val context: Context,
) : TokenStore {
    private val tokenKey = stringPreferencesKey("encrypted_access_token")
    private val usernameKey = stringPreferencesKey("username")
    private val keyAlias = "japanese-study-hub-auth"

    override val token: Flow<String?> = context.authDataStore.data.map { preferences ->
        preferences[tokenKey]?.let(::decrypt)
    }

    override suspend fun readToken(): String? = token.first()

    override suspend fun saveSession(token: String, username: String) {
        context.authDataStore.edit { preferences ->
            preferences[tokenKey] = encrypt(token)
            preferences[usernameKey] = username
        }
    }

    override suspend fun readUsername(): String? = context.authDataStore.data.first()[usernameKey]

    override suspend fun clear() {
        context.authDataStore.edit { preferences ->
            preferences.remove(tokenKey)
            preferences.remove(usernameKey)
        }
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val existing = keyStore.getKey(keyAlias, null)
        if (existing is SecretKey) return existing

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build(),
        )
        return generator.generateKey()
    }

    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)
        val encoded = Base64.encodeToString(
            cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8)),
            Base64.NO_WRAP,
        )
        return "$iv:$encoded"
    }

    private fun decrypt(value: String): String? {
        return runCatching {
            val parts = value.split(':', limit = 2)
            require(parts.size == 2)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(
                Cipher.DECRYPT_MODE,
                getOrCreateKey(),
                GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)),
            )
            String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8)
        }.getOrNull()
    }
}

@Singleton
class DataStoreAttemptStore @Inject constructor(
    @param:ApplicationContext private val context: Context,
) : AttemptStore {
    override val activeAttempts: Flow<Set<String>> = context.attemptDataStore.data.map { preferences ->
        preferences.asMap()
            .filter { (key, value) -> key.name.startsWith("active_attempt_") && value is String && value.isNotBlank() }
            .keys
            .map { it.name.removePrefix("active_attempt_") }
            .filter(String::isNotBlank)
            .take(MAX_ACTIVE_ATTEMPTS)
            .toSet()
    }

    override suspend fun readActiveAttempt(examId: String): String? {
        return context.attemptDataStore.data.first()[attemptKey(examId)]
    }

    override suspend fun saveActiveAttempt(examId: String, attemptId: String) {
        context.attemptDataStore.edit { preferences ->
            preferences[attemptKey(examId)] = attemptId
            val activeKeys = preferences.asMap().keys
                .filter { key -> key.name.startsWith("active_attempt_") }
                .sortedBy { it.name }
            activeKeys.drop(MAX_ACTIVE_ATTEMPTS).forEach { key -> preferences.remove(key) }
        }
    }

    override suspend fun clearActiveAttempt(examId: String) {
        context.attemptDataStore.edit { preferences ->
            preferences.remove(attemptKey(examId))
        }
    }

    private fun attemptKey(examId: String) = stringPreferencesKey("active_attempt_$examId")

    private companion object {
        const val MAX_ACTIVE_ATTEMPTS = 8
    }
}
