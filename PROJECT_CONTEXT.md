# PROJECT CONTEXT

## 1. Application Overview
| Field | Value |
|---|---|
| **App Name** | Hisaab-Kitaab (also spelled "HisaibKItaib" internally) |
| **Main Purpose** | Offline-first, AI-powered personal and business bookkeeping app designed for the Pakistani / South Asian market |
| **Target Users** | Small-business owners, shopkeepers, farmers, and individuals who need a "khata book" (ledger) equivalent on mobile or desktop |
| **Business Problem** | Replaces paper ledgers for tracking income, expenses, Udhaar (credit), inventory, and savings goals — with AI insights, voice entry, and optional Firebase cloud sync |
| **Development Stage** | Advanced beta — core features complete, AI features integrated, cloud sync live, Android build pipeline set up; some edge cases and polish still needed |

## 2. Tech Stack
| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 (with TypeScript 5.8) |
| **Build Tool** | Vite 6 with `@vitejs/plugin-react` |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite` plugin) + Vanilla CSS in `index.css` |
| **Routing** | React Router DOM v7 |
| **Local Database** | Dexie 4 (IndexedDB wrapper) with `dexie-react-hooks` for reactive live queries |
| **State Management** | Zustand 5 (for UI modal state via `useUIStore`); React Context for settings, auth, toasts, voice |
| **Schema Validation** | Zod v4 |
| **Cloud Sync** | Firebase (Firestore + Firebase Auth) via `firebase@12` |
| **AI / LLM** | Google Gemini API via `@google/genai` SDK (text, vision, and live/streaming) |
| **Charts / Exports** | Recharts 3, jsPDF + jspdf-autotable, PapaParse |
| **Native App** | Capacitor 8 (via `cap sync android`; `build_apk.bat` builds APK) |
| **PWA** | `vite-plugin-pwa` with Workbox service worker |

## 3. Folder Structure
- `src/components`: UI components organized by feature (e.g., `dashboard`, `SmartAssistant`, `ImportStatement`).
- `src/services`: Encapsulates business logic, API wrappers, and CRUD operations (e.g., `TransactionService`, `AIService`, `FirebaseSyncService`).
- `src/models`: Contains TypeScript data models and Zod schemas defining the database schema.
- `src/contexts`: React Context providers for global concerns like Settings, Theme, or CloudAuth.
- `src/hooks`: Reactive data queries via `dexie-react-hooks` and custom hooks like `useAudioRecorder`.
- `android`: Capacitor native Android project configuration.

## 4. Implemented Features
- **Core Bookkeeping**: Add/Edit/Delete transactions, Category management, Monthly Reports, PDF/CSV export, Transaction Search, Calendar View.
- **Customers & Udhaar (Khata Book)**: Add Customers/Suppliers, Udhaar tracking (give/receive), automatic balance derivation, WhatsApp reminders, supplier/customer modes.
- **Inventory**: Add/Edit items, Restock flow (creates transaction), Low stock alerts, Valuation.
- **Planner**: Monthly budget tracking, Savings/Business goals, Add funds.
- **AI Features**: AI Insights, Smart Assistant chat, Business Health dashboard, Bank statement parsing (text/PDF/image), Document Analyzer, Live Voice Assistant to record transactions.
- **Import/Export**: Bank statement import, PDF/Image OCR import, CSV import, Backup JSON Export/Import.
- **Multi-User**: User roles (owner/cashier/etc.), Context access (Personal/Business).
- **Settings & Auth**: 10 Languages with RTL support, Multiple Currencies, Firebase Auth + Cloud Sync.

## 5. Core Business Logic & Data Flow
The app follows a client-heavy, offline-first architecture. All data operations read/write to a local IndexedDB via Dexie.js (`db.ts`). Live queries via `dexie-react-hooks` auto-update the UI.
- **Sync Mechanism**: A background sync mechanism optionally mirrors local changes to Firebase Firestore. `FirebaseSyncService` listens for local changes and queues Firestore writes. `onSnapshot` listeners merge remote changes down. A transactional flag (`isSyncingDown`) prevents sync echo loops.
- **Balance Calculation**: Customer balances are entirely **derived**. They are recomputed in `CustomerService.syncBalance()` by summing `udhaarEntries` and standalone manual `transactions`. This guarantees accuracy.
- **Udhaar Flow**: Adding Udhaar atomically creates an `UdhaarEntry` and a paired `Transaction`, cross-linked via `transactionId`.
- **Context Isolation**: Every major entity is tagged with `context: 'personal' | 'business'`. Queries respect the active context.

## 6. Known Issues / Priorities
1. **Firestore Rules Missing**: `goals`, `budgets`, `messages`, and `auditLogs` fall through the `firestore.rules` and silently fail to sync.
2. **Voice Transaction `categoryId`**: `add_transaction` voice tool sets `categoryId: 0` which needs to be replaced by a valid category lookup.
3. **Multi-User Enforcement**: `AppUser.contextAccess` is defined but not enforced strictly at the UI layer.
4. **Pagination**: No pagination exists for large transaction lists, which may impact performance over time.
5. **Passcode Storage**: Passcodes are currently stored as plain text in IndexedDB.

---

## Agent Instructions
- Always read this file before working.
- Always read AGENT_RULES.md before working.
- Do not scan the whole repo unless explicitly approved.
- Inspect only files relevant to the task.
- Ask before reading many files.
- Make minimal targeted changes.
- Preserve existing architecture.
- Update this file only when important architecture or logic changes.
