# Mobile App Build Guide

This guide will help you convert your React chat app into a mobile app that can be installed on Android phones.

## Prerequisites

### 1. Install Android Studio
- Download and install [Android Studio](https://developer.android.com/studio)
- During installation, make sure to install:
  - Android SDK
  - Android SDK Platform
  - Android Virtual Device
  - Android SDK Build-Tools

### 2. Set up Environment Variables
Add these to your system environment variables:
```
ANDROID_HOME = C:\Users\[YourUsername]\AppData\Local\Android\Sdk
JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
```

Add to PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

### 3. Install Java Development Kit (JDK)
- **IMPORTANT**: Install JDK 21 or higher (required for Capacitor)
- Download from: https://adoptium.net/temurin/releases/
- Make sure JAVA_HOME points to the JDK installation
- Add JDK bin folder to PATH: `%JAVA_HOME%\bin`

## Building the Mobile App

### Step 1: Update Server Configuration
Before building, update the server URL in `src/config/mobileConfig.js`:

```javascript
const getBaseURL = () => {
  if (isMobile) {
    // Replace with your actual production server URL
    return 'https://your-production-server.com';
  } else {
    return 'http://localhost:3000';
  }
};
```

### Step 2: Build the App
Run the following commands in the Frontend directory:

```bash
# Build the React app and sync with Capacitor
npm run build:mobile

# Open Android Studio to build the APK
npx cap open android
```

### Step 3: Generate APK in Android Studio
1. Android Studio will open with your project
2. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Wait for the build to complete
4. The APK will be generated in: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 4: Generate Signed APK (for distribution)
1. In Android Studio, go to **Build** → **Generate Signed Bundle / APK**
2. Choose **APK**
3. Create a new keystore or use existing one
4. Fill in the required information
5. Build the release APK

## Alternative: Command Line Build

If you prefer command line:

```bash
# Navigate to android directory
cd android

# Build debug APK
./gradlew assembleDebug

# Build release APK (requires signing)
./gradlew assembleRelease
```

## Installing on Phone

### Method 1: Direct Installation
1. Enable "Developer Options" on your Android phone
2. Enable "USB Debugging"
3. Connect phone to computer via USB
4. Run: `npx cap run android`

### Method 2: APK File Installation
1. Copy the generated APK file to your phone
2. Enable "Install from Unknown Sources" in phone settings
3. Open the APK file on your phone and install

## Important Notes

### Server Configuration
- **CRITICAL**: Update the server URL in `mobileConfig.js` to point to your production server
- The mobile app cannot connect to `localhost:5000` - it needs a real server URL
- Make sure your backend server is accessible from the internet

### Permissions
The app includes these permissions:
- Internet access
- Camera access
- Microphone access
- File storage access
- Network state access

### Features Available in Mobile App
- Real-time messaging
- Video calls (Jitsi Meet)
- File sharing
- User management
- Group chats
- Stories
- Push notifications (can be added)

## Troubleshooting

### Build Issues
- Make sure Android Studio and SDK are properly installed
- Check that environment variables are set correctly
- Try cleaning the project: `./gradlew clean`

### Connection Issues
- Verify server URL is correct and accessible
- Check that your backend server allows CORS from mobile apps
- Ensure SSL certificate is valid for HTTPS connections

### App Crashes
- Check Android Studio logs for error details
- Verify all required permissions are granted
- Test on different Android versions

## Distribution

### Google Play Store
1. Generate a signed APK
2. Create a Google Play Console account
3. Upload the APK and fill in app details
4. Submit for review

### Direct Distribution
1. Share the APK file directly
2. Users need to enable "Install from Unknown Sources"
3. Consider using a file hosting service

## Next Steps

1. **Update Server URL**: Change the placeholder URL to your actual server
2. **Test on Device**: Install and test all features
3. **Add Push Notifications**: Implement Firebase Cloud Messaging
4. **Optimize Performance**: Test and optimize for mobile devices
5. **Add App Icon**: Customize the app icon and splash screen

## Support

If you encounter issues:
1. Check the Capacitor documentation: https://capacitorjs.com/docs
2. Review Android Studio build logs
3. Test on different devices and Android versions

