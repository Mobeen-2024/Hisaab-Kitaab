<div align="center">

# 📒 Hisaab-Kitab (حساب کتاب)

**The Modern Digital Ledger & Dairy Management System**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini_1.5-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://aistudio.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](#-pwa-support)

*Digitizing the traditional "Khata" for micro-businesses and dairy farmers in Pakistan.*

</div>

<br />

> **Hisaab-Kitab** is a localized, offline-first financial tool that brings the power of modern web technologies to the rural and micro-business economy. Say goodbye to paper registers and hello to real-time insights, AI-powered voice entries, and secure data management.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🐄 **Dairy Sales Ledger** | One-tap logging of daily milk extraction, distribution, and sales. |
| 📓 **Udhaar Management** | Track customer credit, advance payments, and outstanding balances effortlessly. |
| 🎙️ **Smart AI Assistant** | Speak your transactions! Voice-to-text entry and financial insights powered by **Google Gemini**. |
| 👥 **Multi-User Access** | Role-Based Access Control (RBAC) with specific views for Owners, Spouses, and Workers. |
| 📶 **Offline-First** | No internet? No problem. All data is securely stored locally via IndexedDB with backup capabilities. |
| 🌐 **Bilingual Support** | Native interfaces available in English, Urdu (اردو), and Roman Urdu. |

<br />

## 🛠️ Tech Stack

Hisaab-Kitab is built with a modern, high-performance web stack focused on reliability and user experience:

<div align="center">
  
  `Frontend` <br/> **React 19** • **Vite** • **TypeScript**
  <br/><br/>
  `Styling` <br/> **Tailwind CSS 4** • **Deep Aurora Glassmorphism** • **Lucide Icons**
  <br/><br/>
  `Data Layer` <br/> **Dexie.js (IndexedDB)** • **Offline-First Architecture**
  <br/><br/>
  `Intelligence` <br/> **Google Gemini 1.5 Flash (AI Studio)**
  
</div>

<br />

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) installed.

### Setup Instructions

**1. Clone & Install**
```bash
# Clone the repository (if applicable) and navigate to the folder
npm install
```

**2. Configure Environment (Optional)**
For the AI Voice Assistant and Smart Insights to work, you'll need a Google Gemini API Key.
Create a `.env` file in the root directory:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```
*(💡 Tip: You can also enter this key directly inside the App's Settings UI without using a `.env` file!)*

**3. Launch the App**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or the port provided by Vite) in your browser.

<br />

## 📱 PWA Support

Hisaab-Kitab is fully **Progressive Web App (PWA)** ready. 
You can install it directly to your mobile home screen or desktop application folder for a seamless, native-like experience—complete with offline capabilities and custom app icons.

---

<div align="center">
  <p>Built with ❤️ for the Pakistani entrepreneurial community.</p>
</div>
