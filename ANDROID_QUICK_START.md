# Android APK Quick Start Guide

## Prerequisites (One-time Setup)

1. Install **Android Studio**: https://developer.android.com/studio
2. Install **Java JDK 11+**: https://adoptium.net/
3. Set environment variables:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export JAVA_HOME=/path/to/jdk
   ```

## Build Android APK - 3 Simple Steps

### Step 1: Build & Sync
```bash
npm run android:sync
```
This builds the patient portal and syncs it to the Android project.

### Step 2: Open in Android Studio
```bash
npm run android:open
```

### Step 3: Build APK in Android Studio
1. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Wait for build to complete
3. Find APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Alternative: Command Line Build

For debug APK:
```bash
cd android
./gradlew assembleDebug
```

For release APK (requires signing setup):
```bash
cd android
./gradlew assembleRelease
```

## Quick Commands Reference

```bash
npm run build:mobile       # Build patient portal for mobile
npm run android:sync       # Build & sync to Android
npm run android:open       # Open Android Studio
npm run android:run        # Build, sync, and run on device/emulator
```

## Installing APK on Device

1. Enable "Developer Options" on your Android device
2. Enable "USB Debugging"
3. Connect device via USB
4. Install using:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

Or simply share the APK file and install directly on the device.

## Troubleshooting

**Build fails?**
- Ensure Android Studio is installed
- Check ANDROID_HOME and JAVA_HOME are set correctly
- Run: `cd android && ./gradlew clean`

**Blank screen on launch?**
- Check `.env` file has correct Supabase credentials
- Rebuild: `npm run android:sync`

For detailed instructions, see `ANDROID_BUILD_GUIDE.md`
