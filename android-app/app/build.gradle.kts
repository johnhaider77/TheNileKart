
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.thenilekart"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.thenilekart"
        minSdk = 24
        targetSdk = 35
        versionCode = 3
        versionName = "1.2"
    }

    signingConfigs {
        create("release") {
            storeFile = file("thenilekart-release.jks")
            storePassword = "thenilekart123"
            keyAlias = "thenilekart"
            keyPassword = "thenilekart123"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }

    packagingOptions {
        exclude("META-INF/proguard/androidx-*.pro")
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
}
