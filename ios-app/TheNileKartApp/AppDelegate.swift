import UIKit
import Firebase
import FirebaseMessaging

/**
 * App Delegate for handling app lifecycle and remote notification setup
 */
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    var window: UIWindow?
    
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        
        print("🚀 App launching...")
        
        // Configure Firebase
        FirebaseApp.configure()
        print("✅ Firebase configured")
        
        // Set messaging delegate
        Messaging.messaging().delegate = PushNotificationManager.shared
        
        // Initialize push notification manager
        _ = PushNotificationManager.shared
        print("✅ Push Notification Manager initialized")
        
        return true
    }
    
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        print("✅ Did register for remote notifications with token")
        Messaging.messaging().apnsToken = deviceToken
        print("✅ APNS token set for Messaging")
    }
    
    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("❌ Failed to register for remote notifications: \(error.localizedDescription)")
    }
    
    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("📥 App received remote notification while running")
        
        // Handle the notification
        if let remoteNotification = userInfo as? [String: Any] {
            PushNotificationManager.shared.handleRemoteNotification(userInfo: remoteNotification)
        }
        
        completionHandler(.newData)
    }
}
