package com.example.thenilekart;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.widget.Toast;
import android.widget.FrameLayout;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.messaging.FirebaseMessaging;
import com.example.thenilekart.services.PushNotificationService;

/**
 * MainActivity - Handles push notification routing and WebView hosting
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    private static final String WEB_APP_URL = "http://40.172.190.250:5000"; // Backend API running on port 5000
    private static final String FALLBACK_HTML = "file:///android_asset/index.html"; // Local fallback
    private WebView webview;
    private boolean isLoaded = false;
    private FrameLayout webViewContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webview = findViewById(R.id.webview);
        
        if (webview == null) {
            Log.e(TAG, "❌ CRITICAL: WebView not found in layout!");
            Toast.makeText(this, "Error: WebView not initialized", Toast.LENGTH_LONG).show();
            return;
        }
        
        Log.d(TAG, "✅ WebView found and initialized");
        
        // Configure WebView
        configureWebView();
        
        // Make sure WebView is visible
        webview.setVisibility(android.view.View.VISIBLE);
        Log.d(TAG, "✅ WebView set to VISIBLE");
        
        // Try to load web app
        loadWebApp();

        // Request FCM token - wrap in try-catch to prevent crashes if Firebase API key is missing
        try {
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
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "⚠️ Firebase API key not configured: " + e.getMessage());
            Log.d(TAG, "ℹ️ App will continue without push notifications");
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Firebase initialization error: " + e.getMessage());
            Log.d(TAG, "ℹ️ Continuing anyway - web app should still load");
        }

        // Handle notification click
        handleNotificationClick(getIntent());
    }
    
    /**
     * Load web app with fallback
     */
    private void loadWebApp() {
        if (webview != null) {
            Log.d(TAG, "📱 Attempting to load: " + WEB_APP_URL);
            // Set background color to show loading state instead of blank screen
            webview.setBackgroundColor(android.graphics.Color.WHITE);
            webview.loadUrl(WEB_APP_URL);
        }
    }
    
    /**
     * Configure WebView settings for optimal functionality
     */
    private void configureWebView() {
        if (webview != null) {
            // Enable JavaScript
            webview.getSettings().setJavaScriptEnabled(true);
            
            // Allow mixed content (HTTP/HTTPS)
            webview.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            
            // Set user agent
            webview.getSettings().setUserAgentString(
                webview.getSettings().getUserAgentString() + " TheNileKart/1.3"
            );
            
            // Enable DOM storage
            webview.getSettings().setDomStorageEnabled(true);
            
            // Enable database
            webview.getSettings().setDatabaseEnabled(true);
            
            // Cache settings
            webview.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
            
            // Set WebViewClient to handle page loading
            webview.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                    super.onPageStarted(view, url, favicon);
                    Log.d(TAG, "🔄 Loading: " + url);
                    // Show white background while loading
                    view.setBackgroundColor(android.graphics.Color.WHITE);
                }
                
                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    isLoaded = true;
                    Log.d(TAG, "✅ Page loaded: " + url);
                    
                    // Inject CSS to ensure page is visible
                    String css = "javascript:(function() {" +
                            "var style = document.createElement('style');" +
                            "style.type = 'text/css';" +
                            "style.innerHTML = 'body, html { background: white; color: #000; visibility: visible; opacity: 1; }' +" +
                            "'#root { background: white; visibility: visible; opacity: 1; }' +" +
                            "'body > div { visibility: visible; opacity: 1; background: white; }';" +
                            "document.head.appendChild(style);" +
                            "console.log('✅ CSS injected for visibility');" +
                            "})()";
                    
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
                        view.evaluateJavascript(css, null);
                    }
                }
                
                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                    Log.e(TAG, "❌ WebView error: " + errorCode + " - " + description + " (URL: " + failingUrl + ")");
                    
                    // Don't show error for SSL issues since we're using HTTP
                    if (description.contains("SSL") || description.contains("certificate")) {
                        Log.d(TAG, "ℹ️ SSL warning (expected for HTTP): " + description);
                        return;
                    }
                    
                    // Show user-friendly error message for other errors
                    Toast.makeText(MainActivity.this, "Connection failed. Please check your internet.", Toast.LENGTH_SHORT).show();
                    
                    // Show error page
                    String errorMessage = "Error: " + description;
                    String errorHtml = "<html><body style='font-family: Arial; text-align: center; padding: 20px; background: #f5f5f5;'>" +
                            "<h2 style='color: #d32f2f;'>⚠️ Connection Error</h2>" +
                            "<p>Failed to load: " + failingUrl + "</p>" +
                            "<p>Error: " + description + " (" + errorCode + ")</p>" +
                            "<p style='color: #666; font-size: 12px;'>Please check if the backend server is running at " + WEB_APP_URL + "</p>" +
                            "<button onclick='location.reload()' style='padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;'>Retry</button>" +
                            "</body></html>";
                    
                    view.loadData(errorHtml, "text/html", "utf-8");
                    
                    super.onReceivedError(view, errorCode, description, failingUrl);
                }
                
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    view.loadUrl(url);
                    return true;
                }
            });
            
            // Set WebChromeClient for console logging and debugging
            webview.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onConsoleMessage(String message, int lineNumber, String sourceID) {
                    Log.d(TAG, "📋 WebConsole: " + message);
                    super.onConsoleMessage(message, lineNumber, sourceID);
                }
            });
        }
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
