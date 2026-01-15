import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        NavigationView {
            WebViewWrapper(url: "http://192.168.1.137:3000")
                .navigationBarTitle("TheNileKart", displayMode: .inline)
                .navigationBarItems(
                    trailing: Button("Refresh") {
                        // Refresh functionality will be handled by WebView
                        NotificationCenter.default.post(name: NSNotification.Name("RefreshWebView"), object: nil)
                    }
                )
        }
        .navigationViewStyle(StackNavigationViewStyle()) // Forces single view on all devices
    }
}

struct WebViewWrapper: UIViewRepresentable {
    let url: String
    
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        
        // Configure WebView settings
        webView.configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        webView.configuration.allowsInlineMediaPlayback = true
        webView.configuration.mediaTypesRequiringUserActionForPlayback = []
        
        // Allow local network access
        webView.configuration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        webView.configuration.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        
        // Set up refresh notification observer
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("RefreshWebView"),
            object: nil,
            queue: .main
        ) { _ in
            webView.reload()
        }
        
        // Load the website
        if let url = URL(string: url) {
            let request = URLRequest(url: url)
            webView.load(request)
        }
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Update if needed
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            // Show loading indicator if needed
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Hide loading indicator if needed
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("WebView navigation failed: \(error.localizedDescription)")
        }
        
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            // Allow all navigation for now
            decisionHandler(.allow)
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}