import UIKit
import UserNotifications
import Firebase
import FirebaseMessaging

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
     */
    func setupPushNotifications() {
        // Set notification delegate
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self
        
        // Request user permission for notifications
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                    print("✅ User granted notification permission")
                } else if let error = error {
                    print("❌ Error requesting notification permission: \(error.localizedDescription)")
                }
            }
        }
    }
    
    /**
     * Handle successful device token registration
     */
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure Firebase
        FirebaseApp.configure()
        
        // Get FCM token
        Messaging.messaging().token { token, error in
            if let error = error {
                print("❌ Error getting FCM token: \(error.localizedDescription)")
            } else if let token = token {
                print("✅ FCM Token: \(token)")
                UserDefaults.standard.set(token, forKey: "fcmToken")
                
                // Send token to backend if user is logged in
                self.sendTokenToBackend(token: token)
            }
        }
        
        return true
    }
    
    /**
     * Handle device token registration
     */
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        print("✅ APNS device token registered")
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
     */
    func messaging(
        _ messaging: Messaging,
        didReceiveMessage message: RemoteMessage
    ) {
        print("📥 Message received: \(message.messageID ?? "unknown")")
        
        // Handle notification data
        if let data = message.data as? [String: String] {
            handleRemoteNotification(userInfo: data)
        }
    }
    
    /**
     * FCM token refresh
     */
    func messaging(_ messaging: Messaging, didRefreshRegistrationToken fcmToken: String) {
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
     */
    private func handleRemoteNotification(userInfo: [AnyHashable: Any]) {
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
        // Retrieve JWT token from UserDefaults or Keychain
        guard let jwtToken = UserDefaults.standard.string(forKey: "authToken") else {
            print("⚠️  No JWT token found, skipping token registration")
            return
        }
        
        let urlString = "\(API_BASE_URL)/push-notifications/register-token"
        guard let url = URL(string: urlString) else {
            print("❌ Invalid URL")
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(jwtToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["deviceToken": token]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ Error sending token to backend: \(error.localizedDescription)")
            } else {
                print("✅ FCM token registered with backend")
            }
        }.resume()
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
