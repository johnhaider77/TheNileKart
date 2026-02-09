# ProGuard rules for TheNileKart Android App

# Keep the BuildConfig
-keep class com.thenilekart.BuildConfig { *; }

# Keep our application classes
-keep class com.thenilekart.** { *; }

# Keep all native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep view constructors for inflation from XML
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# Keep fragment constructors
-keep public class * extends androidx.fragment.app.Fragment

# Keep activities
-keep public class * extends android.app.Activity

# Keep services
-keep public class * extends android.app.Service

# Keep broadcast receivers
-keep public class * extends android.content.BroadcastReceiver

# Keep the main activity
-keep class com.thenilekart.MainActivity { *; }

# Keep Kotlin metadata
-keep class kotlin.Metadata { *; }

# Keep coroutines
-keep class kotlinx.coroutines.** { *; }

# Preserve line numbers for debugging
-keepattributes SourceFile,LineNumberTable

# Remove logging code
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Optimization settings
-optimizationpasses 5
-allowaccessmodification
-dontpreverify
