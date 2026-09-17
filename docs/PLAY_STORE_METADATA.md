# Google Play Store Preparation Guide & Metadata — Aroow

This document contains everything required to complete your Google Play Console store listing, questionnaires, compliance declarations, and upload your release build.

---

## 1. App Listing Assets & Metadata

### App Title (Max 30 characters)
```text
Aroow: Minimal Puzzle Game
```
*(Alternative: `Aroow - Minimalist Maze`)*

### Short Description (Max 80 characters)
```text
Navigate sleek arrow puzzles through 500 hand-crafted & procedural zen mazes.
```
*(Length: 78 characters)*

### Full Description (Max 4000 characters)
```text
Immerse yourself in Aroow — a sleek, minimalist puzzle game that tests your logic, spatial reasoning, and foresight.

Guide your arrow through intricate geometric labyrinths, slide across turning points, dodge impassable walls, and unlock the portal to the next level. Featuring a clean dark-mode aesthetic, soothing soundscape, and tactile haptic feedback, Aroow delivers an unhurried, deeply satisfying brain-teasing experience.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ 500 CHALLENGING PUZZLE LEVELS
From introductory paths to mind-bending labyrinths, enjoy 500 fully verified levels with a mathematically calibrated difficulty curve. Every single puzzle has an optimal shortest solution waiting to be discovered.

◆ 7 PROGRESSIVE WORLDS
Journey across 7 distinct puzzle realms:
• World 1: The Beginning (Levels 1–25) — Master the core sliding mechanics
• World 2: The Lattice (Levels 26–75) — Navigate cross-grid pathways
• World 3: The Maze (Levels 76–150) — Tight corridors and precision turns
• World 4: The Nexus (Levels 151–250) — Complex intersections and route planning
• World 5: The Labyrinth (Levels 251–350) — Multi-step spatial challenges
• World 6: The Enigma (Levels 351–450) — Expert-tier spatial reasoning
• World 7: The Master Realm (Levels 451–500) — The ultimate test of logic

◆ 3-STAR MASTERY SYSTEM
Achieve perfection on every level. Earn 1, 2, or 3 stars based on your move efficiency. Replay completed levels at any time to shave moves and beat your personal best records.

◆ MINIMALIST ZEN DESIGN
No visual clutter, no distracting timers, and no overwhelming menus. Enjoy an elegant dark-mode palette (#09090C) paired with vibrant neon accents that keep your focus squarely on puzzle-solving.

◆ HAPTIC FEEDBACK & ADAPTIVE AUDIO
Feel every turn with gentle tactile vibration feedback. Relax with ambient generative tones, crisp move chimes, and subtle sound effects. Fully customizable with independent toggles for Sound, Music, and Haptics.

◆ UNHURRIED PLAY & SMART UNDO
Take your time to plan your moves. With a generous 3-life allowance per puzzle and an instant Undo system, experimentation is always encouraged.

◆ 100% OFFLINE PLAY
No internet required. Play on commutes, flights, or anywhere on the go without worrying about data usage or connectivity.

◆ FAIR & NON-INTRUSIVE AD EXPERIENCE
No intrusive popups during active puzzle-solving. Banner-free gameplay with optional rewarded hints and extra lives when you need a gentle push.

Can you conquer all 500 levels and claim all 1,500 stars? Download Aroow today and sharpen your mind!
```

---

## 2. Graphic Assets Summary

All assets have been generated and prepared inside [`resources/playstore/`](file:///resources/playstore/):

| Asset | Format | Resolution | Requirement | File Location |
| :--- | :--- | :--- | :--- | :--- |
| **App Icon** | 32-bit JPEG/PNG | 512 × 512 px | Up to 1 MB, no alpha on edges | [`resources/playstore/app_icon_512.jpg`](file:///resources/playstore/app_icon_512.jpg) |
| **Feature Graphic** | JPEG/PNG | 1024 × 500 px | Up to 15 MB, 16:9 ratio, centered text | [`resources/playstore/feature_graphic_1024x500.jpg`](file:///resources/playstore/feature_graphic_1024x500.jpg) |
| **Screenshot 1: Gameplay** | Portrait 9:16 | 1080 × 1920 px | Min 320px, Max 3840px | [`resources/playstore/screenshot_1_gameplay.jpg`](file:///resources/playstore/screenshot_1_gameplay.jpg) |
| **Screenshot 2: Worlds** | Portrait 9:16 | 1080 × 1920 px | Min 320px, Max 3840px | [`resources/playstore/screenshot_2_worlds.jpg`](file:///resources/playstore/screenshot_2_worlds.jpg) |
| **Screenshot 3: Victory** | Portrait 9:16 | 1080 × 1920 px | Min 320px, Max 3840px | [`resources/playstore/screenshot_3_victory.jpg`](file:///resources/playstore/screenshot_3_victory.jpg) |

---

## 3. Store Categorization & Contact Details

- **Application Type:** Game
- **Category:** Puzzle
- **Tags:** Puzzle, Brain Teaser, Minimalist, Offline, Casual, Single Player, Logic
- **Contact Email:** `support@aroowgame.com` (or your developer email)
- **Privacy Policy URL:** `https://yourdomain.com/privacy-policy.html` (or host [`public/privacy-policy.html`](file:///public/privacy-policy.html) on GitHub Pages / Vercel)

---

## 4. Google Play Console Declarations

### A. Ads Declaration (Google Play Policy Compliance)
> **Google Play Question:** *Does your app contain advertisements?*
- **Select:** **Yes, my app contains ads**
- **Details:** The app integrates Google Mobile Ads SDK (AdMob) to show interstitial ads at natural level-completion transitions (governed by a frequency controller with a 2-minute cooldown and a minimum of 3 levels between ads) and optional rewarded ads (for hints and revives).
- **Compliance:** Ads are never displayed during active puzzle manipulation, at level start, or immediately on cold launch.

### B. Content Rating Questionnaire (IARC)
When completing the IARC questionnaire in Play Console:
1. **Category:** Game
2. **Violence:** No
3. **Fear / Horror:** No
4. **Sexuality / Nudity:** No
5. **Simulated Gambling / Real Gambling:** No
6. **Language / Profanity:** No
7. **Controlled Substances:** No
8. **User Interaction / Chat / Location Sharing:** No
9. **Resulting Expected Rating:** **PEGI 3 / ESRB Everyone / USK 0 / ACB G**

### C. Data Safety Form Responses
Google Play requires declaring data collection:

| Section | Question | Answer |
| :--- | :--- | :--- |
| **Data Collection** | Does your app collect or share user data? | **Yes** (via Google AdMob SDK) |
| **Encryption** | Is all data encrypted in transit? | **Yes** (all SDK network calls use HTTPS/TLS) |
| **Deletion Request** | Can users request data deletion? | **Yes** (users can clear all data directly in app Settings) |
| **Device or other IDs** | Advertising ID / Device IDs | **Collected** by AdMob for Advertising & Analytics purposes. Not linked to user identity. |
| **Personal Info** | Name, email, phone, address, etc. | **None collected** |
| **Financial Info** | Payment info, credit card, etc. | **None collected** |
| **Location** | Precise or approximate GPS location | **None collected** |
| **Photos / Files** | Camera, Photos, Audio, Storage | **None collected** |

### D. Target Audience & Content
- **Target Age Group:** 13 and older (or select "13–15, 16–17, 18 and over").
- **App Appeal to Children:** "Could your store listing appeal to children unintentionally?" → Select **No** (minimalist geometric puzzle design).

---

## 5. Building & Signing the Release AAB (Android App Bundle)

Google Play requires the **Android App Bundle (.aab)** format for new app submissions.

### Step 1: Generate Release Keystore (One-Time)
Run this command in PowerShell or terminal to generate your release keystore:
```powershell
keytool -genkey -v -keystore aroow-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias aroow-key
```
*(Keep this file and your passwords in a safe, backed-up location!)*

### Step 2: Configure Signing in `android/app/build.gradle`
Add signing config to `android/app/build.gradle`:
```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file("../../aroow-release-key.jks")
            storePassword "YOUR_KEYSTORE_PASSWORD"
            keyAlias "aroow-key"
            keyPassword "YOUR_KEY_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Build the Production AAB
Run from the project root:
```bash
# 1. Build and sync web bundle to Android
npm run android:sync

# 2. Build the signed release bundle using Gradle
cd android
./gradlew bundleRelease
```

The compiled release bundle will be located at:
```text
android/app/build/outputs/bundle/release/app-release.aab
```

### Step 4: Upload to Google Play Console
1. Navigate to [Google Play Console](https://play.google.com/console).
2. Create new app: **Aroow** (Free, Game).
3. Go to **Grow > Store presence > Main store listing** and paste the metadata from Section 1 above.
4. Upload the icon, feature graphic, and screenshots from `resources/playstore/`.
5. Complete **Policy > App content** (Privacy Policy, Ads, Content Rating, Data Safety, Target Audience).
6. Go to **Release > Production** (or **Closed testing**), create a new release, and upload `app-release.aab`.
