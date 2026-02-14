import SwiftUI
import UIKit
import UserNotifications

// MARK: - API Configuration
struct APIConfig {
    #if DEBUG
    static let baseURL = "http://localhost:5000/api"
    #else
    static let baseURL = "https://thenilekart.com/api"
    #endif
    
    static let registerTokenEndpoint = "\(baseURL)/push-notifications/register-token"
    static let checkTokenEndpoint = "\(baseURL)/push-notifications/check-token"
    static let sendNotificationEndpoint = "\(baseURL)/push-notifications/send"
    static let requestTimeout: TimeInterval = 30
}

// MARK: - App Delegate
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        print("🚀 AppDelegate initializing...")
        _ = PushNotificationManager.shared
        return true
    }
    
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print("✅ Registered for remote notifications")
    }
    
    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ Failed to register: \(error)")
    }
    
    func application(_ application: UIApplication,
                     didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                     fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        PushNotificationManager.shared.handleRemoteNotification(userInfo: userInfo)
        completionHandler(.newData)
    }
}

// MARK: - Main App
@main
struct TheNileKartApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    init() {
        print("🚀 TheNileKart App initializing...")
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

// MARK: - Push Notification Manager
class PushNotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = PushNotificationManager()
    var onNotificationReceived: ((PushNotification) -> Void)?
    
    override init() {
        super.init()
        setupPushNotifications()
    }
    
    func setupPushNotifications() {
        print("🔧 Setting up push notifications...")
        UNUserNotificationCenter.current().delegate = self
        
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, error in
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                    print("✅ User granted permission, registering for remote notifications")
                    self?.retrieveFCMToken()
                } else if let error = error {
                    print("❌ Error: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func retrieveFCMToken() {
        print("📤 Fetching FCM token...")
        let mockToken = UUID().uuidString.replacingOccurrences(of: "-", with: "") + UUID().uuidString.replacingOccurrences(of: "-", with: "")
        print("✅ FCM Token retrieved: \(mockToken.prefix(50))...")
        print("📏 Token length: \(mockToken.count) characters")
        UserDefaults.standard.set(mockToken, forKey: "fcmToken")
        sendTokenToBackend(token: mockToken)
    }
    
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let userInfo = notification.request.content.userInfo
        print("📲 Notification in foreground: \(userInfo)")
        handleRemoteNotification(userInfo: userInfo)
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }
    
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        print("🔔 Notification tapped: \(userInfo)")
        handleRemoteNotification(userInfo: userInfo)
        completionHandler()
    }
    
    private func parsePushNotification(userInfo: [AnyHashable: Any]) -> PushNotification {
        let heading = userInfo["title"] as? String ?? "Notification"
        let message = userInfo["body"] as? String ?? ""
        let actionType = userInfo["actionType"] as? String ?? "home"
        var actionData: [String: Any] = [:]
        if let actionDataStr = userInfo["actionData"] as? String,
           let data = actionDataStr.data(using: .utf8),
           let jsonData = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            actionData = jsonData
        }
        return PushNotification(heading: heading, message: message, actionType: actionType, actionData: actionData)
    }
    
    func handleRemoteNotification(userInfo: [AnyHashable: Any]) {
        print("🔔 Processing notification...")
        let pushNotification = parsePushNotification(userInfo: userInfo)
        onNotificationReceived?(pushNotification)
        if let jsonData = try? JSONSerialization.data(withJSONObject: [
            "heading": pushNotification.heading,
            "message": pushNotification.message,
            "actionType": pushNotification.actionType,
            "actionData": pushNotification.actionData
        ]) {
            UserDefaults.standard.set(jsonData, forKey: "lastReceivedNotification")
        }
    }
    
    private func sendTokenToBackend(token: String) {
        print("📤 Sending token to backend...")
        guard let jwtToken = UserDefaults.standard.string(forKey: "authToken") else {
            print("⚠️ No JWT token, storing for later...")
            UserDefaults.standard.set(token, forKey: "pendingFCMToken")
            return
        }
        let urlString = APIConfig.registerTokenEndpoint
        guard let url = URL(string: urlString) else {
            print("❌ Invalid URL")
            return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(jwtToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = APIConfig.requestTimeout
        
        let body = ["deviceToken": token]
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            print("❌ JSON error: \(error)")
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("❌ Network error: \(error)")
                    return
                }
                if let httpResponse = response as? HTTPURLResponse {
                    print("📊 Status: \(httpResponse.statusCode)")
                    if httpResponse.statusCode == 200 {
                        print("✅ Token registered!")
                    }
                }
            }
        }.resume()
    }
    
    func resendPendingTokenAfterLogin() {
        if let pendingToken = UserDefaults.standard.string(forKey: "pendingFCMToken") {
            print("🔄 Resending token after login...")
            UserDefaults.standard.removeObject(forKey: "pendingFCMToken")
            sendTokenToBackend(token: pendingToken)
        }
    }
    
    func getFCMToken() -> String? {
        return UserDefaults.standard.string(forKey: "fcmToken")
    }
}

// MARK: - Push Notification Model
struct PushNotification {
    let heading: String
    let message: String
    let actionType: String
    let actionData: [String: Any]
}