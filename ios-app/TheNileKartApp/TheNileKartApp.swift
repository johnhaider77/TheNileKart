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
        
        // Disable all caching to prevent memory issues
        URLCache.shared.memoryCapacity = 0
        URLCache.shared.diskCapacity = 0
        print("✅ Cache disabled, memory optimized")
        
        // Request notification permissions on background thread (non-blocking)
        DispatchQueue.global(qos: .userInitiated).async {
            DispatchQueue.main.async {
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
                    DispatchQueue.main.async {
                        if granted {
                            print("✅ Notification permission granted")
                            UIApplication.shared.registerForRemoteNotifications()
                        } else if let error = error {
                            print("⚠️  Notification permission error: \(error.localizedDescription)")
                        }
                    }
                }
            }
        }
        
        // Schedule Firebase initialization on a background thread with a long delay
        DispatchQueue.global(qos: .background).asyncAfter(deadline: .now() + 5.0) { [weak self] in
            print("🔧 Attempting Firebase initialization...")
            
            autoreleasepool {
                do {
                    // Only configure if not already configured
                    if FirebaseApp.app() == nil {
                        // Check if GoogleService-Info.plist exists first
                        if let googleServicePath = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") {
                            print("✅ GoogleService-Info.plist found at: \(googleServicePath)")
                            print("🔧 Configuring Firebase...")
                            do {
                                FirebaseApp.configure()
                                print("🔥 Firebase configured successfully")
                            } catch {
                                print("⚠️  Firebase configuration error (non-critical): \(error)")
                                // App should still work without Firebase - continue anyway
                            }
                        } else {
                            print("⚠️  GoogleService-Info.plist not found - Firebase initialization skipped")
                            print("ℹ️  App will continue without Firebase (push notifications won't work)")
                        }
                    } else {
                        print("ℹ️  Firebase already configured")
                    }
                    
                    // Delay the delegate setup to avoid timing issues
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        do {
                            guard FirebaseApp.app() != nil else {
                                print("ℹ️  Firebase not configured - skipping messaging delegate setup")
                                // Still initialize push manager without Firebase
                                PushNotificationManager.shared.ensureInitialized()
                                return
                            }
                            Messaging.messaging().delegate = PushNotificationManager.shared
                            print("✅ Messaging delegate set")
                            PushNotificationManager.shared.ensureInitialized()
                        } catch {
                            print("⚠️  Error setting messaging delegate: \(error)")
                            // Initialize anyway without Firebase
                            PushNotificationManager.shared.ensureInitialized()
                        }
                    }
                } catch {
                    print("⚠️  Firebase initialization error (non-critical): \(error)")
                    DispatchQueue.main.async {
                        PushNotificationManager.shared.ensureInitialized()
                    }
                }
            }
        }
        
        return true
    }
    
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print("✅ Device registered for remote notifications")
        
        // Delay APNS token to ensure Firebase is initialized
        DispatchQueue.global(qos: .background).asyncAfter(deadline: .now() + 2.0) {
            do {
                guard FirebaseApp.app() != nil else {
                    print("⚠️  Firebase not ready, skipping APNS token")
                    return
                }
                Messaging.messaging().apnsToken = deviceToken
                print("✅ APNS token set successfully")
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
        print("🔧 Setting up push notifications (Firebase optional)...")
        
        do {
            // Set notification delegate
            UNUserNotificationCenter.current().delegate = self
            
            // Request user permission for notifications (non-blocking)
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, error in
                DispatchQueue.main.async {
                    if granted {
                        print("✅ User granted notification permission")
                        UIApplication.shared.registerForRemoteNotifications()
                        
                        // Try to get FCM token in background, but if it fails, it's ok
                        DispatchQueue.global(qos: .background).asyncAfter(deadline: .now() + 1.0) {
                            do {
                                // Check if Firebase is available
                                guard FirebaseApp.app() != nil else {
                                    print("⚠️  Firebase not available, skipping token retrieval")
                                    return
                                }
                                self?.retrieveFCMToken()
                            } catch {
                                print("⚠️  Error in token retrieval: \(error)")
                            }
                        }
                    } else if let error = error {
                        print("❌ Error: \(error.localizedDescription)")
                    }
                }
            }
        } catch {
            print("⚠️  Error in setupPushNotifications: \(error)")
            // Continue anyway
        }
    }
    
    private func retrieveFCMToken() {
        print("📤 Fetching FCM token from Firebase...")
        
        DispatchQueue.global(qos: .background).asyncAfter(deadline: .now() + 2.0) { [weak self] in
            do {
                // Check if Firebase app is configured
                guard FirebaseApp.app() != nil else {
                    print("⚠️  Firebase app not configured yet")
                    return
                }
                
                let messaging = Messaging.messaging()
                print("✅ Firebase Messaging instance accessed")
                
                // Use a timeout for token retrieval to prevent hanging
                var isCompleted = false
                let timeoutDeadline = DispatchTime.now() + .seconds(5)
                
                messaging.token { [weak self] token, error in
                    guard !isCompleted else { return }
                    isCompleted = true
                    
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
                    DispatchQueue.global(qos: .background).async {
                        self?.sendTokenToBackend(token: token)
                    }
                }
                
                // Force completion if timeout occurs
                DispatchQueue.global(qos: .background).asyncAfter(deadline: timeoutDeadline) {
                    if !isCompleted {
                        isCompleted = true
                        print("⏱️  FCM token request timed out after 5 seconds")
                    }
                }
            } catch {
                print("⚠️  Error accessing Firebase Messaging: \(error)")
            }
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
        
        do {
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
            request.timeoutInterval = 10.0 // 10 second timeout to prevent hanging
            
            let body = ["deviceToken": token]
            
            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
            } catch {
                print("❌ JSON error: \(error)")
                return
            }
            
            // Create a session with more aggressive timeout
            let config = URLSessionConfiguration.default
            config.timeoutIntervalForRequest = 10
            config.timeoutIntervalForResource = 15
            config.waitsForConnectivity = false
            let session = URLSession(configuration: config)
            
            let task = session.dataTask(with: request) { [weak self] data, response, error in
                defer {
                    session.invalidateAndCancel()
                }
                
                do {
                    if let error = error {
                        if (error as NSError).code == NSURLErrorTimedOut {
                            print("⏱️  Network request timed out - continuing anyway")
                        } else {
                            print("⚠️  Network error: \(error.localizedDescription)")
                        }
                        return
                    }
                    
                    if let httpResponse = response as? HTTPURLResponse {
                        print("📊 Status: \(httpResponse.statusCode)")
                        if httpResponse.statusCode == 200 {
                            print("✅ Token registered!")
                        } else {
                            print("⚠️  Unexpected status: \(httpResponse.statusCode)")
                        }
                    }
                } catch {
                    print("⚠️  Error processing response: \(error)")
                }
            }
            
            // Set a timer to cancel the task if it takes too long
            DispatchQueue.global().asyncAfter(deadline: .now() + 12.0) {
                if task.state == .running {
                    print("⏱️  Canceling token request - took too long")
                    task.cancel()
                    session.invalidateAndCancel()
                }
            }
            
            task.resume()
        } catch {
            print("⚠️  Error in sendTokenToBackend: \(error)")
        }
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
        do {
            guard let fcmToken = fcmToken else { 
                print("⚠️  FCM token is nil")
                return 
            }
            
            print("🔄 FCM token refreshed!")
            print("🔐 New token: \(fcmToken.prefix(50))...")
            print("📏 Token length: \(fcmToken.count) characters")
            
            UserDefaults.standard.set(fcmToken, forKey: "fcmToken")
            sendTokenToBackend(token: fcmToken)
        } catch {
            print("⚠️  Error in messaging delegate: \(error)")
        }
    }
}

// MARK: - Push Notification Model
struct PushNotification {
    let heading: String
    let message: String
    let actionType: String
    let actionData: [String: Any]
}