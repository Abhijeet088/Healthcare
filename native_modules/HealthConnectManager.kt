package com.Your Health Will Partner.android

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.time.Instant
import java.time.temporal.ChronoUnit

class HealthConnectSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val client = OkHttpClient()
    private val serverUrl = "https://your-Your Health Will Partner-server.com/api/vitals"
    private val userIdHeader = "1" // Configured test patient ID

    override suspend fun doWork(): Result {
        val healthConnectClient = HealthConnectClient.getOrCreate(applicationContext)
        
        // Ensure permissions are granted before querying
        val grantedPermissions = healthConnectClient.permissionController.getGrantedPermissions()
        if (!grantedPermissions.contains(HeartRateRecord.READ_PERMISSION)) {
            return Result.failure()
        }

        try {
            // Read heart rate records for the last 15 minutes
            val endTime = Instant.now()
            val startTime = endTime.minus(15, ChronoUnit.MINUTES)
            
            val response = healthConnectClient.readRecords(
                ReadRecordsRequest(
                    recordType = HeartRateRecord::class,
                    timeRangeFilter = TimeRangeFilter.between(startTime, endTime)
                )
            )

            // Sync the most recent sample
            val newestRecord = response.records.maxByOrNull { it.startTime }
            if (newestRecord != null) {
                // HeartRateRecord holds a timeseries list of bpm readings
                val averageBpm = newestRecord.samples.map { it.beatsPerMinute }.average()
                
                if (averageBpm > 0) {
                    syncVitalsToServer(averageBpm)
                }
            }

            return Result.success()
        } catch (e: Exception) {
            e.printStackTrace()
            return Result.retry()
        }
    }

    private fun syncVitalsToServer(bpm: Double) {
        val payload = JSONObject().apply {
            put("heartRate", bpm)
            put("spo2", 98) // Default normal SpO2 value
            put("sourceDevice", "Android Health Connect Worker")
            put("timestamp", Instant.now().toString())
        }

        val mediaType = "application/json; charset=utf-8".toMediaType()
        val requestBody = payload.toString().toRequestBody(mediaType)

        val request = Request.Builder()
            .url(serverUrl)
            .post(requestBody)
            .addHeader("x-user-id", userIdHeader)
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("Sync server returned error: ${response.code}")
            }
        }
    }
}
