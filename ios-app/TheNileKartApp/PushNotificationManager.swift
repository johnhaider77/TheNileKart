import UIKit
import UserNotifications

// Import Firebase optionally
import FirebaseMessaging

// MARK: - API Configuration
struct APIConfig {
    #if DEBUG
    #if targetEnvironment(simulator)
    static let baseURL = "http://localhost:5000/api"
    #else
    static let baseURL = "http://40.172.190.250:5000/api"
    #endif
    #else
    static let baseURL = "https://thenilekart.com/api"
    #endif
    
    static let registerTokenEndpoint = "\(baseURL)/push-notifications/register-token"
    static let checkTokenEndpoint = "\(baseURL)/push-notifications/check-token"
    static let sendNotificationEndpoint = "\(baseURL)/push-notifications/send"
    static let requestTimeout: TimeInterval = 30
}

/**
 * Push Notification Manager for iOS
 * Handles FCM registration, notification handling, and routing
 */
class PushNotificationManager: NSObject, UNUserNotificationCenterDelegate, MessagingDelegate {

    static let shared = PushNotificationManager()
    var onNotificationReceived: ((PushNotification) -> Void)?
    
    override init() {
        super.init()
        setupPushNotifications()
    }
    
    /**
     * Setup push notifications
     * Called from AppDelegate after Firebase is configured
     */
    func setupPushNotifications() {
        print("🔧 Setting up push notifications...")
        
    do {
        // Set notification delegate
        UNUserNotificationCenter.current().delegate = self
        
        // Request user permission for notifications with error handling
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, error in
            DispatchQueue.main.async {
                if granted {
                    print("✅ User granted notification permission")
                    UIApplication.shared.registerForRemoteNotifications()
                    
                    // Get FCM token after permission is granted
                    DispatchQueue.global(qos: .background).asyncAfter(deadline: .now() + 1.0) {
                        self?.retrieveFCMToken()
                    }
                } else if let error = error {
                    print("❌ Error requesting notification permission: \(error.localizedDescription)")
                } else {
                    print("⚠️  User denied notification permission")
                }
            }
        }
    } catch {
        print("❌ Error setting up push notifications: \(error)")
    }
    
    /**
     * Retrieve FCM token and send to backend
     * NOTE: This will use Firebase SDK when pods are installed
     */
    private func retrieveFCMToken() {
        do {
            print("📤 Fetching FCM token...")
            // TODO: Add Firebase Messaging SDK
            // For now, generate a mock token for testing
            let mockToken = UUID().uuidString.replacingOccurrences(of: "-", with: "") + UUID().uuidString.replacingOccurrences(of: "-", with: "")
            print("✅ FCM Token retrieved: \(mockToken.prefix(50))...")
            print("📏 Token length: \(mockToken.count) characters")
            
            // Store token in UserDefaults
            UserDefaults.standard.set(mockToken, forKey: "fcmToken")
            
            // Send token to backend if user is logged in (non-blocking)
            DispatchQueue.global(qos: .background).async { [weak self] in
                self?.sendTokenToBackend(token: mockToken)
            }
        } catch {
            print("❌ Error retrieving FCM token: \(error)")
        }
    }
    
    /**
     * Handle remote notification when app is in foreground
     */
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        print("📲 Notification received while app is in foreground")
        print("📦 Notification data: \(userInfo)")
        
        // Parse and handle notification
        handleRemoteNotification(userInfo: userInfo)
        
        // Show notification even when app is in foreground
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }
    
    /**
     * Handle notification tap/response
     */
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        print("🔔 User tapped notification")
        print("📦 Notification data: \(userInfo)")
        
        // Parse and handle notification
        let pushNotification = parsePushNotification(userInfo: userInfo)
        
        // Route to appropriate screen based on action type
        routeToNotificationAction(notification: pushNotification)
        
        completionHandler()
    }
    
    /**
     * Handle remote notification when app is in background
     * NOTE: Will be handled by Messaging delegate when Firebase is installed
     */
    private func messagingDidReceiveMessage(_ message: [String: Any]) {
        print("📥 Message received")
        
        // Handle notification data
        if let data = message as? [String: String] {
            handleRemoteNotification(userInfo: data)
        }
    }
    
    /**
     * FCM token refresh
     * NOTE: Will be called by Messaging delegate when Firebase is installed
     */
    private func messagingDidRefreshRegistrationToken(_ fcmToken: String) {
        print("🔄 FCM token refreshed: \(fcmToken)")
        UserDefaults.standard.set(fcmToken, forKey: "fcmToken")
        
        // Send new token to backend
        sendTokenToBackend(token: fcmToken)
    }
    
    /**
     * Parse push notification from userInfo
     */
    private func parsePushNotification(userInfo: [AnyHashable: Any]) -> PushNotification {
        let heading = userInfo["title"] as? String ?? userInfo["aps"]?[["alert"]]?[["title"]] as? String ?? "Notification"
        let message = userInfo["body"] as? String ?? userInfo["aps"]?[["alert"]]?[["body"]] as? String ?? ""
        let actionType = userInfo["actionType"] as? String ?? "home"
        
        var actionData: [String: Any] = [:]
        if let actionDataStr = userInfo["actionData"] as? String,
           let data = actionDataStr.data(using: .utf8),
           let jsonData = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            actionData = jsonData
        }
        
        return PushNotification(
            heading: heading as? String ?? "Notification",
            message: message as? String ?? "",
            actionType: actionType as? String ?? "home",
            actionData: actionData
        )
    }
    
    /**
     * Handle remote notification
     * This is called from both foreground and background contexts
     */
    func handleRemoteNotification(userInfo: [AnyHashable: Any]) {
        print("🔔 Processing remote notification...")
        let pushNotification = parsePushNotification(userInfo: userInfo)
        
        // Call callback if set
        onNotificationReceived?(pushNotification)
        
        // Store in UserDefaults for later retrieval
        if let jsonData = try? JSONSerialization.data(withJSONObject: [
            "heading": pushNotification.heading,
            "message": pushNotification.message,
            "actionType": pushNotification.actionType,
            "actionData": pushNotification.actionData
        ]) {
            UserDefaults.standard.set(jsonData, forKey: "lastReceivedNotification")
        }
    }
    
    /**
     * Route to appropriate screen based on notification action
     */
    private func routeToNotificationAction(notification: PushNotification) {
        DispatchQueue.main.async {
            // Get the main window's root view controller
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let window = windowScene.windows.first,
                  let rootViewController = window.rootViewController else {
                print("❌ Could not access root view controller")
                return
            }
            
            // Get the navigation controller
            var navController: UINavigationController?
            if let tabBarController = rootViewController as? UITabBarController {
                navController = tabBarController.selectedViewController as? UINavigationController
            } else if let nav = rootViewController as? UINavigationController {
                navController = nav
            }
            
            // Route based on action type
            switch notification.actionType.lowercased() {
            case "home":
                // Go to home screen
                if let tabBarController = rootViewController as? UITabBarController {
                    tabBarController.selectedIndex = 0
                }
                
            case "product":
                // Go to specific product
                if let productId = notification.actionData["productId"] {
                    // Create and push product detail view controller
                    if let navController = navController {
                        // Create your ProductDetailViewController here
                        // Example: navController.pushViewController(ProductDetailViewController(productId: productId), animated: true)
                    }
                }
                
            case "order":
                // Go to specific order
                if let orderId = notification.actionData["orderId"] {
                    // Create and push order detail view controller
                    if let navController = navController {
                        // Create your OrderDetailViewController here
                        // Example: navController.pushViewController(OrderDetailViewController(orderId: orderId), animated: true)
                    }
                }
                
            case "seller":
                // Go to seller dashboard
                if let tabBarController = rootViewController as? UITabBarController {
                    tabBarController.selectedIndex = 1 // Assuming dashboard is second tab
                }
                
            default:
                // Default: go to home
                if let tabBarController = rootViewController as? UITabBarController {
                    tabBarController.selectedIndex = 0
                }
            }
            
            print("✅ Routed to \(notification.actionType) screen")
        }
    }
    
    /**
     * Send FCM token to backend
     */
    private func sendTokenToBackend(token: String) {
        print("📤 Attempting to send FCM token to backend...")
        
        do {
            // Retrieve JWT token from UserDefaults or Keychain
            guard let jwtToken = UserDefaults.standard.string(forKey: "authToken") else {
                print("⚠️  No JWT token found, cannot register token yet")
                print("   Token will be sent after user logs in")
                
                // Store token for later sending after login
                UserDefaults.standard.set(token, forKey: "pendingFCMToken")
                return
            }
            
            print("✅ JWT token found, proceeding to register FCM token")
            
            let urlString = APIConfig.registerTokenEndpoint
            guard let url = URL(string: urlString) else {
                print("❌ Invalid URL: \(urlString)")
                return
            }
            
            print("🔗 Sending to: \(urlString)")
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(jwtToken)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = APIConfig.requestTimeout
            
            let body = ["deviceToken": token]
            
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            print("📝 Request body: \(body)")
            
            URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
                DispatchQueue.main.async {
                    if let error = error {
                        print("❌ Network error sending token to backend: \(error.localizedDescription)")
                        return
                    }
                    
                    guard let httpResponse = response as? HTTPURLResponse else {
                        print("❌ Invalid response type")
                        return
                    }
                    
                    print("📊 HTTP Status Code: \(httpResponse.statusCode)")
                    
                    if let data = data {
                        if let responseString = String(data: data, encoding: .utf8) {
                            print("📦 Response: \(responseString)")
                        }
                    }
                    
                    if httpResponse.statusCode == 200 {
                        print("✅ FCM token successfully registered!")
                    } else {
                        print("⚠️  Unexpected status code: \(httpResponse.statusCode)")
                    }
                }
            }.resume()
        } catch {
            print("❌ Error in sendTokenToBackend: \(error)")
        }
    }
    
    /**
     * Re-send pending FCM token after user logs in
     */
    func resendPendingTokenAfterLogin() {
        if let pendingToken = UserDefaults.standard.string(forKey: "pendingFCMToken") {
            print("🔄 Resending pending FCM token after login...")
            UserDefaults.standard.removeObject(forKey: "pendingFCMToken")
            sendTokenToBackend(token: pendingToken)
        }
    }
    
    /**
     * Get stored FCM token
     */
    func getFCMToken() -> String? {
        return UserDefaults.standard.string(forKey: "fcmToken")
    }
}

/**
 * Model for push notification data
 */
struct PushNotification {
    let heading: String
    let message: String
    let actionType: String
    let actionData: [String: Any]
}
