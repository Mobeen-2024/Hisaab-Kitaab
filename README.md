<div align="center">

# 📒 Hisaib-KItaib (حساب کتاب)

**The Modern Digital Ledger & Business Management System**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini_1.5-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://aistudio.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](#-pwa-support)

*Digitizing the traditional "Khata" for individuals and micro-businesses, providing modern financial tools to everyone.*

</div>

<br />

> **Hisaib-KItaib** is a localized, offline-first financial and business management tool that brings the power of modern web technologies to small businesses and individuals. Replace your paper ledgers with a robust system that offers multi-user support, offline storage, smart importing, and AI-assisted analytics.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 📓 **Udhaar (Credit) Management** | Track customer credit, supplier debt, advance payments, and outstanding balances effortlessly. |
| 📊 **Transactions & Analytics** | Log incomes, expenses, and investments. View visual charts, summary cards, and filterable transaction lists. |
| 📦 **Inventory Management** | Keep track of stock, items, and inventory valuation for your business right alongside your finances. |
| 🎯 **Goals & Budget Planner** | Set monthly budgets for different categories and track financial savings goals to stay on top of your financial health. |
| 🎙️ **Smart AI Assistant** | Ask an AI assistant about your financial data, or let it analyze your spending patterns using **Google Gemini**. |
| 📁 **Statement Importer** | Batch import transaction history by uploading CSV files or bank statements directly. |
| 👥 **Multi-User & Role Access** | Share the app with family or employees. Set up individual PINs and context isolation (Personal vs Business view). |
| 📶 **Offline-First Storage** | Robust offline capability using local IndexedDB (Dexie). Your data stays on your device when you don't have internet. |
| 🌐 **Multi-Language Support** | Switch seamlessly between English, Urdu (اردو), and Roman Urdu. |

<br />

## 🛠️ Tech Stack

Hisaib-KItaib is built with a modern, high-performance web stack focused on reliability and smooth user experiences:

<div align="center">
  
  `Frontend` <br/> **React 19** • **React Router** • **Vite** • **TypeScript**
  <br/><br/>
  `Architecture` <br/> **Context API (Global State)** • **Component-Based UI** • **Custom Hooks (`useData`)**
  <br/><br/>
  `Styling` <br/> **Tailwind CSS 4** • **Glassmorphism Design Patterns** • **Lucide Icons**
  <br/><br/>
  `Data Layer` <br/> **Dexie.js (IndexedDB)** • **React UseLiveQuery** • **LocalFirst Architecture**

  <br/><br/>
  `Intelligence` <br/> **Google Gemini API**
  
</div>

<br />

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) installed.

### Setup Instructions

**1. Clone & Install**

```bash
# Clone the repository and navigate to the folder
npm install
```

**2. Configure Environment (Optional)**
For the AI Voice Assistant and Smart Insights to work, you'll need a Google Gemini API Key.
Create a `.env` file in the root directory:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

*(💡 You can also enter this key directly inside the App's Settings UI!)*

**3. Launch the App**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port provided by Vite) in your browser.

<br />

## 📱 PWA Support

Hisaib-KItaib is fully **Progressive Web App (PWA)** ready.
You can install it directly to your mobile home screen or desktop application folder for a seamless, native-like experience—complete with offline capabilities and custom app icons.

## 📱 Native Android Build (APK)

Hisaib-KItaib is configured with **Capacitor** to compile into a native Android APK, complete with custom splash screens and icons.

**1. Install Capacitor Assets**
*(Used to generate your icon and splash screen)*

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate
```

**2. Build & Sync**
Compile your web assets and sync them to the Android project:

```bash
npm run build
npx cap sync android
```

**3. Generate the APK**

You can use the **One-Click Build Script** I've created to automate the entire process:

```bash
.\build_apk.bat
```

Alternatively, you can run the steps manually:

```bash
cd android
.\gradlew assembleDebug
```

*Your final compiled APK will be available in the `android/app/build/outputs/apk/debug/` folder.*

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.
Copyright &copy; 2024 **M. Mobeen**

---

<div align="center">
  <p>Built with ❤️</p>
</div>
