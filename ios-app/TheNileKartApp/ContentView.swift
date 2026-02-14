import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        ZStack {
            WebViewWrapper(url: getFrontendURL())
            
            // Show loading indicator while page loads
            ProgressView()
                .scaleEffect(1.5)
                .opacity(0.7)
        }
    }
    
    private func getFrontendURL() -> String {
        #if DEBUG
        #if targetEnvironment(simulator)
        // Simulator development
        return "http://localhost:3000"
        #else
        // Physical device - use EC2 frontend
        return "http://40.172.190.250"
        #endif
        #else
        // Production
        return "https://thenilekart.com"
        #endif
    }
}

struct WebViewWrapper: UIViewRepresentable {
    let url: String
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        // Allow local network access
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        
        // Add message handler for communication with web app
        config.userContentController.add(context.coordinator, name: "iosApp")
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        
        // Disable bounce effects
        webView.scrollView.bounces = false
        webView.scrollView.bouncesZoom = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false
        
        // Disable pinch zoom gesture recognizer
        if let scrollView = webView.scrollView as UIScrollView? {
            scrollView.pinchGestureRecognizer?.isEnabled = false
        }
        
        // Load the website
        if let url = URL(string: url) {
            let request = URLRequest(url: url)
            webView.load(request)
        } else {
            print("❌ Invalid URL: \(url)")
        }
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Update if needed
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            print("📱 WebView started loading")
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("✅ WebView finished loading")
            
            // Inject JavaScript to disable zoom and pinch
            let zoomDisableScript = """
                var meta = document.createElement('meta');
                meta.name = 'viewport';
                meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
                document.head.appendChild(meta);
                
                document.addEventListener('touchmove', function(e) {
                    if (e.touches.length > 1) {
                        e.preventDefault();
                    }
                }, false);
            """
            
            webView.evaluateJavaScript(zoomDisableScript) { _, error in
                if let error = error {
                    print("Error injecting disable script: \(error.localizedDescription)")
                }
            }
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("❌ WebView navigation failed: \(error.localizedDescription)")
        }
        
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            // Allow all navigation
            decisionHandler(.allow)
        }
        
        // Handle messages from web app
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any] else {
                return
            }
            
            if let type = body["type"] as? String {
                print("📨 Received message from web app: \(type)")
                
                switch type {
                case "userLoggedIn":
                    print("🔐 User logged in detected, resending pending FCM token...")
                    PushNotificationManager.shared.resendPendingTokenAfterLogin()
                    
                default:
                    print("Unknown message type: \(type)")
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
