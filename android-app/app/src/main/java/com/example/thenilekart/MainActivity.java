package com.example.thenilekart;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.widget.Toast;
import android.widget.FrameLayout;
import android.os.Build;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.Manifest;
import android.content.pm.PackageManager;

import com.google.firebase.messaging.FirebaseMessaging;
import com.example.thenilekart.services.PushNotificationService;

/**
 * MainActivity - Handles push notification routing and WebView hosting
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    private static final String WEB_APP_URL = "https://www.thenilekart.com"; // Production domain
    private static final String FALLBACK_URL = "http://40.172.190.250:5000"; // Fallback to IP if production fails
    private static final String FALLBACK_HTML = "file:///android_asset/index.html"; // Local fallback
    private WebView webview;
    private boolean isLoaded = false;
    private FrameLayout webViewContainer;
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 101;

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

        // Request notification permission (Android 13+)
        requestNotificationPermissionIfNeeded();

        // Request FCM token - wrap in try-catch to prevent crashes if Firebase API key is missing
        try {
            Log.d(TAG, "🔧 Firebase Initialization Debug Info:");
            Log.d(TAG, "   - Package Name: " + getPackageName());
            Log.d(TAG, "   - Android SDK: " + Build.VERSION.SDK_INT);
            Log.d(TAG, "   - Firebase Version: messaging-ktx:23.4.0");
            Log.d(TAG, "   - Checking if google-services.json is properly loaded...");
            
            FirebaseMessaging.getInstance().getToken()
                    .addOnCompleteListener(task -> {
                        if (!task.isSuccessful()) {
                            Log.w(TAG, "❌ Fetching FCM token failed", task.getException());
                            Log.d(TAG, "⚠️  This usually means:");
                            Log.d(TAG, "   1. google-services.json is missing or has invalid API key");
                            Log.d(TAG, "   2. Firebase project not configured properly");
                            Log.d(TAG, "   3. Internet connection is disabled");
                            return;
                        }

                        String token = task.getResult();
                        if (token != null && !token.isEmpty()) {
                            Log.d(TAG, "✅ FCM Token obtained: " + token.substring(0, Math.min(50, token.length())) + "...");
                            Log.d(TAG, "Token length: " + token.length() + " chars (valid if >= 150)");
                            
                            // Check if token looks real or is a placeholder
                            if (token.length() < 100) {
                                Log.w(TAG, "⚠️  WARNING: Token is suspiciously short!");
                                Log.d(TAG, "   This usually means Firebase returned a placeholder/test token");
                                Log.d(TAG, "   Possible fixes:");
                                Log.d(TAG, "   1. Verify google-services.json has real Firebase API key");
                                Log.d(TAG, "   2. Check Firebase Console project settings");
                                Log.d(TAG, "   3. Ensure app is registered in Firebase console");
                            }
                            
                            // Register token with backend
                            PushNotificationService.sendTokenToBackend(this, token);
                        } else {
                            Log.w(TAG, "❌ FCM Token is null or empty");
                        }
                    });
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "⚠️ Firebase API key not configured: " + e.getMessage());
            Log.d(TAG, "   Error Details: " + e);
            Log.d(TAG, "   Fix: Ensure google-services.json is in app/ directory with valid API key");
        } catch (Exception e) {
            Log.w(TAG, "⚠️ Firebase initialization error: " + e.getMessage());
            Log.d(TAG, "   Error Details: " + e);
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
            
            // Zoom settings - ensure page is zoomed to fit
            webview.getSettings().setBuiltInZoomControls(false);
            webview.getSettings().setDisplayZoomControls(false);
            webview.getSettings().setDefaultZoom(android.webkit.WebSettings.ZoomDensity.MEDIUM);
            webview.setInitialScale(100);
            
            // Viewport settings - CRITICAL for mobile rendering
            webview.getSettings().setUseWideViewPort(true);
            webview.getSettings().setLoadWithOverviewMode(true);
            
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
                    
                    // Force content to be visible with aggressive CSS injection
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
                        String js = "javascript:(function() {" +
                                "try {" +
                                "  // Remove any display:none, visibility:hidden, or opacity:0 from everywhere" +
                                "  var hideElements = document.querySelectorAll('[style*=\"display:none\"],[style*=\"visibility:hidden\"],[style*=\"opacity:0\"]');" +
                                "  hideElements.forEach(el => { el.style.display=''; el.style.visibility=''; el.style.opacity=''; });" +
                                "  " +
                                "  // Force root div to show" +
                                "  var root = document.getElementById('root');" +
                                "  if (root) {" +
                                "    root.style.cssText = 'display:block !important; visibility:visible !important; opacity:1 !important; width:100% !important; height:auto !important; min-height:100vh !important;';" +
                                "  }" +
                                "  " +
                                "  // Force body to expand" +
                                "  document.body.style.cssText = 'display:block !important; visibility:visible !important; opacity:1 !important; width:100% !important; height:auto !important; min-height:100vh !important; margin:0 !important; padding:0 !important; background:white !important; color:#000 !important;';" +
                                "  document.documentElement.style.cssText = 'display:block !important; visibility:visible !important; opacity:1 !important; width:100% !important; height:auto !important; min-height:100%;';" +
                                "  " +
                                "  // Create and inject mega-fix stylesheet" +
                                "  var style = document.createElement('style');" +
                                "  style.id = 'android-mega-fix';" +
                                "  style.textContent = 'html { height:auto !important; min-height:100%; width:100% !important; } body { height:auto !important; min-height:100vh !important; width:100% !important; margin:0 !important; padding:0 !important; display:block !important; visibility:visible !important; opacity:1 !important; background:white !important; color:#000 !important; overflow-y:auto !important; } #root { display:block !important; visibility:visible !important; opacity:1 !important; width:100% !important; height:auto !important; min-height:100% !important; } * { visibility:visible !important; opacity:1 !important; } .hidden, .display-none, [class*=\"hidden\"], [class*=\"invisible\"] { display:block !important; visibility:visible !important; opacity:1 !important; } body > div { width:100% !important; height:auto !important; min-height:100vh !important; display:block !important; }';" +
                                "  document.head.appendChild(style);" +
                                "  console.log('✅ Aggressive CSS fix applied');" +
                                "  " +
                                "  // Check after a delay if React has rendered" +
                                "  setTimeout(function() {" +
                                "    var rootElement = document.getElementById('root');" +
                                "    if (rootElement && rootElement.children.length > 0) {" +
                                "      console.log('✅ React content detected - ' + rootElement.children.length + ' children');" +
                                "    } else if (rootElement) {" +
                                "      console.log('⚠️ Root exists but no React content - showing placeholder');" +
                                "      rootElement.innerHTML = '<div style=\"text-align:center; padding:40px; color:#333; background:white; min-height:100vh;\"><h2>Loading TheNileKart...</h2><p>If this persists, check internet connection</p></div>';" +
                                "    } else {" +
                                "      console.log('❌ Root div not found');" +
                                "    }" +
                                "  }, 1000);" +
                                "  " +
                                "  console.log('✅ CSS injection complete');" +
                                "} catch(e) { console.log('❌ Error: ' + e); }" +
                                "})()";
                        view.evaluateJavascript(js, null);
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

    /**
     * Request notification permission for Android 13+
     */
    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // Android 13+
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "📋 Requesting notification permission for Android 13+");
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        NOTIFICATION_PERMISSION_REQUEST_CODE);
            } else {
                Log.d(TAG, "✅ Notification permission already granted");
            }
        } else {
            Log.d(TAG, "ℹ️ Android < 13, notification permission not required");
        }
    }

    /**
     * Handle permission request results
     */
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "✅ Notification permission granted by user");
                Toast.makeText(this, "Notifications enabled", Toast.LENGTH_SHORT).show();
            } else {
                Log.w(TAG, "❌ Notification permission denied by user");
                Toast.makeText(this, "Notifications permission denied", Toast.LENGTH_SHORT).show();
            }
        }
    }
}
