# ✅ Beta QA Checklist
**App Name:** Hisaib Kitaib (حساب کتاب)  
**Version:** Beta 1.0  
**QA Level:** Pre-release Beta  
**Date:** June 2026  

---

## How to Use This Checklist

- Go through each section before releasing the APK to testers
- Mark each item as:
  - `✅` — Pass
  - `❌` — Fail (note the issue)
  - `⏭️` — Skipped (with reason)
- For failed items, create a GitHub issue or note it in the bug log

---

## Section 1 — Installation & First Launch

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 1.1 | APK installs on Android 10+ | Installs without error | | |
| 1.2 | App name in app drawer | Shows "Hisaib Kitaib" | | |
| 1.3 | App icon is correct | Shows correct icon, not placeholder | | |
| 1.4 | Splash screen loads | Splash renders and transitions to home | | |
| 1.5 | First launch — language selection | Language picker appears | | |
| 1.6 | Select Urdu | UI switches to RTL Urdu | | |
| 1.7 | Select Roman Urdu | UI shows Roman Urdu | | |
| 1.8 | Select English | UI shows English correctly | | |
| 1.9 | PWA install prompt (Chrome) | "Install Hisaib Kitaib" banner appears | | |
| 1.10 | PWA installs to home screen | App icon on home screen, opens standalone | | |

---

## Section 2 — Authentication & Multi-User

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 2.1 | Create first user (Owner) | User created with PIN | | |
| 2.2 | Login with correct PIN | Access granted | | |
| 2.3 | Login with wrong PIN | Access denied, error shown | | |
| 2.4 | Add a second user (Cashier) | Second user created | | |
| 2.5 | Switch between users | Each user sees correct context | | |
| 2.6 | PIN migration (legacy plain text PIN) | Plain PIN migrated to PBKDF2 hash | | |
| 2.7 | Log out / user switch | Session cleared, login screen shown | | |

---

## Section 3 — Transactions

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 3.1 | Add income transaction | Appears in list with correct amount | | |
| 3.2 | Add expense transaction | Appears in list with correct amount | | |
| 3.3 | Add transaction with PKR amount | Formatted correctly (e.g., ₨ 5,000) | | |
| 3.4 | Add transaction with USD amount | Formatted correctly with exchange rate | | |
| 3.5 | Edit a transaction | Changes saved correctly | | |
| 3.6 | Delete a transaction | Removed from list and balance updates | | |
| 3.7 | Add transaction to Business context | Only appears in Business view | | |
| 3.8 | Add transaction to Personal context | Only appears in Personal view | | |
| 3.9 | Context switch (Business ↔ Personal) | List filters correctly | | |
| 3.10 | Search transactions | Results match search query | | |
| 3.11 | Filter by date range | Only transactions in range shown | | |
| 3.12 | Filter by category | Only matching transactions shown | | |
| 3.13 | Bulk import via CSV | Transactions imported without duplicates | | |
| 3.14 | Import with duplicate importReferenceId | Duplicate is skipped, not re-imported | | |
| 3.15 | Quick Entry (bottom sheet) | Opens fast, adds transaction correctly | | |

---

## Section 4 — Customers & Udhaar

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 4.1 | Add a customer | Appears in customer list | | |
| 4.2 | Add a supplier | Appears in list with Supplier tag | | |
| 4.3 | Give udhaar to customer | Balance increases (customer owes you) | | |
| 4.4 | Receive udhaar from supplier | Balance decreases (you owe supplier) | | |
| 4.5 | Customer with initial balance | Balance offset applied correctly | | |
| 4.6 | Mark udhaar as settled | Balance updates to reflect settlement | | |
| 4.7 | Customer balance is correct | syncBalance() returns correct total | | |
| 4.8 | View customer transaction history | Full udhaar history visible | | |
| 4.9 | Search customer by name | Correct result returned | | |
| 4.10 | WhatsApp reminder button | Opens WhatsApp with correct message | | |
| 4.11 | Edit customer details | Changes saved | | |
| 4.12 | Delete customer | Removed from list | | |

---

## Section 5 — Categories

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 5.1 | Default categories exist on first launch | Pre-seeded categories visible | | |
| 5.2 | Add custom income category | Appears in category list | | |
| 5.3 | Add custom expense category | Appears in category list | | |
| 5.4 | Business vs Personal category context | Correct categories shown per context | | |
| 5.5 | Delete a category | Removed; existing transactions unaffected | | |

---

## Section 6 — Inventory

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 6.1 | Add an inventory item | Appears in inventory list | | |
| 6.2 | Restock item | Creates linked transaction, updates stock | | |
| 6.3 | Low stock alert | Warning shown when below threshold | | |
| 6.4 | Inventory valuation | Total value calculated correctly | | |
| 6.5 | Edit inventory item | Changes saved | | |
| 6.6 | Delete inventory item | Removed from list | | |

---

## Section 7 — Goals & Budget Planner

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 7.1 | Create a savings goal | Goal appears with target amount | | |
| 7.2 | Add funds to goal | Progress bar updates | | |
| 7.3 | Goal completion | Shows 100% complete when reached | | |
| 7.4 | Create monthly budget | Budget categories set | | |
| 7.5 | Budget tracking | Spending tracked against budget | | |
| 7.6 | Over-budget warning | Alert shown when category exceeds budget | | |

---

## Section 8 — Reports & Export

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 8.1 | Monthly summary is correct | Income - Expenses = correct balance | | |
| 8.2 | Bar chart renders | Chart visible without errors | | |
| 8.3 | Calendar view | Transactions shown on correct dates | | |
| 8.4 | Export PDF | PDF generated, readable on phone | | |
| 8.5 | Export CSV | CSV opens correctly in Google Sheets | | |
| 8.6 | Business Health dashboard | KPIs show meaningful data | | |
| 8.7 | AI Insights tab | Generates insights without crashing | | |

---

## Section 9 — Cloud Sync

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 9.1 | Enable Cloud Sync (sign up) | Account created, sync starts | | |
| 9.2 | Add transaction while synced | Appears in Firebase Firestore console | | |
| 9.3 | Gemini API key NOT in Firestore | Firebase console shows no geminiApiKey field | | |
| 9.4 | PIN hash NOT in Firestore | Firebase console shows no passcodeHash field | | |
| 9.5 | Sign in on second device | Data restored from cloud | | |
| 9.6 | Offline — data still works | All features work without internet | | |
| 9.7 | Come back online | Pending sync queue drains correctly | | |
| 9.8 | Sign out | Session cleared, local data intact | | |
| 9.9 | Disable Cloud Sync | Sync stops, local data unchanged | | |

---

## Section 10 — AI, Voice & Document Import

> ⚠️ Requires a valid Gemini API key in Settings

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 10.1 | AI Assistant — basic question | Coherent answer returned | | |
| 10.2 | AI Assistant — ask about spending | Returns summary based on local data | | |
| 10.3 | Voice entry — say a transaction | Transaction added with correct amount | | |
| 10.4 | Voice entry — wrong category (known bug) | Category = 0; manually correct it | | |
| 10.5 | Bank statement — JazzCash PDF | Transactions extracted | | |
| 10.6 | Bank statement — Easypaisa screenshot | Transactions extracted via OCR | | |
| 10.7 | No API key — error shown | Clear message, not a crash | | |
| 10.8 | QR scanner — scan a QR code | Data populated in transaction form | | |

---

## Section 11 — Backup, Restore & Data Safety

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 11.1 | Export backup | `.json` file downloaded | | |
| 11.2 | Import backup | All data restored correctly | | |
| 11.3 | Import backup on fresh install | Data appears as expected | | |
| 11.4 | Import invalid file | Error shown, no crash | | |
| 11.5 | Backup does NOT contain passcode | Check exported JSON — no passcodeHash | | |
| 11.6 | Backup does NOT contain Gemini key | Check exported JSON — no geminiApiKey | | |
| 11.7 | Factory Reset / Delete All Data | All data cleared, app resets | | |

---

## Section 12 — Offline & Performance

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 12.1 | App works with no internet | All core features functional | | |
| 12.2 | Offline indicator shown | Animated badge visible when offline | | |
| 12.3 | Service worker active (PWA) | App loads from cache when offline | | |
| 12.4 | Large transaction list (100+ entries) | List scrolls smoothly | | |
| 12.5 | App cold start time | Opens within 3 seconds on mid-range phone | | |
| 12.6 | Memory usage | App doesn't crash after 10 min of use | | |

---

## Section 13 — Edge Cases & Error Handling

| # | Test | Expected Result | Status | Notes |
|---|---|---|---|---|
| 13.1 | Add transaction with amount = 0 | Rejected with validation error | | |
| 13.2 | Add transaction with negative amount | Rejected or handled correctly | | |
| 13.3 | Very long description (500 chars) | Saved and displayed without breaking layout | | |
| 13.4 | Two users with same name | Both created, no conflict | | |
| 13.5 | Delete a customer with existing udhaar | Warning shown or entries cascade correctly | | |
| 13.6 | Rotate phone mid-transaction | Form data preserved, no crash | | |
| 13.7 | App in background for 10 mins, resume | Data still visible, no crash | | |
| 13.8 | Low storage on phone (<100MB free) | Graceful error, no silent failure | | |

---

## Section 14 — Device Compatibility

| Device | Android Version | APK Installs | Basic Flow Works | Notes |
|---|---|---|---|---|
| Samsung Galaxy (A-series) | Android 13 | | | |
| Infinix Hot / Note | Android 12 | | | |
| Tecno Spark | Android 11 | | | |
| Xiaomi Redmi Note | Android 12 | | | |
| Oppo A-series | Android 11 | | | |
| Any Android 10 device | Android 10 | | | |

---

## Section 15 — Play Store Readiness (Future)

> Not required for initial beta APK, but check before Play Store submission:

- [ ] App has proper icon at all required sizes (48, 72, 96, 144, 192 dp)
- [ ] Splash screen does not violate Play Store policies
- [ ] Privacy Policy URL is accessible (required for apps accessing sensitive data)
- [ ] App description is written in English and Urdu
- [ ] App is signed with a release keystore (not debug signing)
- [ ] `minSdkVersion` is 22 or lower to reach broad Pakistan user base
- [ ] No `READ_CONTACTS` permission (we don't use it)
- [ ] No `ACCESS_FINE_LOCATION` permission (we don't use it)

---

## Bug Severity Definitions

| Priority | Definition | Action Required |
|---|---|---|
| 🔴 P0 — Critical | App crashes, data loss, financial calculation error | Fix immediately before any release |
| 🟠 P1 — High | Major feature broken, confusing UX for core flow | Fix before beta distribution |
| 🟡 P2 — Medium | Minor feature broken, workaround exists | Fix before public release |
| 🟢 P3 — Low | Cosmetic issue, typo, minor layout problem | Fix in next update cycle |

---

## QA Sign-Off

| Role | Name | Date | Status |
|---|---|---|---|
| Developer | M. Mobeen | | |
| Internal Tester 1 | | | |
| Internal Tester 2 | | | |
| Beta Ready? | | | ✅ / ❌ |

---

*Hisaib Kitaib — Test karo, feedback do, Pakistan ko digital banao* 🇵🇰
