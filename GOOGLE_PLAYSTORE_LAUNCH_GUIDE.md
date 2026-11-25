# 🚀 Google Play Store Launch & Mobile App Guide for Pagelle Book Covers

This comprehensive guide details everything prepared for **Pagelle Book Covers** to deploy as an Android mobile app and publish on the **Google Play Store**.

---

## 📱 What Has Been Built & Configured

### 1. App Branding & Multi-Resolution Assets
Generated directly from your uploaded high-resolution logo (`assets/app-logo.png`):
- **Google Play High-Res App Icon**: `android/playstore/icon-512.png` (512 × 512 px, 32-bit PNG)
- **Google Play Feature Graphic Banner**: `android/playstore/feature-graphic.png` (1024 × 500 px, curated banner)
- **Android Launcher Mipmaps**:
  - `mipmap-mdpi`: 48 × 48 px (`ic_launcher.png`, `ic_launcher_round.png`)
  - `mipmap-hdpi`: 72 × 72 px (`ic_launcher.png`, `ic_launcher_round.png`)
  - `mipmap-xhdpi`: 96 × 96 px (`ic_launcher.png`, `ic_launcher_round.png`)
  - `mipmap-xxhdpi`: 144 × 144 px (`ic_launcher.png`, `ic_launcher_round.png`)
  - `mipmap-xxxhdpi`: 192 × 192 px (`ic_launcher.png`, `ic_launcher_round.png`)
- **Web & PWA Icons**:
  - `assets/icons/icon-512.png` (512 × 512 px)
  - `assets/icons/icon-192.png` (192 × 192 px)
  - `assets/icons/apple-touch-icon.png` (180 × 180 px)
  - `assets/icons/favicon.png` (48 × 48 px)

---

### 2. Native Android Project (`android/`)
A complete, standalone Android Studio / Gradle project ready to build:
- **Package Name**: `com.pagelle.bookcovers`
- **Application Name**: `Pagelle Book Covers`
- **Target SDK**: `API 34` (Android 14+, required for Google Play Store compliance)
- **Minimum SDK**: `API 24` (Android 7.0+, compatible with 97%+ of active devices worldwide)
- **Modern Hardware-Accelerated WebView**:
  - Full DOM storage, local cookies, and JavaScript support.
  - Native Android Camera & Image Gallery File Chooser (`WebChromeClient.onShowFileChooser`), allowing users to upload book covers directly from their camera or photos into `add-cover.html`.
  - Offline connection detection with a branded "Connection Lost / Tap to Retry" recovery screen.
  - Pull-to-refresh (`SwipeRefreshLayout`) integrated with top-scroll detection.
  - Hardware back-button history navigation.

---

### 3. PWA & Digital Asset Links (TWA)
- **Web App Manifest**: `manifest.json` configured with standalone display mode, orientation, branding colors (`#0c0d10`), and shortcuts.
- **Service Worker**: `sw.js` with network-first caching for HTML and stale-while-revalidate for static assets.
- **Digital Asset Links**: `.well-known/assetlinks.json` enabling URL-bar-free immersive full-screen native experience.
- **Legal & Compliance Documents**:
  - `privacy.html`: Comprehensive Google Play compliant Privacy Policy.
  - `terms.html`: Terms of Service.

---

## 🛠️ Step-by-Step Instructions to Build and Publish

### Step 1: Test the App on Your Phone (Debug APK)
To test the app immediately on your Android phone:
1. Open the `android/` directory in a terminal or double-click `android/build-app.bat`.
2. Choose option **[1] Build Debug APK** (or run `gradlew.bat assembleDebug`).
3. Your installable APK will be created at:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```
4. Transfer this `.apk` file to your Android phone via USB, Google Drive, or WhatsApp, and tap to install!

---

### Step 2: Generate Your Production Release Keystore
Google Play Store requires every app bundle to be cryptographically signed with your private release key:
1. In the `android/` folder, run:
   ```powershell
   .\generate-keystore.ps1
   ```
   *(or double-click `generate-keystore.bat`)*
2. This creates `pagelle-release-key.jks` with alias `pagelle`.
3. **IMPORTANT**: Keep this `.jks` file and password in a safe backup (e.g. Google Drive or password manager). Google Play requires this key for all future updates.

---

### Step 3: Build the Android App Bundle (`.aab`) for Google Play
1. In the `android/` folder, run:
   ```cmd
   gradlew.bat bundleRelease
   ```
2. Your Google Play Store release bundle will be generated at:
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```
*(This `.aab` file is what you upload to the Google Play Console).*

---

### Step 4: Publish on Google Play Console

1. **Sign In to Google Play Console**:
   - Go to [play.google.com/console](https://play.google.com/console).
   - If you don't have an account, register for a Google Play Developer account ($25 one-time registration fee).

2. **Create New App**:
   - Click **Create app** (top right).
   - **App name**: `Pagelle: Book Covers & Gallery`
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
   - Accept declarations and click **Create app**.

3. **Fill Out Store Listing Details** (Copy-paste from `android/playstore/store-listing.txt`):
   - **Short description**: `Curate, explore, and design stunning book covers in a community archive.`
   - **Full description**: Paste the full editorial description from `android/playstore/store-listing.txt`.
   - **App Icon**: Upload `android/playstore/icon-512.png`.
   - **Feature Graphic**: Upload `android/playstore/feature-graphic.png`.
   - **Phone Screenshots**: Take 3–5 screenshots of the app on your phone (or browser emulator) and upload them.

4. **App Content & Policy Declarations**:
   - **Privacy Policy URL**: `https://pagelle-book-covers.vercel.app/privacy.html`
   - **Ads**: Select "No, my app does not contain ads".
   - **App Access**: Select "All functionality is available without special access".
   - **Content Rating**: Click "Start questionnaire" &rarr; Category: Utility/Productivity/Communication &rarr; answer No to violence/mature themes &rarr; you will receive a **PEGI 3 / Everyone** rating.
   - **Target Audience**: Select 13+ (or 18+).
   - **Data Safety**:
     - Data collected: Name, Email address, Photos/images (user cover uploads).
     - Encrypted in transit: Yes (HTTPS).
     - Account deletion request mechanism: Yes (`https://pagelle-book-covers.vercel.app/profile.html` or email).

5. **Upload Your App Bundle & Release**:
   - Go to **Production** (or **Closed testing** / **Internal testing**).
   - Click **Create new release**.
   - Click **Upload** and select your file:
     `android/app/build/outputs/bundle/release/app-release.aab`
   - Enter Release name: `1.0.0`.
   - Click **Next** &rarr; **Save and publish**.

---

## 🌐 Live Web Deployment Checklist
All web files have been updated and are ready to be pushed to GitHub/Vercel:
- `manifest.json` ✅
- `sw.js` ✅
- `.well-known/assetlinks.json` ✅
- `privacy.html` & `terms.html` ✅
- Mobile meta tags & icons linked in all HTML headers ✅
