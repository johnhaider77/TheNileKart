import SwiftUI
import UIKit

@main
struct TheNileKartApp: App {
    // Use AppDelegate for app lifecycle and Firebase setup
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