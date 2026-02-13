package com.example.thenilekart.services;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.example.thenilekart.MainActivity;
import com.example.thenilekart.R;

import org.json.JSONObject;

/**
 * Push Notification Service for Android
 * Handles FCM registration, notification handling, and routing
 */
public class PushNotificationService extends FirebaseMessagingService {

    private static final String TAG = "PushNotificationService";
    private static final String CHANNEL_ID = "thenilekart_notifications";
    private static final int NOTIFICATION_ID = 100;

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "✅ FCM Token: " + token);

        // Save token to SharedPreferences
        getSharedPreferences("FirebaseMessaging", MODE_PRIVATE)
                .edit()
                .putString("fcmToken", token)
                .apply();

        // Send token to backend if user is logged in
        sendTokenToBackend(token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "📥 Message received from: " + remoteMessage.getFrom());

        // Parse notification data
        String heading = "";
        String message = "";
        String actionType = "home";
        JSONObject actionData = new JSONObject();

        // Get data from notification
        if (remoteMessage.getNotification() != null) {
            heading = remoteMessage.getNotification().getTitle();
            message = remoteMessage.getNotification().getBody();
            Log.d(TAG, "Notification - Title: " + heading + ", Body: " + message);
        }

        // Get data from data payload
        if (!remoteMessage.getData().isEmpty()) {
            Log.d(TAG, "Message data: " + remoteMessage.getData());

            if (remoteMessage.getData().containsKey("title")) {
                heading = remoteMessage.getData().get("title");
            }
            if (remoteMessage.getData().containsKey("body")) {
                message = remoteMessage.getData().get("body");
            }
            if (remoteMessage.getData().containsKey("actionType")) {
                actionType = remoteMessage.getData().get("actionType");
            }
            if (remoteMessage.getData().containsKey("actionData")) {
                try {
                    actionData = new JSONObject(remoteMessage.getData().get("actionData"));
                } catch (Exception e) {
                    Log.e(TAG, "Error parsing action data: " + e.getMessage());
                }
            }
        }

        // Show notification
        showNotification(heading, message, actionType, actionData);
    }

    /**
     * Show notification in notification center
     */
    private void showNotification(String heading, String message, String actionType, JSONObject actionData) {
        try {
            Log.d(TAG, "📲 Showing notification: " + heading);

            // Create notification channel (required for Android 8+)
            createNotificationChannel();

            // Create intent for notification tap
            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            intent.putExtra("notification_action_type", actionType);
            intent.putExtra("notification_action_data", actionData.toString());

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    (int) System.currentTimeMillis(),
                    intent,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );

            // Build notification
            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_notification) // Make sure this drawable exists
                    .setContentTitle(heading)
                    .setContentText(message)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setStyle(new NotificationCompat.BigTextStyle()
                            .bigText(message));

            // Add action buttons if needed
            builder.addAction(0, "Open", pendingIntent);

            // Show notification
            NotificationManager notificationManager =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.notify(NOTIFICATION_ID, builder.build());
                Log.d(TAG, "✅ Notification displayed");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error showing notification: " + e.getMessage(), e);
        }
    }

    /**
     * Create notification channel (required for Android 8+)
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelName = "TheNileKart Notifications";
            String channelDescription = "Notifications from TheNileKart";
            int importance = NotificationManager.IMPORTANCE_HIGH;

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    channelName,
                    importance
            );
            channel.setDescription(channelDescription);
            channel.enableVibration(true);
            channel.enableLights(true);

            NotificationManager notificationManager =
                    (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d(TAG, "✅ Notification channel created");
            }
        }
    }

    /**
     * Send FCM token to backend
     */
    private void sendTokenToBackend(String token) {
        new Thread(() -> {
            try {
                // Retrieve JWT token from SharedPreferences
                String jwtToken = getSharedPreferences("auth", MODE_PRIVATE)
                        .getString("token", null);

                if (jwtToken == null) {
                    Log.w(TAG, "⚠️  No JWT token found, skipping token registration");
                    return;
                }

                String urlString = BuildConfig.API_BASE_URL + "/push-notifications/register-token";
                java.net.URL url = new java.net.URL(urlString);
                java.net.HttpURLConnection connection = (java.net.HttpURLConnection) url.openConnection();

                connection.setRequestMethod("POST");
                connection.setRequestProperty("Authorization", "Bearer " + jwtToken);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setDoOutput(true);

                // Create request body
                JSONObject body = new JSONObject();
                body.put("deviceToken", token);

                byte[] outputBytes = body.toString().getBytes("utf-8");
                connection.getOutputStream().write(outputBytes);

                int responseCode = connection.getResponseCode();
                if (responseCode == 200) {
                    Log.d(TAG, "✅ FCM token registered with backend");
                } else {
                    Log.e(TAG, "❌ Failed to register token. Response code: " + responseCode);
                }
            } catch (Exception e) {
                Log.e(TAG, "❌ Error sending token to backend: " + e.getMessage(), e);
            }
        }).start();
    }

    /**
     * Get stored FCM token
     */
    public static String getFCMToken(Context context) {
        return context.getSharedPreferences("FirebaseMessaging", MODE_PRIVATE)
                .getString("fcmToken", null);
    }
}
