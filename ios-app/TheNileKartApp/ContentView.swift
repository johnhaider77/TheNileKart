import SwiftUI
import WebKit

struct ContentView: View {
    @State private var webViewErrorMessage: String? = nil
    @State private var isLoading = true
    
    var body: some View {
        ZStack {
            // Background
            Color.white.ignoresSafeArea()
            
            if let errorMessage = webViewErrorMessage {
                // Error UI
                VStack(spacing: 20) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.orange)
                    
                    Text("Unable to Load App")
                        .font(.headline)
                    
                    Text(errorMessage)
                        .font(.body)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding()
                    
                    Button(action: {
                        webViewErrorMessage = nil
                        isLoading = true
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
                        webViewErrorMessage = error
                        isLoading = false
                    },
                    onLoadFinish: {
                        isLoading = false
                    }
                )
                
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
        do {
            let config = WKWebViewConfiguration()
            config.defaultWebpagePreferences.allowsContentJavaScript = true
            config.allowsInlineMediaPlayback = true
            config.mediaTypesRequiringUserActionForPlayback = []
            
            // Add message handler
            config.userContentController.add(context.coordinator, name: "iosApp")
            
            let webView = WKWebView(frame: .zero, configuration: config)
            webView.navigationDelegate = context.coordinator
            webView.backgroundColor = .white
            
            // Disable scroll bouncing
            webView.scrollView.bounces = false
            webView.scrollView.bouncesZoom = false
            
            // Load the website
            if let url = URL(string: url) {
                let request = URLRequest(url: url)
                webView.load(request)
            } else {
                onError("Invalid URL configuration")
            }
            
            return webView
        } catch {
            onError("Failed to initialize app: \(error.localizedDescription)")
            // Return empty webview as fallback
            return WKWebView(frame: .zero)
        }
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
        
        init(onError: @escaping (String) -> Void, onLoadFinish: @escaping () -> Void) {
            self.onError = onError
            self.onLoadFinish = onLoadFinish
        }
        
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            print("📱 WebView started loading")
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("✅ WebView finished loading")
            DispatchQueue.main.async { [weak self] in
                self?.onLoadFinish()
            }
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("⚠️  WebView failed: \(error)")
            DispatchQueue.main.async { [weak self] in
                self?.onError("Failed to load page: \(error.localizedDescription)")
            }
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            print("⚠️  WebView provisional navigation failed: \(error)")
            DispatchQueue.main.async { [weak self] in
                self?.onError("Network connection issue: \(error.localizedDescription)")
            }
        }
        
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(.allow)
        }
        
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            print("📨 Message from web app: \(message.body)")
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
