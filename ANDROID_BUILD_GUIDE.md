# TelemedX Patient Android App - Build Guide

This guide explains how to build and deploy the TelemedX Patient mobile app as an Android APK.

## Overview

The patient portal has been configured to run as a native Android app using Capacitor, which wraps the React web application in a native container.

## Prerequisites

Before building the Android app, ensure you have the following installed:

1. **Node.js** (v16 or higher)
2. **Java Development Kit (JDK)** 11 or higher
   - Download from: https://adoptium.net/
   - Set `JAVA_HOME` environment variable
3. **Android Studio**
   - Download from: https://developer.android.com/studio
   - During installation, ensure you install:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device (for testing)
4. **Android SDK Command-line Tools**
   - Install via Android Studio > SDK Manager > SDK Tools
5. **Gradle** (usually comes with Android Studio)

## Environment Setup

### 1. Set Environment Variables

Add these to your system environment variables:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
export JAVA_HOME=/path/to/your/jdk
```

On Windows:
```cmd
setx ANDROID_HOME "C:\Users\YourUsername\AppData\Local\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Java\jdk-11"
```

### 2. Install Dependencies

```bash
npm install
```

## Build Process

### Step 1: Build the Web App for Mobile

```bash
npm run build:mobile
```

This creates an optimized production build in the `dist` folder using the mobile-specific configuration.

### Step 2: Sync with Android Platform

```bash
npm run android:sync
```

This command:
- Copies the built web assets to the Android project
- Updates Android dependencies
- Prepares the native Android project

### Step 3: Open Android Studio

```bash
npm run android:open
```

This opens the project in Android Studio, where you can:
- Configure signing keys
- Build the APK
- Run on an emulator or physical device

## Building the APK

### Option 1: Using Android Studio (Recommended for Production)

1. Open the project in Android Studio using `npm run android:open`
2. Go to **Build > Generate Signed Bundle / APK**
3. Select **APK**
4. Create or select a keystore file:
   - If creating new: Choose location, set passwords, and fill in certificate details
   - If existing: Browse to your keystore file
5. Select build variant: **release**
6. Click **Finish**
7. The APK will be generated in: `android/app/release/app-release.apk`

### Option 2: Using Command Line (Debug Build)

For development/testing purposes, you can build a debug APK:

```bash
cd android
./gradlew assembleDebug
```

The debug APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option 3: Using Command Line (Release Build)

For a release build via command line:

```bash
cd android
./gradlew assembleRelease
```

Note: You'll need to configure signing in `android/app/build.gradle` first.

## Running on Device/Emulator

### Using npm script:

```bash
npm run android:run
```

This builds and runs the app on a connected device or emulator.

### Using Android Studio:

1. Connect an Android device with USB debugging enabled, or start an emulator
2. Click the **Run** button (green play icon) in Android Studio
3. Select your device from the dropdown

## App Configuration

### Update App Details

Edit `capacitor.config.ts` to customize:

```typescript
const config: CapacitorConfig = {
  appId: 'com.telemedx.patient',        // Unique app identifier
  appName: 'TelemedX Patient',          // App name shown to users
  webDir: 'dist',
  // ... other settings
};
```

### Update Android Manifest

Edit `android/app/src/main/AndroidManifest.xml` for Android-specific settings:
- Permissions
- App icon
- App theme
- Screen orientation

### App Icons

Replace icons in these locations:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- `android/app/src/main/res/mipmap-*/ic_launcher_round.png`

Use Android Studio's Image Asset wizard:
1. Right-click `res` folder
2. New > Image Asset
3. Follow the wizard to generate all required sizes

### Splash Screen

Configure in `capacitor.config.ts`:

```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#5B21B6',
    showSpinner: false
  }
}
```

## Environment Variables

The app uses Supabase for the backend. Ensure these are set in your `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

These will be bundled into the app during build.

## Troubleshooting

### Build Fails with "SDK location not found"

Create `android/local.properties`:
```
sdk.dir=/path/to/your/Android/Sdk
```

### Gradle Sync Issues

1. Open Android Studio
2. File > Invalidate Caches / Restart
3. Try sync again

### App Crashes on Launch

1. Check Android Logcat in Android Studio
2. Verify all environment variables are set correctly
3. Ensure you ran `npm run android:sync` after building

### White Screen on Launch

1. Open browser dev tools in the app (if debug build)
2. Check for JavaScript errors
3. Verify API endpoints are accessible
4. Check that environment variables are correctly bundled

## Testing

### Debug Build Testing

1. Build debug APK: `cd android && ./gradlew assembleDebug`
2. Install on device: `adb install app/build/outputs/apk/debug/app-debug.apk`
3. Check logs: `adb logcat`

### Production Testing

Before releasing:
1. Test on multiple Android versions (minimum API 22+)
2. Test on different screen sizes
3. Test network connectivity issues
4. Test app permissions
5. Verify all features work as expected

## Distribution

### Google Play Store

1. Create a Google Play Developer account
2. Generate a signed release APK
3. Create a new app in Play Console
4. Upload APK and fill in store listing
5. Submit for review

### Direct Distribution

1. Enable "Install from Unknown Sources" on target devices
2. Share the APK file directly
3. Users can install by opening the APK file

## Updating the App

When you make changes to the web app:

```bash
npm run build:mobile
npm run android:sync
```

Then rebuild in Android Studio or via Gradle.

## App Size Optimization

To reduce APK size:

1. Enable ProGuard/R8 in `android/app/build.gradle`:
   ```gradle
   buildTypes {
       release {
           minifyEnabled true
           proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
       }
   }
   ```

2. Enable resource shrinking
3. Use WebP images instead of PNG
4. Remove unused dependencies

## Support

For issues:
- Check Capacitor docs: https://capacitorjs.com/docs
- Check Android developer docs: https://developer.android.com
- Review Capacitor GitHub issues: https://github.com/ionic-team/capacitor

## Quick Reference

```bash
# Development workflow
npm install                  # Install dependencies
npm run build:mobile        # Build web app
npm run android:sync        # Sync to Android
npm run android:open        # Open in Android Studio
npm run android:run         # Build and run on device

# Build APKs
cd android
./gradlew assembleDebug     # Debug APK
./gradlew assembleRelease   # Release APK

# Clean build
cd android
./gradlew clean
```
