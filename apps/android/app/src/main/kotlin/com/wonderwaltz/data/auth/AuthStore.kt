package com.wonderwaltz.data.auth

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.authDataStore by preferencesDataStore(name = "ww_auth")

@Singleton
class AuthStore
    @Inject
    constructor(
        @ApplicationContext private val context: Context,
    ) {
        private val accessTokenKey = stringPreferencesKey("access_token")
        private val userIdKey = stringPreferencesKey("user_id")
        private val tripIdKey = stringPreferencesKey("current_trip_id")

        val accessToken: Flow<String?> =
            context.authDataStore.data.map { it[accessTokenKey] }

        val userId: Flow<String?> =
            context.authDataStore.data.map { it[userIdKey] }

        val currentTripId: Flow<String?> =
            context.authDataStore.data.map { it[tripIdKey] }

        suspend fun readAccessToken(): String? =
            context.authDataStore.data.first()[accessTokenKey]

        suspend fun saveSession(
            accessToken: String,
            userId: String,
        ) {
            context.authDataStore.edit { prefs ->
                prefs[accessTokenKey] = accessToken
                prefs[userIdKey] = userId
            }
        }

        suspend fun saveTripId(tripId: String) {
            context.authDataStore.edit { it[tripIdKey] = tripId }
        }

        suspend fun clear() {
            context.authDataStore.edit { it.clear() }
        }
    }
