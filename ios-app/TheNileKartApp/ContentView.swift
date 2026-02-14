import SwiftUI
import WebKit

struct ContentView: View {
    @State private var webViewErrorMessage: String? = nil
    @State private var isLoading = true
    @State private var loadingStartTime: Date? = nil
    @State private var hasTimedOut = false
    
    var body: some View {
        ZStack {
            // Background
            Color.white.ignoresSafeArea()
            
            if hasTimedOut || (webViewErrorMessage != nil && !webViewErrorMessage!.isEmpty) {
                // Error UI
                VStack(spacing: 20) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.orange)
                    
                    Text("Unable to Load App")
                        .font(.headline)
                    
                    Text(webViewErrorMessage ?? "The app took too long to load. Please try again.")
                        .font(.body)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding()
                    
                    Button(action: {
                        webViewErrorMessage = nil
                        isLoading = true
                        hasTimedOut = false
                        loadingStartTime = Date()
                    }) {
                        Text("Retry")
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                    
                    Spacer()
                }
                .padding()
            } else {
                // WebView
                WebViewWrapper(
                    url: getFrontendURL(),
                    onError: { error in
                        print("❌ WebView Error: \(error)")
                        webViewErrorMessage = error
                        isLoading = false
                        hasTimedOut = false
                    },
                    onLoadFinish: {
                        print("✅ WebView finished loading successfully")
                        isLoading = false
                        hasTimedOut = false
                    }
                )
                .onAppear {
                    print("📱 ContentView appeared")
                    if loadingStartTime == nil {
                        loadingStartTime = Date()
                    }
                    // Start timeout check
                    DispatchQueue.main.asyncAfter(deadline: .now() + 15) {
                        if isLoading && !hasTimedOut {
                            print("⏱️  Loading timeout")
                            hasTimedOut = true
                            isLoading = false
                        }
                    }
                }
                
                // Loading indicator
                if isLoading {
                    VStack {
                        ProgressView()
                            .scaleEffect(1.5)
                            .padding()
                        
                        Text("Loading...")
                            .foregroundColor(.gray)
                            .font(.caption)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.white.opacity(0.8))
                }
            }
        }
    }
    
    private func getFrontendURL() -> String {
        #if DEBUG
        #if targetEnvironment(simulator)
        return "http://localhost:3000"
        #else
        return "http://40.172.190.250"
        #endif
        #else
        return "https://thenilekart.com"
        #endif
    }
}

struct WebViewWrapper: UIViewRepresentable {
    let url: String
    let onError: (String) -> Void
    let onLoadFinish: () -> Void
    
    func makeUIView(context: Context) -> WKWebView {
        print("🔧 Creating WebView with URL: \(url)")
        
        let config = WKWebViewConfiguration()
        
        // Safe JavaScript configuration
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        if #available(iOS 14.0, *) {
            config.defaultWebpagePreferences.preferredContentMode = .recommended
        }
        
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        // Add comprehensive JavaScript error handler
        let errorScript = """
        console.log('iOS: JavaScript error handler loaded');
        
        // Catch all errors
        window.onerror = function(msg, url, lineNo, columnNo, error) {
            console.error('JS Error: ' + msg + ' at ' + url + ':' + lineNo);
            try {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.iosApp) {
                    window.webkit.messageHandlers.iosApp.postMessage({
                        type: 'jsError',
                        message: msg,
                        url: url,
                        line: lineNo,
                        error: error ? error.toString() : 'No error object'
                    });
                }
            } catch(e) {
                console.error('Error sending message to iOS:', e);
            }
            return true;
        };
        
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', function(event) {
            console.error('Unhandled Promise Rejection: ' + event.reason);
            try {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.iosApp) {
                    window.webkit.messageHandlers.iosApp.postMessage({
                        type: 'jsError',
                        message: 'Unhandled Promise: ' + (event.reason || 'Unknown reason'),
                        error: event.reason ? event.reason.toString() : 'Unknown'
                    });
                }
            } catch(e) {
                console.error('Error sending unhandled rejection to iOS:', e);
            }
        });
        
        console.log('iOS: Error handlers registered successfully');
        """
        
        let errorScript2 = WKUserScript(source: errorScript, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        config.userContentController.addUserScript(errorScript2)
        
        // Add message handler
        config.userContentController.add(context.coordinator, name: "iosApp")
        
        // Create WebView with safe defaults
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.backgroundColor = .white
        webView.isOpaque = true
        
        // Disable scroll bouncing
        webView.scrollView.bounces = false
        webView.scrollView.bouncesZoom = false
        
        // Load the website
        if let url = URL(string: url) {
            print("📲 Loading URL: \(url)")
            do {
                let request = URLRequest(url: url)
                webView.load(request)
            } catch {
                print("❌ Error creating request: \(error)")
                context.coordinator.onError("Failed to create request: \(error.localizedDescription)")
            }
        } else {
            print("❌ Invalid URL: \(url)")
            context.coordinator.onError("Invalid URL configuration: \(url)")
        }
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No updates needed
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(onError: onError, onLoadFinish: onLoadFinish)
    }
    
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        let onError: (String) -> Void
        let onLoadFinish: () -> Void
        var hasReportedError = false
        
        init(onError: @escaping (String) -> Void, onLoadFinish: @escaping () -> Void) {
            self.onError = onError
            self.onLoadFinish = onLoadFinish
        }
        
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            print("📱 WebView started loading")
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("✅ WebView finished loading successfully")
            hasReportedError = false
            DispatchQueue.main.async { [weak self] in
                self?.onLoadFinish()
            }
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("⚠️  WebView failed: \(error.localizedDescription)")
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                if !self.hasReportedError {
                    self.hasReportedError = true
                    self.onError("Failed to load page: \(error.localizedDescription)")
                }
            }
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            let errorDescription = error.localizedDescription
            print("⚠️  WebView provisional navigation failed: \(errorDescription)")
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                if !self.hasReportedError {
                    self.hasReportedError = true
                    if errorDescription.lowercased().contains("timeout") {
                        self.onError("Connection timeout. Please check your internet connection and try again.")
                    } else if errorDescription.lowercased().contains("refused") {
                        self.onError("Connection refused. The server may be offline. Please try again later.")
                    } else if errorDescription.lowercased().contains("not found") {
                        self.onError("Server not found. Please check the URL configuration.")
                    } else {
                        self.onError("Network connection issue: \(errorDescription)")
                    }
                }
            }
        }
        
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            print("🔗 Navigation action: \(navigationAction.request.url?.absoluteString ?? "unknown")")
            decisionHandler(.allow)
        }
        
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            print("📨 Message from web app: \(message.body)")
            
            // Handle JS errors from the injected script
            if let dict = message.body as? [String: Any] {
                if let type = dict["type"] as? String, type == "jsError" {
                    if let errorMsg = dict["message"] as? String {
                        print("⚠️  JavaScript Error caught: \(errorMsg)")
                        // Log but don't crash - JS errors are handled
                    }
                }
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
