<div align="center">

# 📒 Hisaib Kitaib (حساب کتاب)

**The Modern Digital Ledger & Business Management System**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Google Gemini](https://img.shields.io/badge/Google_GenAI-1.29-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![PWA](https://img.shields.io/badge/PWA-Workbox-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](#-pwa-support)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](#-native-android-apk)

*Digitizing the traditional "Khata" for individuals and micro-businesses — bringing modern financial tools to everyone.*

</div>

<br />

> **Hisaib Kitaib** is a localized, offline-first financial and business management PWA built for small businesses and individuals. Replace your paper ledgers with a robust system offering multi-user support, offline-first IndexedDB storage, AI-assisted analytics, cloud sync, QR scanning, PDF export, OCR statement import, and much more.

---

## ✨ Features

| Feature | Description |
| :--- | :--- |
| 📓 **Udhaar (Credit) Management** | Track customer credit, supplier debt, advance payments, and outstanding balances. Per-customer detail views with transaction history. |
| 📊 **Transactions & Analytics** | Log incomes, expenses, and investments. Visual charts via Recharts, summary cards, and filterable transaction lists. |
| 📦 **Inventory Management** | Track stock items and inventory valuation alongside your finances. |
| 🎯 **Goals & Budget Planner** | Set monthly budgets per category and track savings goals. |
| 🎙️ **Live Voice Assistant** | Hands-free global voice automation powered by **Gemini 3.1 Flash**. Dictate and add transactions seamlessly from anywhere in the app with real-time streaming feedback. |
| 🤖 **Smart Document Ingestion** | Extract transactions instantly from PDFs, Receipts (Images), and CSVs using Gemini Vision. Features robust offline fallback parsers for JazzCash and Easypaisa statements. |
| 🧠 **AI Financial Insights** | Chat with a smart assistant to analyze spending patterns, track business health, and perform complex queries directly on your local IndexedDB data. |
| 📄 **PDF Export** | Export reports, statements, and ledger summaries to PDF using **jsPDF** + **jspdf-autotable**. |
| 📷 **QR Code Scanner** | Scan QR codes to populate transaction data instantly using **jsQR**. |
| 🔔 **Reminders & Notifications** | In-app reminder system for dues and upcoming payments. |
| 🔍 **Global Search** | Instant full-text search across customers, transactions, and inventory. |
| 📅 **Transaction Calendar** | Visual calendar view of daily cash flow at a glance. |
| 📈 **Business Health / Intelligence** | High-level KPI dashboard with revenue trends, customer retention cards, and smart insights. |
| ⚡ **Quick Entry** | Fast bottom-sheet entry for common transactions without opening full forms. |
| 👥 **Multi-User & Role Access** | Share with family or employees. Individual PINs and Personal vs Business context isolation. |
| ☁️ **Firebase Cloud Sync** | Optional real-time cloud backup and sync via **Firebase Firestore**. |
| 📶 **Offline-First Storage** | All data stored locally in **Dexie.js (IndexedDB)**. Works fully without internet. |
| 🌐 **Multi-Language Support** | Seamless switching between English, Urdu (اردو), and Roman Urdu with full RTL layout support. |
| 📱 **PWA Install Banner** | Custom in-app install prompt with bilingual UI. Detects `beforeinstallprompt` and shows a branded install card. |
| 🌍 **Offline Status Indicator** | Animated pill badge when the device goes offline — powered by `useOnlineStatus()` hook. |

<br />

## 🛠️ Tech Stack

<div align="center">

`Frontend` <br/> **React 19** • **React Router v7** • **Vite 6** • **TypeScript 5.8**

<br/>

`State & Data` <br/> **Zustand** (client state) • **Dexie.js v4** (IndexedDB) • **dexie-react-hooks** (live queries) • **Zod** (schema validation)

<br/>

`Styling & Animation` <br/> **Tailwind CSS v4** • **Motion (Framer Motion v12)** • **Lucide React** • **Glassmorphism Design**

<br/>

`AI & Intelligence` <br/> **@google/genai v1.29** (Gemini 3.1 Flash) • **Live WebRTC Audio** • **Tesseract.js** (OCR) • **PDF.js** (PDF parsing)

<br/>

`Cloud & Auth` <br/> **Firebase v12** (Firestore + Auth + Storage) • **Firestore Security Rules**

<br/>

`Charts & Reports` <br/> **Recharts v3** • **jsPDF v4** • **jspdf-autotable v5**

<br/>

`3D & Visual` <br/> **Three.js** • **@react-three/fiber** • **@react-three/drei** (3D Splash Screen)

<br/>

`PWA` <br/> **vite-plugin-pwa v1.3** • **Workbox** (precaching + runtime caching) • **Web App Manifest**

<br/>

`Native` <br/> **Capacitor 8** (Android APK) • **jsQR** (QR Scanner)

</div>

<br />

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **v18 or higher**
- A Google Gemini API key *(optional — only needed for AI features)*
- A Firebase project *(optional — only needed for cloud sync)*

### Setup

**1. Clone & Install**

```bash
git clone https://github.com/your-username/hisaab-kitaab.git
cd hisaab-kitaab
npm install
```

**2. Configure Environment**

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required for AI Assistant & Smart Insights
GEMINI_API_KEY=your_gemini_api_key_here

# Required for Firebase Cloud Sync (optional)
APP_URL=http://localhost:3000
```

> 💡 You can also enter the Gemini API key directly inside the App's **Settings → AI Configuration** UI — no `.env` file required for basic usage.

**3. Launch Dev Server**

```bash
npm run dev
```

Opens at **[http://localhost:3000](http://localhost:3000)** (or the port provided by Vite).

<br />

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the Vite development server on port 3000 (LAN accessible) |
| `npm run build` | Compile a production bundle + generate PWA service worker |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run TypeScript type-checking (`tsc --noEmit`) |
| `npm run sync` | Sync built web assets to the Android Capacitor project |
| `npm run clean` | Delete the `dist/` output folder |

<br />

## 📱 PWA Support

Hisaib Kitaib is a fully compliant **Progressive Web App** powered by `vite-plugin-pwa` and **Workbox**.

- ✅ **Service Worker** auto-generated on every production build (`dist/sw.js`)
- ✅ **Precaching** — all JS, CSS, HTML, images, fonts, and assets cached on install
- ✅ **Runtime caching** — Google Fonts (1 year, CacheFirst) and GitHub raw assets (30 days)
- ✅ **Auto-update** — new SW activates automatically when a new build is detected
- ✅ **Install prompt** — custom in-app `PWAInstallBanner` with bilingual English/Urdu UI
- ✅ **Offline indicator** — animated badge appears when the device goes offline
- ✅ **Full manifest** — `public/manifest.json` with `id`, `scope`, `screenshots`, `categories`, `orientation`, and `lang` fields

**To install:** open the app in Chrome/Edge on desktop or Android, then tap **"Install Hisaib Kitaib"** in the banner, or use the browser's install option.

<br />

## 📱 Native Android APK

Hisaib Kitaib is configured with **Capacitor 8** to build a native Android APK.

**1. Generate Icons & Splash Screens**

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate
```

**2. Build & Sync**

```bash
npm run build
npm run sync        # equivalent to: npx cap sync android
```

**3. Build the APK**

Use the one-click batch script:

```bash
.\build_apk.bat
```

Or manually via Gradle:

```bash
cd android
.\gradlew assembleDebug
```

The compiled APK is output to:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

<br />

## 📁 Project Structure

```
hisaab-kitaab/
├── public/                  # Static assets & PWA manifest
│   └── manifest.json        # Web App Manifest (PWA)
├── src/
│   ├── components/          # UI components (pages, modals, charts)
│   │   ├── ui/              # Base components (Button, Input, Modal, Label)
│   │   ├── common/          # Shared helpers (PageLoader, ErrorScreen)
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── SmartAssistant/  # AI chat interface
│   │   ├── QuickEntry/      # Fast transaction entry
│   │   ├── ImportStatement/ # CSV/PDF statement importer
│   │   └── Settings/        # App settings & data management
│   ├── contexts/            # React Context providers (Settings, Toast, CloudAuth)
│   ├── hooks/               # Custom hooks (usePWA, useOnlineStatus, etc.)
│   ├── layouts/             # App shell layout (MainLayout)
│   ├── lib/                 # i18n strings, utilities
│   ├── models/              # TypeScript data models & types
│   ├── services/            # Firebase sync, AI service, PDF service
│   ├── utils/               # Pure helper functions
│   ├── db.ts                # Dexie IndexedDB schema & database instance
│   ├── App.tsx              # Root router & providers
│   ├── main.tsx             # Entry point (SW registration, React root)
│   └── index.css            # Global styles & Tailwind v4 theme tokens
├── android/                 # Capacitor Android project
├── .env.example             # Environment variable template
├── capacitor.config.ts      # Capacitor configuration
├── vite.config.ts           # Vite + PWA plugin + build chunking config
└── firestore.rules          # Firebase security rules
```

<br />

## 📄 License

This project is licensed under the **MIT License**. See the [`LICENSE.txt`](LICENSE.txt) file for details.  
Copyright &copy; 2025 **M. Mobeen**

---

<div align="center">
  <p>Built with ❤️ for small businesses everywhere</p>
</div>
