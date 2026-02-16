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
                    
                    // Inject CSS to ensure page is visible (bypasses CSP by using DOM manipulation)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
                        String js = "javascript:(function() {" +
                                "try {" +
                                "  console.log('🔧 Starting CSS injection for Android WebView...');" +
                                "  console.log('Document ready state: ' + document.readyState);" +
                                "  console.log('Body exists: ' + (document.body !== null));" +
                                "  console.log('Root div exists: ' + (document.getElementById('root') !== null));" +
                                "  " +
                                "  var root = document.getElementById('root');" +
                                "  if (root) {" +
                                "    console.log('Root div found, forcing display...');" +
                                "    root.style.display = 'block';" +
                                "    root.style.visibility = 'visible';" +
                                "    root.style.opacity = '1';" +
                                "    root.style.width = '100%';" +
                                "    root.style.minHeight = '100vh';" +
                                "    root.style.height = 'auto';" +
                                "  }" +
                                "  " +
                                "  var style = document.createElement('style');" +
                                "  style.id = 'android-webview-fix';" +
                                "  style.textContent = '" +
                                "    html { margin: 0 !important; padding: 0 !important; width: 100% !important; height: auto !important; min-height: 100% !important; background: white !important; } " +
                                "    body { margin: 0 !important; padding: 0 !important; width: 100% !important; height: auto !important; min-height: 100vh !important; background: white !important; color: #000 !important; visibility: visible !important; opacity: 1 !important; display: block !important; overflow-y: auto !important; } " +
                                "    #root { display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; height: auto !important; min-height: 100vh !important; background: white !important; } " +
                                "    #root > * { width: 100% !important; height: auto !important; } " +
                                "    * { box-sizing: border-box !important; } " +
                                "  ';" +
                                "  " +
                                "  document.head.appendChild(style);" +
                                "  console.log('✅ CSS fix injected');" +
                                "  " +
                                "  setTimeout(function() { " +
                                "    var rootAfter = document.getElementById('root');" +
                                "    if (rootAfter && rootAfter.children.length === 0) {" +
                                "      console.log('⚠️ WARNING: Root div has no children - React might not be initialized');" +
                                "      rootAfter.innerHTML = '<div style=\"text-align: center; padding: 20px; color: #666;\">Loading application...</div>';" +
                                "    } else if (rootAfter && rootAfter.children.length > 0) {" +
                                "      console.log('✅ React app detected with ' + rootAfter.children.length + ' child elements');" +
                                "    }" +
                                "    console.log('Document height: ' + document.documentElement.offsetHeight);" +
                                "    console.log('Body height: ' + document.body.offsetHeight);" +
                                "    if (root) console.log('Root height: ' + root.offsetHeight);" +
                                "  }, 500);" +
                                "  " +
                                "  console.log('✅ CSS injection complete');" +
                                "} catch(e) { " +
                                "  console.log('❌ Error: ' + e.message); " +
                                "}" +
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
}
