import Foundation

/**
 * API Configuration for TheNileKart iOS App
 */
struct APIConfig {
    // Production API base URL
    #if DEBUG
    // Development - Use localhost for simulator, production HTTPS for physical device
    #if targetEnvironment(simulator)
    static let baseURL = "http://localhost:5000/api"
    #else
    // Physical device - use production HTTPS API (EC2 IP not reachable directly)
    static let baseURL = "https://www.thenilekart.com/api"
    #endif
    #else
    // Production
    static let baseURL = "https://www.thenilekart.com/api"
    #endif
    
    // API Endpoints
    static let registerTokenEndpoint = "\(baseURL)/push-notifications/register-token"
    static let checkTokenEndpoint = "\(baseURL)/push-notifications/check-token"
    static let sendNotificationEndpoint = "\(baseURL)/push-notifications/send"
    
    // Network timeout (in seconds)
    static let requestTimeout: TimeInterval = 30
    
    // Add any other API configuration here
}
