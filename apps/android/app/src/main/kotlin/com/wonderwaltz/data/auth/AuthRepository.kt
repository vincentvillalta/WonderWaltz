package com.wonderwaltz.data.auth

import com.wonderwaltz.data.network.WWApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository
    @Inject
    constructor(
        private val api: WWApi,
        private val store: AuthStore,
    ) {
        /**
         * Ensures an anonymous session exists. Returns the cached token if present,
         * otherwise calls /v1/auth/anonymous and persists the result.
         */
        suspend fun ensureSession(): String {
            store.readAccessToken()?.let { return it }
            val resp = api.anonymousAuth()
            store.saveSession(accessToken = resp.accessToken, userId = resp.userId)
            return resp.accessToken
        }
    }
