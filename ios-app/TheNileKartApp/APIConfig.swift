import Foundation

/**
 * API Configuration for TheNileKart iOS App
 */
struct APIConfig {
    // Production API base URL
    #if DEBUG
    // Development - Use EC2 for device, localhost for simulator
    #if targetEnvironment(simulator)
    static let baseURL = "http://localhost:5000/api"
    #else
    // Physical device - use EC2 server IP
    static let baseURL = "http://40.172.190.250:5000/api"
    #endif
    #else
    // Production
    static let baseURL = "https://thenilekart.com/api"
    #endif
    
    // API Endpoints
    static let registerTokenEndpoint = "\(baseURL)/push-notifications/register-token"
    static let checkTokenEndpoint = "\(baseURL)/push-notifications/check-token"
    static let sendNotificationEndpoint = "\(baseURL)/push-notifications/send"
    
    // Network timeout (in seconds)
    static let requestTimeout: TimeInterval = 30
    
    // Add any other API configuration here
}
