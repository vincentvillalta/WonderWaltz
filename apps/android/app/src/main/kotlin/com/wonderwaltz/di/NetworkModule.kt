package com.wonderwaltz.di

import com.wonderwaltz.BuildConfig
import com.wonderwaltz.data.auth.AuthStore
import com.wonderwaltz.data.network.TokenProvider
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.DefaultRequest
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.api.createClientPlugin
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.header
import io.ktor.http.URLProtocol
import io.ktor.http.Url
import io.ktor.http.takeFrom
import io.ktor.serialization.kotlinx.json.json
import javax.inject.Singleton
import kotlinx.serialization.json.Json

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideJson(): Json =
        Json {
            ignoreUnknownKeys = true
            explicitNulls = false
        }

    @Provides
    @Singleton
    fun provideTokenProvider(store: AuthStore): TokenProvider =
        object : TokenProvider {
            override suspend fun currentAccessToken(): String? = store.readAccessToken()
        }

    @Provides
    @Singleton
    fun provideHttpClient(
        json: Json,
        tokenProvider: TokenProvider,
    ): HttpClient {
        val baseUrl = Url(BuildConfig.API_BASE_URL)
        val bearerPlugin =
            createClientPlugin("WWBearer") {
                onRequest { request, _ ->
                    val token = tokenProvider.currentAccessToken()
                    if (!token.isNullOrBlank()) {
                        request.header("Authorization", "Bearer $token")
                    }
                }
            }

        return HttpClient(OkHttp) {
            expectSuccess = true
            install(ContentNegotiation) { json(json) }
            install(Logging) { level = LogLevel.INFO }
            install(HttpTimeout) {
                requestTimeoutMillis = 30_000
                connectTimeoutMillis = 15_000
                socketTimeoutMillis = 30_000
            }
            install(DefaultRequest) {
                url {
                    protocol = baseUrl.protocol.takeIf { it.name.isNotBlank() } ?: URLProtocol.HTTPS
                    host = baseUrl.host
                    if (baseUrl.port > 0 && baseUrl.port != baseUrl.protocol.defaultPort) {
                        port = baseUrl.port
                    }
                }
            }
            install(bearerPlugin)
        }
    }
}
