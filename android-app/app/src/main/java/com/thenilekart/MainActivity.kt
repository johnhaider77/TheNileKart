
package com.thenilekart

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.view.KeyEvent

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private val WEBSITE_URL = "https://www.thenilekart.com"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        
        // Configure WebView settings for optimal performance
        val webSettings: WebSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.databaseEnabled = true
        webSettings.cacheMode = WebSettings.LOAD_DEFAULT
        webSettings.useWideViewPort = true
        webSettings.loadWithOverviewMode = true
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW)
        webSettings.defaultTextEncodingName = "utf-8"
        
        // Set user agent for Android identification
        webSettings.userAgentString = webSettings.userAgentString + " TheNileKartAndroid"
        
        // Disable zoom - rely on viewport meta tag in frontend
        webSettings.builtInZoomControls = false
        webSettings.displayZoomControls = false
        webSettings.setSupportZoom(false)
        
        // Set WebViewClient to keep navigation within app
        webView.webViewClient = CustomWebViewClient()
        
        // Set WebChromeClient for progress tracking and dialogs
        webView.webChromeClient = CustomWebChromeClient()
        
        // Load the website
        webView.loadUrl(WEBSITE_URL)
    }

    // Handle back button navigation
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    // Cleanup WebView on destroy
    override fun onDestroy() {
        webView.clearHistory()
        webView.clearCache(true)
        webView.removeAllViews()
        webView.destroy()
        super.onDestroy()
    }

    // Custom WebViewClient to handle URL loading within app
    private class CustomWebViewClient : WebViewClient() {
        @Suppress("OVERRIDE_DEPRECATION")
        override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
            if (url.startsWith("http://") || url.startsWith("https://")) {
                view.loadUrl(url)
            }
            return true
        }
    }

    // Custom WebChromeClient for JavaScript dialogs and progress
    private class CustomWebChromeClient : WebChromeClient() {
        override fun onProgressChanged(view: WebView, newProgress: Int) {
            super.onProgressChanged(view, newProgress)
            // You can add progress indicator here if needed
        }
    }
}
