import SwiftUI
import UIKit
import UserNotifications
import Firebase
import FirebaseMessaging
import os.log

// MARK: - Crash Handler
func setupCrashHandler() {
    // Set up NSSetUncaughtExceptionHandler
    NSSetUncaughtExceptionHandler { exception in
        print("🔥 UNCAUGHT EXCEPTION: \(exception.name)")
        print("🔥 Reason: \(exception.reason ?? "Unknown")")
        print("🔥 Stack trace: \(exception.callStackSymbols)")
    }
}

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

// MARK: - App Delegate
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        print("🚀 AppDelegate initializing...")
        
        // Setup crash handler
        setupCrashHandler()
        
        // Disable memory-intensive features if needed
        #if DEBUG
        #else
        URLCache.shared.memoryCapacity = 0
        URLCache.shared.diskCapacity = 0
        #endif
        
        // Request user notification permissions early but don't wait for it
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                    print("✅ User granted notification permission")
                }
            }
        }
        
        // Schedule Firebase initialization on a background thread with a long delay
        DispatchQueue.global(qos: .background).asyncAfter(deadline: .now() + 4.0) { [weak self] in
            print("🔧 Attempting Firebase initialization...")
            do {
                autoreleasepool {
                    // Only configure if not already configured
                    if FirebaseApp.app() == nil {
                        print("🔧 Configuring Firebase with GoogleService-Info.plist...")
                        FirebaseApp.configure()
                        print("🔥 Firebase configured successfully")
                        
                        // Set Messaging delegate after Firebase is configured
                        DispatchQueue.main.async { [weak self] in
                            do {
                                Messaging.messaging().delegate = PushNotificationManager.shared
                                print("✅ Messaging delegate set")
                                PushNotificationManager.shared.ensureInitialized()
                            } catch {
                                print("⚠️  Error setting messaging delegate: \(error)")
                            }
                        }
                    } else {
                        print("ℹ️  Firebase already configured")
                        DispatchQueue.main.async { [weak self] in
                            PushNotificationManager.shared.ensureInitialized()
                        }
                    }
                }
            } catch {
                print("⚠️  Firebase initialization error (non-critical): \(error)")
                DispatchQueue.main.async { [weak self] in
                    PushNotificationManager.shared.ensureInitialized()
                }
            }
        }
        
        return true
    }
    
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print("✅ Registered for remote notifications")
        DispatchQueue.global(qos: .background).async {
            do {
                Messaging.messaging().apnsToken = deviceToken
                print("✅ APNS token set")
            } catch {
                print("⚠️  Error setting APNS token: \(error)")
            }
        }
    }
    
    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("⚠️  Failed to register for remote notifications: \(error)")
    }
    
    func application(_ application: UIApplication,
                     didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                     fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        DispatchQueue.main.async {
            PushNotificationManager.shared.handleRemoteNotification(userInfo: userInfo)
            completionHandler(.newData)
        }
    }
}

// MARK: - Main App
@main
struct TheNileKartApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    init() {
        print("🚀 TheNileKart App initializing...")
        // Ensure the app is ready regardless of Firebase
        print("✅ App structure ready - UI will render now")
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear {
                    print("📱 ContentView appeared on screen")
                }
        }
    }
}

// MARK: - Push Notification Manager
class PushNotificationManager: NSObject, UNUserNotificationCenterDelegate, MessagingDelegate {
    static let shared = PushNotificationManager()
    var onNotificationReceived: ((PushNotification) -> Void)?
    private var isInitialized = false
    
    override init() {
        super.init()
        // Don't setup here - do it later on background thread
        print("✅ PushNotificationManager initialized (setup deferred)")
    }
    
    func ensureInitialized() {
        guard !isInitialized else { return }
        isInitialized = true
        
        DispatchQueue.global(qos: .background).async { [weak self] in
            self?.setupPushNotifications()
        }
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
        print("📤 Fetching FCM token from Firebase...")
        do {
            guard let messaging = try? Messaging.messaging() else {
                print("⚠️  Firebase Messaging not available")
                return
            }
            
            messaging.token { [weak self] token, error in
                if let error = error {
                    print("⚠️  Error getting FCM token (non-critical): \(error.localizedDescription)")
                    return
                }
                
                guard let token = token else {
                    print("⚠️  FCM token is nil")
                    return
                }
                
                print("✅ FCM Token retrieved successfully!")
                print("🔐 Token: \(token.prefix(50))...")
                
                UserDefaults.standard.set(token, forKey: "fcmToken")
                self?.sendTokenToBackend(token: token)
            }
        } catch {
            print("⚠️  Error accessing Firebase Messaging: \(error)")
        }
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
    
    // MARK: - Messaging Delegate Methods
    
    /// Called when FCM token is refreshed
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken else { return }
        print("🔄 FCM token refreshed!")
        print("🔐 New token: \(fcmToken.prefix(50))...")
        print("📏 Token length: \(fcmToken.count) characters")
        
        UserDefaults.standard.set(fcmToken, forKey: "fcmToken")
        sendTokenToBackend(token: fcmToken)
    }
}

// MARK: - Push Notification Model
struct PushNotification {
    let heading: String
    let message: String
    let actionType: String
    let actionData: [String: Any]
}