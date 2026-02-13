package com.example.thenilekart;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import androidx.appcompat.app.AppCompatActivity;
import androidx.navigation.NavController;
import androidx.navigation.Navigation;

import com.google.firebase.messaging.FirebaseMessaging;
import com.example.thenilekart.services.PushNotificationService;

import org.json.JSONObject;

/**
 * MainActivity - Handles push notification routing
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    private NavController navController;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Setup navigation
        navController = Navigation.findNavController(this, R.id.nav_host_fragment);

        // Request FCM token
        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful()) {
                        Log.w(TAG, "❌ Fetching FCM token failed", task.getException());
                        return;
                    }
                    String token = task.getResult();
                    Log.d(TAG, "✅ FCM Token obtained: " + token);
                });

        // Handle notification tap from notification center
        handleNotificationIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleNotificationIntent(intent);
    }

    /**
     * Handle notification intent and route accordingly
     */
    private void handleNotificationIntent(Intent intent) {
        if (intent == null) {
            return;
        }

        try {
            String actionType = intent.getStringExtra("notification_action_type");
            String actionDataStr = intent.getStringExtra("notification_action_data");

            Log.d(TAG, "🔔 Handling notification intent");
            Log.d(TAG, "Action Type: " + actionType);
            Log.d(TAG, "Action Data: " + actionDataStr);

            if (actionType != null) {
                JSONObject actionData = new JSONObject();
                if (actionDataStr != null) {
                    try {
                        actionData = new JSONObject(actionDataStr);
                    } catch (Exception e) {
                        Log.e(TAG, "Error parsing action data: " + e.getMessage());
                    }
                }

                // Route based on action type
                routeToNotificationAction(actionType, actionData);
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error handling notification intent: " + e.getMessage(), e);
        }
    }

    /**
     * Route to appropriate screen based on notification action
     */
    private void routeToNotificationAction(String actionType, JSONObject actionData) {
        try {
            Log.d(TAG, "📍 Routing to: " + actionType);

            switch (actionType.toLowerCase()) {
                case "home":
                    // Navigate to home fragment
                    if (navController != null) {
                        navController.navigate(R.id.homeFragment);
                    }
                    break;

                case "product":
                    // Navigate to product detail
                    if (actionData.has("productId")) {
                        int productId = actionData.getInt("productId");
                        Bundle bundle = new Bundle();
                        bundle.putInt("product_id", productId);

                        if (navController != null) {
                            navController.navigate(R.id.productDetailFragment, bundle);
                        }
                    } else if (navController != null) {
                        navController.navigate(R.id.homeFragment);
                    }
                    break;

                case "order":
                    // Navigate to order detail
                    if (actionData.has("orderId")) {
                        int orderId = actionData.getInt("orderId");
                        Bundle bundle = new Bundle();
                        bundle.putInt("order_id", orderId);

                        if (navController != null) {
                            navController.navigate(R.id.orderDetailFragment, bundle);
                        }
                    } else if (navController != null) {
                        navController.navigate(R.id.ordersFragment);
                    }
                    break;

                case "seller":
                    // Navigate to seller dashboard
                    if (navController != null) {
                        navController.navigate(R.id.sellerDashboardFragment);
                    }
                    break;

                default:
                    // Default: navigate to home
                    if (navController != null) {
                        navController.navigate(R.id.homeFragment);
                    }
                    break;
            }

            Log.d(TAG, "✅ Navigation completed");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error routing notification action: " + e.getMessage(), e);
            // Navigate to home as fallback
            if (navController != null) {
                navController.navigate(R.id.homeFragment);
            }
        }
    }

    /**
     * Get FCM token (can be called from UI)
     */
    public String getFCMToken() {
        return PushNotificationService.getFCMToken(this);
    }
}
