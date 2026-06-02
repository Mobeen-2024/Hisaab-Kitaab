# 🚀 Beta Release Preparation Checklist
**App Name:** Hisaib Kitaib (حساب کتاب)  
**Version:** Beta 1.0  
**Platform:** Android (APK) + PWA  
**Date:** June 2026  

---

## Overview

This document is the step-by-step checklist for preparing and distributing the Hisaib Kitaib beta build. Follow each section in order before sending the APK to testers.

---

## Phase 1 — Code Readiness ✅

### 1.1 All Tests Pass

```bash
npm run test
```

- [ ] All 16 tests pass with zero failures
- [ ] No unexpected `stderr` errors in test output
- [ ] `CustomerService`, `TransactionService`, `AppUserService`, `FirebaseSyncService` all green

### 1.2 TypeScript — No Type Errors

```bash
npm run typecheck
```

- [ ] `tsc --noEmit` exits with code 0
- [ ] No `any` type warnings that hide real bugs

### 1.3 Production Build Succeeds

```bash
npm run build
```

- [ ] Build completes without errors
- [ ] `dist/` folder is generated
- [ ] `dist/sw.js` (service worker) is present
- [ ] `dist/manifest.json` or PWA manifest is valid

### 1.4 Security Audit Check

```bash
npm audit
```

- [ ] Review all `high` and `critical` vulnerabilities
- [ ] Note: Capacitor `uuid` and `xcode` vulnerabilities are dev-only tools — not shipped in the APK
- [ ] Document any production-relevant vulnerabilities for future fix

---

## Phase 2 — App Identity Verification ✅

### 2.1 App Name Check

- [ ] `capacitor.config.ts` → `appName: 'Hisaib Kitaib'`
- [ ] `public/manifest.json` → `name` and `short_name` both say `Hisaib Kitaib`
- [ ] `android/app/src/main/res/values/strings.xml` → `app_name` = `Hisaib Kitaib`
- [ ] `index.html` `<title>` tag contains `Hisaib Kitaib`

### 2.2 Package Name (Do NOT Change)

- [ ] `capacitor.config.ts` → `appId: 'com.hisaabkitaab.app'` ← Keep this as-is
- [ ] `strings.xml` → `package_name = com.hisaabkitaab.app` ← Keep as-is
- [ ] **IMPORTANT:** Changing the package name will break existing installs and Google Play Store uploads

### 2.3 Version Numbers

- [ ] `package.json` → `version` field matches planned release (e.g., `0.1.0-beta`)
- [ ] `android/app/build.gradle` → `versionCode` and `versionName` are set correctly

---

## Phase 3 — Content & UI Review ✅

### 3.1 Branding

- [ ] App icon is correct (no placeholder icons)
- [ ] Splash screen shows `Hisaib Kitaib` and loads correctly
- [ ] No `Hisaab-Kitaab` old name visible anywhere in the UI
- [ ] No test/debug data visible on first launch

### 3.2 Language & Localization

- [ ] English UI is complete — no placeholder `[MISSING]` strings
- [ ] Urdu (اردو) RTL layout renders correctly
- [ ] Roman Urdu strings match meaning
- [ ] PKR currency symbol and date format (DD/MM/YYYY) work correctly

### 3.3 Sensitive Data Guards

- [ ] Gemini API key field shows `••••••••` (masked), not plain text
- [ ] Firebase credentials are in `firebase-applet-config.json` — not hardcoded in source
- [ ] `.env` file is in `.gitignore` and NOT committed to git
- [ ] `firebase-applet-config.json` is committed (it's safe — client-side only, Firestore rules protect data)

---

## Phase 4 — Core Feature Smoke Test ✅

Run the app manually and confirm:

### 4.1 Onboarding
- [ ] First launch shows setup/language selection
- [ ] User can create a PIN
- [ ] App context (Personal/Business) can be selected

### 4.2 Transactions
- [ ] Can add an income transaction with amount, category, and description
- [ ] Can add an expense transaction
- [ ] Transaction appears correctly in the list
- [ ] Monthly report updates after adding transactions

### 4.3 Udhaar / Khata
- [ ] Can add a customer
- [ ] Can give udhaar to a customer
- [ ] Can receive udhaar from a customer
- [ ] Customer balance is calculated correctly (positive/negative)
- [ ] WhatsApp reminder button works (opens WhatsApp with pre-filled message)

### 4.4 Reports & Export
- [ ] Monthly income/expense summary is correct
- [ ] Bar chart renders without errors
- [ ] PDF export produces a readable file
- [ ] CSV export is valid (can open in Excel/Google Sheets)

### 4.5 Settings
- [ ] Language switch works (English ↔ Urdu ↔ Roman Urdu)
- [ ] Currency change updates throughout the app
- [ ] Backup export produces a `.json` file
- [ ] Backup import restores data correctly (test with a fresh install)

---

## Phase 5 — Cloud Sync (Optional Feature) ✅

- [ ] Firebase project is configured in `firebase-applet-config.json`
- [ ] Firestore rules are deployed (`firestore.rules`)
- [ ] User can sign up with email/password via Firebase Auth
- [ ] Adding a transaction syncs to Firestore (check Firebase console)
- [ ] Signing in on a second device restores data
- [ ] Signing out clears local session without deleting local data
- [ ] Gemini API key is **NOT** synced to Firestore (verify in Firebase console)
- [ ] PIN/passcodeHash is **NOT** synced to Firestore

---

## Phase 6 — AI & Voice Features (Optional) ✅

> ⚠️ These features require a valid Gemini API key in Settings

- [ ] AI Chat assistant responds to a basic question about spending
- [ ] Voice entry records audio and transcribes a transaction correctly
- [ ] Bank statement import (JazzCash PDF or screenshot) extracts transactions
- [ ] If no API key is set, a clear error message is shown — not a crash

---

## Phase 7 — Android APK Build ✅

### 7.1 Build the APK

```bash
# Step 1: Build the web app
npm run build

# Step 2: Sync to Capacitor Android project
npm run sync

# Step 3: Build the debug APK
cd android
.\gradlew assembleDebug
```

OR use the batch script:

```bash
.\build_apk.bat
```

### 7.2 APK Output Location

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 7.3 APK Verification

- [ ] APK file size is reasonable (typically 10–30 MB for debug build)
- [ ] APK installs cleanly on a physical Android device (not just emulator)
- [ ] App name shown after install is `Hisaib Kitaib`
- [ ] Icon appears correctly in app drawer
- [ ] Splash screen loads without crash

### 7.4 Test on Multiple Devices

- [ ] Samsung (most common in Pakistan)
- [ ] Infinix / Tecno (budget segment, very common)
- [ ] Xiaomi / Redmi
- [ ] Android 10, 11, 12, 13 coverage if possible

---

## Phase 8 — PWA Verification ✅

- [ ] Open Chrome → visit the app URL
- [ ] "Install Hisaib Kitaib" banner appears
- [ ] PWA installs to home screen
- [ ] App works offline after first load (turn off Wi-Fi and test)
- [ ] Service worker version updates cleanly on new builds

---

## Phase 9 — Distribution ✅

### 9.1 Prepare the Share Package

- [ ] Rename APK to `HisaibKitaib-Beta1.0.apk` for clarity
- [ ] Upload APK to a safe link (Google Drive / WhatsApp direct)
- [ ] Prepare the WhatsApp group invitation message (see `beta_launch_package.md`)
- [ ] Prepare the backup reminder message for Day 3

### 9.2 Beta Group Setup

- [ ] Create a WhatsApp group named "Hisaib Kitaib Beta Testers"
- [ ] Add trusted testers: family, friends, small business contacts
- [ ] Pin the install instructions and APK link
- [ ] Share the Bug Report Template (see `beta_launch_package.md`)

### 9.3 Feedback Collection

- [ ] Create a simple Google Form or WhatsApp poll for structured feedback
- [ ] Set a feedback deadline (7–14 days after APK distribution)
- [ ] Assign someone to monitor the group and log bugs on GitHub

---

## Phase 10 — Safety Warnings for Testers ✅

Include the following warnings in all tester communications:

### ⚠️ Backup Warning

> This is a beta version. Data may be lost during updates.
> Before testing, and regularly during testing, please export your backup:
> **Settings → Data Management → Export Backup**
> Save this file to WhatsApp or Google Drive.

### ⚠️ AI / Voice / OCR Warning

> The AI Assistant, Voice Entry, and Bank Statement Import features send data to Google's Gemini API.
> If you are uncomfortable with this, you can use the app without enabling these features.
> The core bookkeeping (khata) works 100% without AI or internet.

### ⚠️ Cloud Sync Warning

> Cloud Sync is optional. By default, all your data stays on your device.
> If you enable Cloud Sync, your financial data (transactions, customers, etc.) will be uploaded to Firebase (Google Cloud).
> Your PIN is never uploaded. Your Gemini API key is never uploaded.

---

## Post-Beta Actions

After beta testing is complete:

- [ ] Fix all `HIGH` priority bugs from tester feedback
- [ ] Prepare release APK (signed, not debug)
- [ ] Write Google Play Store listing in English and Urdu
- [ ] Submit to Google Play Store internal track
- [ ] Update `TECHNICAL_HANDOFF.md` and `PROJECT_CONTEXT.md` with any architecture changes

---

*Hisaib Kitaib — Har dukaan, har farm, har ghar ka digital khata* 🇵🇰
