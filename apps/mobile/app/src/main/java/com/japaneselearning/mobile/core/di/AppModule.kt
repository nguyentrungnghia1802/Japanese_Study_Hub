package com.japaneselearning.mobile.core.di

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.japaneselearning.mobile.core.config.AppConfig
import com.japaneselearning.mobile.core.network.AuthInterceptor
import com.japaneselearning.mobile.core.network.NetworkTimeouts
import com.japaneselearning.mobile.core.storage.AttemptStore
import com.japaneselearning.mobile.core.storage.DataStoreAttemptStore
import com.japaneselearning.mobile.core.storage.EncryptedTokenStore
import com.japaneselearning.mobile.core.storage.TokenStore
import com.japaneselearning.mobile.data.remote.StudyApi
import com.japaneselearning.mobile.data.repository.StudyRepository
import com.japaneselearning.mobile.data.repository.StudyRepositoryImpl
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit

@Module
@InstallIn(SingletonComponent::class)
object StorageModule {
    @Provides
    @Singleton
    fun provideTokenStore(store: EncryptedTokenStore): TokenStore = store

    @Provides
    @Singleton
    fun provideAttemptStore(store: DataStoreAttemptStore): AttemptStore = store
}

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        explicitNulls = false
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(authInterceptor: AuthInterceptor): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .connectTimeout(NetworkTimeouts.connect.first, NetworkTimeouts.connect.second)
            .readTimeout(NetworkTimeouts.read.first, NetworkTimeouts.read.second)
            .writeTimeout(NetworkTimeouts.write.first, NetworkTimeouts.write.second)
            .build()

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient, json: Json): Retrofit = Retrofit.Builder()
        .baseUrl("${AppConfig.apiBaseUrl}/")
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Provides
    @Singleton
    fun provideStudyApi(retrofit: Retrofit): StudyApi = retrofit.create(StudyApi::class.java)
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindStudyRepository(implementation: StudyRepositoryImpl): StudyRepository
}
