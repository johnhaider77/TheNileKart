# The Nile Kart - iOS App

This is the iOS app for The Nile Kart e-commerce platform.

## Features

- WebView integration with the main website
- Pull-to-refresh functionality
- Navigation controls (back/forward)
- Optimized for iOS devices
- Supports both iPhone and iPad

## Setup

1. Open `TheNileKartApp.xcodeproj` in Xcode
2. Select your target device or simulator
3. Build and run the project

## Configuration

The app is configured to load the website from `http://192.168.1.137:3000`. If you need to change this URL, modify the `urlString` in `ContentView.swift`.

## Requirements

- iOS 17.0 or later
- Xcode 15.0 or later
- Swift 5.0

## App Structure

- `TheNileKartApp.swift` - Main app entry point
- `ContentView.swift` - WebView wrapper with navigation controls
- `Assets.xcassets` - App icons and assets
- `Info.plist` - App configuration and permissions

## Network Configuration

The app includes the necessary network security configurations to access HTTP resources in development mode. For production, consider using HTTPS.

## Build Notes

- Bundle Identifier: `com.thenilekart.app`
- Minimum Deployment Target: iOS 17.0
- Supports Universal deployment (iPhone and iPad)