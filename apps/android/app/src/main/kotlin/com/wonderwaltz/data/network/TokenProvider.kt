package com.wonderwaltz.data.network

/** Abstracts access-token retrieval so network module can stay loosely coupled to AuthRepository. */
interface TokenProvider {
    suspend fun currentAccessToken(): String?
}
