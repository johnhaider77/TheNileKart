package com.example.thenilekart;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.messaging.FirebaseMessaging;
import com.example.thenilekart.services.PushNotificationService;

/**
 * MainActivity - Handles push notification routing
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    private WebView webview;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webview = findViewById(R.id.webview);

        // Request FCM token
        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful()) {
                        Log.w(TAG, "❌ Fetching FCM token failed", task.getException());
                        return;
                    }

                    String token = task.getResult();
                    Log.d(TAG, "✅ FCM Token: " + token);
                    
                    // Register token with backend
                    PushNotificationService.sendTokenToBackend(this, token);
                });

        // Handle notification click
        handleNotificationClick(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleNotificationClick(intent);
    }

    /**
     * Handle notification click actions
     */
    private void handleNotificationClick(Intent intent) {
        if (intent != null && intent.getExtras() != null) {
            String title = intent.getStringExtra("title");
            String body = intent.getStringExtra("body");
            
            Log.d(TAG, "📱 Notification clicked:");
            Log.d(TAG, "   Title: " + title);
            Log.d(TAG, "   Body: " + body);
            
            // Notify web app about the notification click
            if (webview != null) {
                String jsCode = "window.notificationClicked && window.notificationClicked('" + 
                    escapeJs(title) + "', '" + escapeJs(body) + "')";
                webview.evaluateJavascript(jsCode, null);
            }
        }
    }

    private String escapeJs(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("'", "\\'")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r");
    }

    /**
     * Get FCM token (can be called from UI)
     */
    public String getFCMToken() {
        return PushNotificationService.getFCMToken(this);
    }
}
