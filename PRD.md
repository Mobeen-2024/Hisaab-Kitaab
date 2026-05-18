# Hisaab-Kitab حساب کتاب - Product Requirements Document (PRD) & Technical Roadmap

## 1. Executive Summary

Hisaab-Kitab (حساب کتاب) is a localized, offline-first digital ledger and dairy management system designed specifically for the Pakistani rural and micro-business economy. It aims to digitize the traditional "Khata" (register) system used by dairy farmers, shopkeepers, and micro-entrepreneurs. By providing granular tracking of complex daily transactions—such as daily milk sales, livestock feed (Wanda/Khal) expenses, and utility bills—the application solves the core problem of financial opacity, giving users clear visibility into their actual net profit ("Money Left") after operational costs.

## 2. Feature Breakdown

### A. Dairy Sales Ledger (Khata)

* **Daily Milk Entry:** One-tap logging of daily milk extraction and distribution, tracking date, session (morning/evening), customer name, quantity (liters/maunds), and price/liter.
* **Customer Credit Management:** Real-time tracking of individual customer accounts (Udhaar), recording advance payments and outstanding balances.
* **Automated Billing:** Generation of monthly or bi-weekly customer bills with one-click WhatsApp sharing.

### B. Expense & Operations Tracker

* **Agricultural/Dairy Expenses:** Dedicated categories for livestock feed (Wanda, Khal, Chara), medicine, and veterinary services.
* **Operational Costs:** Tracking of utility bills (Bijli, Sui Gas), transport/fuel, and labor (daily wages).
* **Household Integration:** Optional toggles to separate or combine business operations with personal household expenses for holistic financial tracking.

### C. Cash Flow Engine & Dashboard

* **Real-Time Net Balance:** A clear dashboard displaying 'Total Sales - Total Expenses' = 'Net Profit' (Money Left).
* **Cash in Hand vs. Receivables:** Differentiating between actual cash collected and money owed (Udhaar) by customers.
* **Daily/Monthly Summaries:** Visual breakdowns of top expense categories and trends in milk yield.

## 3. Technical Architecture & Data Model

### Architecture Strategy

* **Frontend Framework:** Vue 3 with Nuxt (as requested for scalability and modern SSR/SSG capabilities, though the current prototype is React).
* **Offline-First Data Layer:** PWA capabilities using Service Workers, combined with local SQLite/Room via capacitor/cordova for mobile devices, or IndexedDB (Dexie.js) for strictly web-based offline capabilities.
* **Synchronization:** Background Sync API to push local transactions to a cloud backend (e.g., Firebase, Supabase, or custom Node.js) once internet connectivity is restored.
* **Security & Access:** Role-Based Access Control (RBAC) supporting 'Owner' (full access) and 'Worker' (entry-only) roles.

### Data Model (JSON Schema)

```json
{
  "Users": {
    "id": "uuid",
    "phone": "string",
    "name": "string",
    "role": "owner | worker",
    "businessType": "dairy | retail"
  },
  "Customers": {
    "id": "uuid",
    "name": "string",
    "phone": "string",
    "currentBalance": "number (negative for debt)"
  },
  "Transactions": {
    "id": "uuid",
    "date": "timestamp",
    "type": "income | expense | payment",
    "amount": "number",
    "context": "business | personal",
    "categoryId": "uuid",
    "customerId": "uuid (optional)"
  },
  "DairyEntries": {
    "id": "uuid",
    "transactionId": "uuid",
    "quantityLiters": "number",
    "session": "morning | evening",
    "fatContent": "number (optional)"
  }
}
```

## 4. Localization & Accessibility Strategy

* **Bilingual Interface:** Native support for English and Roman/Script Urdu (اردو), with a toggle replacing complex accounting jargon with colloquial terms (e.g., Kharcha, Udhaar, Aamdani).
* **Voice-to-Text Integration:** Utilizing Web Speech API or local ML models to allow users to speak entries (e.g., "Ali ko 2 liter doodh diya").
* **Icon-Centric Navigation:** Heavy reliance on easily recognizable, high-contrast icons for crops, animals, milk, and cash to assist users with lower literacy levels.
* **Low-End Device Optimization:** Minimal asset footprint, aggressive caching, and avoidance of heavy animations to ensure smooth operation on budget Android devices common in rural areas.

## 5. Development Roadmap

### Phase 1: MVP (Months 1-2) "The Digital Register"

* Setup Vue/Nuxt project structure.
* Implement Dexie.js/IndexedDB for offline-first local storage.
* Build Core UI: Dashboard, Add Transaction Modal, and basic Urdu/English i18n support.
* Implement Dairy Sales logging and basic Expense tracking categories.

### Phase 2: Scaling & Communication (Months 3-4) "The Connected Ledger"

* Implement Customer Management & Udhaar tracking.
* Integrate WhatsApp API for sending receipts and monthly bill summaries.
* Implement Cloud Sync logic (Firebase or custom backend) for automated backups.
* Introduce Multi-user RBAC (Owner vs. Worker views).

### Phase 3: Advanced Analytics & AI (Months 5-6) "The Smart Munshi"

* Integrate Voice-to-Text entry parsing.
* Advanced Analytical charts (milk yield trends, profit forecasting, high-cost alerts).
* Inventory management for feed (Wanda/Khal) with low-stock warnings.
* Cross-platform mobile app packaging via Capacitor.
