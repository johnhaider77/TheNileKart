package com.example.thenilekart.services;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.example.thenilekart.MainActivity;
import com.example.thenilekart.R;

import org.json.JSONObject;

public class PushNotificationService extends FirebaseMessagingService {

    private static final String TAG = "PushNotificationService";
    private static final String CHANNEL_ID = "thenilekart_notifications";
    private static final int NOTIFICATION_ID = 100;

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "✅ FCM Token: " + token);

        SharedPreferences prefs = getSharedPreferences("FirebaseMessaging", Context.MODE_PRIVATE);
        prefs.edit().putString("fcmToken", token).apply();

        sendTokenToBackend(token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "📥 Message received");

        String title = "";
        String body = "";

        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body = remoteMessage.getNotification().getBody();
        }

        if (!remoteMessage.getData().isEmpty()) {
            if (remoteMessage.getData().containsKey("title")) {
                title = remoteMessage.getData().get("title");
            }
            if (remoteMessage.getData().containsKey("body")) {
                body = remoteMessage.getData().get("body");
            }
        }

        showNotification(title, body);
    }

    private void showNotification(String title, String body) {
        try {
            Log.d(TAG, "📲 Showing notification: " + title);

            createNotificationChannel();

            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    0,
                    intent,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH);

            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.notify(NOTIFICATION_ID, builder.build());
                Log.d(TAG, "✅ Notification displayed");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error showing notification: " + e.getMessage());
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "TheNileKart Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void sendTokenToBackend(String token) {
        sendTokenToBackendInternal(this, token);
    }

    public static void sendTokenToBackend(Context context, String token) {
        sendTokenToBackendInternal(context, token);
    }

    private static void sendTokenToBackendInternal(Context context, String token) {
        new Thread(() -> {
            try {
                // Validate token
                if (token == null || token.isEmpty()) {
                    Log.w(TAG, "❌ Token is null or empty");
                    return;
                }
                
                // Log comprehensive token analysis for debugging
                Log.d(TAG, "📊 Token Analysis:");
                Log.d(TAG, "   - Length: " + token.length() + " characters");
                Log.d(TAG, "   - Valid FCM token should be 150+ characters");
                Log.d(TAG, "   - First 50 chars: " + token.substring(0, Math.min(50, token.length())));
                
                // Check for placeholder/test tokens
                boolean isPlaceholder = token.toLowerCase().contains("exampletoken") || 
                                       token.toLowerCase().contains("test") ||
                                       token.toLowerCase().contains("demo") ||
                                       token.toLowerCase().contains("example") ||
                                       token.length() < 100;
                
                // Log validation result with helpful guidance
                if (isPlaceholder) {
                    Log.w(TAG, "⚠️ PLACEHOLDER TOKEN DETECTED!");
                    Log.w(TAG, "   Token length: " + token.length() + " chars (real tokens: 150+)");
                    Log.w(TAG, "   Token sample: " + token);
                    Log.w(TAG, "   This means Firebase returned a test/placeholder token");
                    Log.w(TAG, "   Likely causes:");
                    Log.w(TAG, "   1. Firebase Cloud Messaging API not enabled in Console");
                    Log.w(TAG, "   2. google-services.json has invalid/incomplete credentials");
                    Log.w(TAG, "   3. App not registered in Firebase Console");
                    Log.w(TAG, "   4. Device has no internet or poor connectivity");
                } else {
                    Log.d(TAG, "✅ Token validation PASSED");
                    Log.d(TAG, "   Length: " + token.length() + " chars (valid for push notifications)");
                    Log.d(TAG, "   Token starts with: " + token.substring(0, Math.min(20, token.length())) + "...");
                }
                
                SharedPreferences authPrefs = context.getSharedPreferences("auth", Context.MODE_PRIVATE);
                String jwtToken = authPrefs.getString("token", null);

                if (jwtToken == null) {
                    Log.w(TAG, "⚠️ No JWT token found - user may not be logged in yet");
                    return;
                }

                // Use production domain with proper protocol
                String url = "https://www.thenilekart.com/api/push-notifications/register-token";
                
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Authorization", "Bearer " + jwtToken);
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                JSONObject body = new JSONObject();
                body.put("deviceToken", token);

                byte[] outputBytes = body.toString().getBytes("utf-8");
                conn.setFixedLengthStreamingMode(outputBytes.length);
                conn.getOutputStream().write(outputBytes);
                conn.getOutputStream().close();

                int responseCode = conn.getResponseCode();
                if (responseCode == 200) {
                    Log.d(TAG, "✅ FCM Token registered successfully!");
                    Log.d(TAG, "   Token length: " + token.length() + " chars");
                    Log.d(TAG, "   Token sample: " + token.substring(0, Math.min(50, token.length())) + "...");
                    
                    // Log validity status
                    if (token.length() >= 150) {
                        Log.d(TAG, "   ✅ Token is VALID (150+ chars) - Real FCM token");
                    } else {
                        Log.d(TAG, "   ❌ Token is INVALID (< 150 chars) - Placeholder from Firebase");
                    }
                } else {
                    // Read error response for debugging
                    String errorResponse = "";
                    try {
                        java.io.BufferedReader br = new java.io.BufferedReader(
                            new java.io.InputStreamReader(conn.getErrorStream())
                        );
                        String line;
                        while ((line = br.readLine()) != null) {
                            errorResponse += line;
                        }
                        br.close();
                    } catch (Exception ignored) {}
                    
                    Log.e(TAG, "❌ Failed to register token. Response code: " + responseCode + 
                             ", Error: " + errorResponse);
                }
                
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "❌ Error sending token to backend: " + e.getMessage(), e);
            }
        }).start();
    }

    public static String getFCMToken(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("FirebaseMessaging", Context.MODE_PRIVATE);
        return prefs.getString("fcmToken", null);
    }

    // Call this method after user logs in to register the FCM token with JWT
    public static void registerTokenAfterLogin(Context context) {
        // Delay by 2 seconds to ensure JWT token is saved to localStorage/SharedPreferences
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            String token = getFCMToken(context);
            if (token != null) {
                Log.d(TAG, "🔄 Registering FCM token after login (after 2s delay)...");
                sendTokenToBackendInternal(context, token);
            } else {
                Log.w(TAG, "⚠️ No FCM token found to register after login");
            }
        }, 2000);
    }
}
