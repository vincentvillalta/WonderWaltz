package com.wonderwaltz.data.network

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Thin wrapper around the Ktor client. Endpoints match the OpenAPI spec;
 * a generated client can replace this later without changing call sites.
 */
@Singleton
class WWApi
    @Inject
    constructor(
        private val client: HttpClient,
    ) {
        suspend fun anonymousAuth(): AnonymousAuthResponse =
            client
                .post("/v1/auth/anonymous")
                .body<ApiEnvelope<AnonymousAuthResponse>>()
                .data

        suspend fun createTrip(req: CreateTripRequest): Trip =
            client
                .post("/v1/trips") {
                    contentType(ContentType.Application.Json)
                    setBody(req)
                }
                .body<ApiEnvelope<Trip>>()
                .data

        suspend fun getTrip(id: String): Trip =
            client
                .get("/v1/trips/$id")
                .body<ApiEnvelope<Trip>>()
                .data
    }
