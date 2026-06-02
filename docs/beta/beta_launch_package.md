# 📦 Beta Launch Package
**App Name:** Hisaib Kitaib (حساب کتاب)  
**Version:** Beta 1.0  
**Platform:** Android (APK) + PWA (Browser / Desktop)  
**Date:** June 2026  

---

## 1. What Is Hisaib Kitaib?

Hisaib Kitaib is a **free digital ledger and khata book app** for small businesses, dairy farmers, shopkeepers, and individuals in Pakistan.

It replaces your paper register (bahi khata) with a smart, offline-first app that works without the internet and helps you:
- Record daily income and expenses
- Track udhaar (credit given/received)
- Manage customers and suppliers
- Keep inventory
- Plan budgets and savings goals
- Export PDF reports
- Scan bank statements (JazzCash, Easypaisa)
- Use voice entry and AI assistance

---

## 2. Beta Goals

The purpose of this beta is to:

1. Find and fix bugs before the full public release
2. Collect real-world feedback from actual users
3. Test the app on different Android devices and screen sizes
4. Confirm Urdu text, dates, and currency formatting work correctly
5. Validate that Cloud Sync and AI features work reliably

---

## 3. How to Install

### Option A — Android APK (Recommended)

1. Download the APK file shared in the WhatsApp group
2. On your Android phone, go to **Settings → Security → Unknown Sources** and allow installation from unknown sources
3. Open the downloaded APK file and tap **Install**
4. Open **Hisaib Kitaib** from your app drawer

> ⚠️ Some phones (Samsung, Xiaomi, Oppo) may show a security warning — this is normal for apps not yet on the Play Store. Tap **"Install Anyway"**.

### Option B — PWA (Works in Chrome browser on any device)

1. Open Chrome on your phone and visit the app link (shared in the group)
2. You will see a banner saying **"Install Hisaib Kitaib"** — tap it
3. The app will be added to your home screen just like a real app
4. Works offline after the first visit

---

## 4. First-Time Setup

1. **Choose your language** — English, Urdu (اردو), or Roman Urdu
2. **Set your currency** — PKR is default
3. **Choose context** — Personal, Business, or Both
4. **Add your first user** — set a PIN for your account
5. **Add a few categories** — or use the defaults provided

> 💡 You can skip the Gemini AI key and Firebase sync for now — the core app works 100% offline without them.

---

## 5. Features to Test (Focus Areas)

Please test the following during the beta:

| Feature | What to Check |
|---|---|
| Add Transaction | Income, expense, correct amount, category, date |
| Udhaar (Credit) | Give udhaar, receive udhaar, check customer balance |
| Customer List | Add customer, search, view history |
| Reports | Monthly summary, bar chart, PDF export |
| Inventory | Add item, restock, check valuation |
| Goals & Budget | Set a goal, add funds, track progress |
| Cloud Sync | Enable Firebase sync, log out, log back in — data should restore |
| Voice Entry | Tap the mic, speak a transaction, confirm it was added correctly |
| Bank Statement Import | Upload a JazzCash/Easypaisa PDF or screenshot |
| Language Switch | Switch to Urdu — check RTL layout |
| Multi-User | Add a second user (cashier), log in as them |
| Backup & Restore | Export backup, reinstall app, import backup |
| Offline Mode | Turn off Wi-Fi and mobile data — app should still work |

---

## 6. Known Limitations in Beta

- **Voice categoryId**: The voice assistant may assign category 0 to some transactions — please manually correct these for now
- **Large datasets**: If you have thousands of transactions, the list may be a bit slow — pagination is on the roadmap
- **Multi-user enforcement**: Context access control for different user roles is not fully enforced in UI yet
- **Audit log viewer**: Not yet visible in the UI (data is logged internally)

---

## 7. WhatsApp Messages for Beta Testers

### 📲 Initial Invitation Message (Urdu)

```
السلام علیکم! 🙏

آپ کو Hisaib Kitaib کے beta testing group میں خوش آمدید!

Hisaib Kitaib ایک مفت digital khata book app ہے جو آپ کی روزانہ آمدنی، اخراجات، اور اُدھار کو track کرتی ہے۔

👇 APK یہاں سے download کریں:
[APK link یہاں add کریں]

📌 انسٹال کرنے کے بعد:
1. اپنی زبان choose کریں
2. ایک transaction add کریں
3. اگر کوئی مسئلہ ہو تو اس group میں بتائیں

آپ کا feedback بہت ضروری ہے — شکریہ! 🇵🇰
```

---

### 📲 Initial Invitation Message (English)

```
Assalam o Alaikum! 👋

Welcome to the Hisaib Kitaib Beta Testing Group!

Hisaib Kitaib is a FREE digital khata book app for tracking your daily income, expenses, and udhaar — designed for Pakistan's small businesses and farms.

👇 Download the APK here:
[Add APK link here]

📌 After installing:
1. Pick your language (Urdu/English)
2. Add one transaction
3. Report any issues in this group

Your feedback helps us make it better for everyone! 🇵🇰
```

---

### 📲 Feedback Request Message (after 3–5 days)

```
السلام علیکم testers! 🙏

امید ہے آپ سب Hisaib Kitaib use کر رہے ہیں۔

براہ کرم ان سوالوں کے جواب group میں share کریں:

1. App install ہوئی؟ کوئی مسئلہ؟
2. کون سا feature سب سے اچھا لگا؟
3. کیا کوئی error یا crash آیا؟
4. آپ کے phone کا model کیا ہے؟ (Samsung, Infinix, Tecno etc)
5. کوئی بھی suggestion؟

آپ کا وقت قیمتی ہے — شکریہ! 💙
```

---

### 📲 Bug Report Template (share with testers)

```
🐛 Bug Report — Hisaib Kitaib Beta

📱 Phone Model: ___________
📱 Android Version: ___________
🔁 App Version: Beta 1.0

🐛 What happened: ___________
📍 Where in the app: ___________
🔄 Steps to reproduce: ___________
📸 Screenshot (if possible): [attach]

شکریہ 🙏
```

---

### 📲 Backup Reminder Message

```
⚠️ ضروری اطلاع — Hisaib Kitaib Testers

یہ app ابھی beta میں ہے۔ کبھی کبھی updates کی وجہ سے data reset ہو سکتا ہے۔

براہ کرم ابھی backup لے لیں:
Settings → Data Management → Export Backup

یہ file اپنے WhatsApp یا Google Drive پر save کر لیں۔

آپ کا data محفوظ رہے گا 🙏
```

---

## 8. Feedback Collection Channels

| Channel | Purpose |
|---|---|
| WhatsApp Group | Primary bug reports and feedback |
| GitHub Issues | Developer-level bug tracking |
| Direct WhatsApp | Private feedback from individual testers |

---

## 9. Beta Tester Agreement

By participating in the beta, testers agree to:

1. Not share the APK publicly outside the test group
2. Report bugs honestly and with as much detail as possible
3. Understand this is pre-release software and may have bugs
4. Not use the beta for critical financial records without backups
5. Provide feedback within 2 weeks of receiving the APK

---

## 10. Beta Timeline

| Phase | Activity | Timeframe |
|---|---|---|
| Beta 1 | Internal testing (friends/family) | Week 1–2 |
| Beta 2 | Broader tester group (20–50 users) | Week 3–4 |
| RC (Release Candidate) | Final bug fixes | Week 5 |
| Public Launch | Google Play Store submission | Week 6+ |

---

*Hisaib Kitaib — آپ کا digital khata, آپ کے ہاتھ میں* 🇵🇰
