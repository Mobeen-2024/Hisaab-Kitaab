# 🔒 Privacy Policy & Data Safety
**App Name:** Hisaib Kitaib (حساب کتاب)  
**Version:** Beta 1.0  
**Last Updated:** June 2026  
**Package ID:** com.hisaabkitaab.app  
**Developer:** M. Mobeen  

---

## 1. Overview

Hisaib Kitaib is a personal and business ledger (khata) app built for small businesses, shopkeepers, dairy farmers, and individuals in Pakistan. It is designed to work **offline-first**, meaning your data lives on your own device.

This document explains:
- What data we collect
- How we use it
- What we **never** do with your data
- How to delete your data

---

## 2. Data We Collect

### 2.1 Data Stored On Your Device (Local)
All of the following is stored locally on your phone/tablet using IndexedDB. **It never leaves your device unless you turn on Cloud Sync.**

| Data Type | Purpose |
|---|---|
| Transactions (income/expense) | Core bookkeeping |
| Customers & Suppliers | Udhaar / khata tracking |
| Udhaar entries (credit/debt) | Balance management |
| Categories | Organizing transactions |
| Inventory items | Stock tracking |
| Goals & Budgets | Financial planning |
| App Users & PINs | Multi-user access |
| Chat messages | AI assistant history |
| App settings | Language, currency, context |

> **Your financial data is your own. It stays on your device by default.**

### 2.2 Data Collected via Cloud Sync (Optional)
If you choose to enable **Firebase Cloud Sync** from Settings, the following data is uploaded to Firebase Firestore:

- Transactions, customers, udhaar entries, categories, inventory, goals, budgets, settings
- A Firebase user account (email + password) is created to tie data to your account

**What is NOT synced even with Cloud Sync on:**
- Your PINs (passcodeHash/passcodeSalt) — these are device-only secrets
- Your Gemini AI API key — this is stripped before sync

### 2.3 AI Features (Optional)
If you use the **AI Assistant**, **Voice Entry**, or **Smart Document Import** features:

- Text input you send to the AI is transmitted to **Google Gemini API** for processing
- Audio recordings for voice entry are sent to Gemini for transcription
- Images/PDFs for document parsing are sent to Gemini for text extraction
- These are **not stored by us** — Google's own privacy policy applies to Gemini API usage
- See: [Google Gemini API Privacy](https://ai.google.dev/gemini-api/terms)

---

## 3. Data We Do NOT Collect

We do **not** collect, track, or sell:

- ❌ Your name, phone number, or CNIC
- ❌ Your location
- ❌ Device fingerprints or advertising IDs
- ❌ Crash analytics or usage analytics (no third-party analytics SDK)
- ❌ Contacts from your phonebook
- ❌ SMS or call logs

---

## 4. Permissions Used by the App

| Permission | Why It's Needed |
|---|---|
| Camera | QR code scanning for quick entry |
| Microphone | Voice assistant for hands-free transaction entry |
| Internet | Cloud Sync (optional) + AI features (optional) |
| Storage (Android) | Export PDF/CSV reports and backups |

---

## 5. Firebase & Google Services

If Cloud Sync is enabled:
- Data is stored in **Firebase Firestore** (Google Cloud)
- Authentication is via **Firebase Auth** (email/password)
- Firebase is subject to [Google's Privacy Policy](https://policies.google.com/privacy)
- Data is stored in Google's cloud servers — location depends on your Firebase project region

---

## 6. Data Security

- PINs are hashed using **PBKDF2** (industry-standard key derivation) — plain PINs are never stored
- Local data is protected by your device's own security (screen lock, encryption)
- Firestore Security Rules ensure only authenticated users can read/write their own data
- The Gemini API key you enter in Settings is stored locally only and is never synced to cloud

---

## 7. Children's Privacy

Hisaib Kitaib is intended for adults managing finances. We do not knowingly collect data from users under the age of 13.

---

## 8. How to Delete Your Data

### Delete All Local Data
1. Open the app → **Settings** → **Data Management**
2. Tap **"Factory Reset"** or **"Delete All Data"**
3. All local IndexedDB data will be permanently erased

### Delete Your Cloud Account & Data
1. Open the app → **Settings** → **Cloud Sync**
2. Sign out and delete your Firebase account
3. Contact us at the email below to request full Firestore data deletion

### Uninstall
Simply uninstalling the app from your Android device removes all local data automatically.

---

## 9. Beta Testing Notice

> ⚠️ **This is a BETA version of Hisaib Kitaib.**
>
> During beta testing:
> - The app may have bugs that could cause data loss
> - **We strongly recommend exporting a backup regularly:**  
>   Settings → Data Management → Export Backup
> - Do not use this version for critical financial records without maintaining external backups
> - Beta data may not be compatible with future versions

---

## 10. Contact Us

For privacy concerns, data deletion requests, or questions:

**Developer:** M. Mobeen  
**App:** Hisaib Kitaib (com.hisaabkitaab.app)  
**Channel:** WhatsApp Beta Group (see beta_launch_package.md)

---

## 11. Changes to This Policy

We may update this Privacy Policy as the app develops. The latest version will always be available in the `docs/beta/` folder of the repository and within the app's Settings screen.

---

*Hisaib Kitaib — Digitizing the traditional Khata for Pakistan* 🇵🇰
