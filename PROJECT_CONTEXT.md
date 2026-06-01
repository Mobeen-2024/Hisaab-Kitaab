# PROJECT CONTEXT

## App Summary
Hisaib Kitaib (حساب کتاب) is a localized, offline-first financial and business management Progressive Web App (PWA) tailored for small businesses and individuals. It modernizes the traditional "Khata" by offering comprehensive ledger management, inventory tracking, and AI-assisted analytics, all functional without an internet connection.

## Tech Stack
- Frontend: React 19, React Router v7
- Backend: Firebase (optional sync/auth)
- Database: Dexie.js (IndexedDB) for local offline-first storage
- Auth: Firebase Auth
- State Management: Zustand (client state), dexie-react-hooks (live queries)
- UI Library: Tailwind CSS v4, Motion (Framer Motion), Lucide React
- Build Tool: Vite 6
- Other Important Libraries: @google/genai, Recharts, jsPDF, Tesseract.js, Capacitor 8 (for native APK)

## Important Folders
- `src/components`: UI components organized by feature (e.g., `dashboard`, `SmartAssistant`, `ImportStatement`).
- `src/services`: Encapsulates business logic, API wrappers, and CRUD operations (e.g., `TransactionService`, `AIService`, `FirebaseSyncService`).
- `src/models`: Contains TypeScript data models and interfaces defining the local database schema.
- `src/contexts`: React Context providers for global concerns like Settings, Theme, or CloudAuth.
- `android`: Capacitor native Android project configuration.

## Core Architecture
The app follows a client-heavy, offline-first architecture. All data operations primarily read and write to a local IndexedDB database using Dexie.js. A background sync mechanism optionally mirrors local changes to Firebase Firestore via a persistent `syncQueue` table, resolving offline updates reliably. Services abstract complex logic (AI interactions, OCR, sync) away from React components, maintaining clean UI logic.

## Data Flow
UI interactions trigger updates to local state via Zustand or directly invoke `src/services` methods. These services write data to the local Dexie.js database (`db.ts`). Live queries via `dexie-react-hooks` automatically re-render the UI with updated local data. Independently, Dexie hooks enqueue mutations into a local `syncQueue` table. A background worker in `FirebaseSyncService` processes these queued operations in Firestore write batches when online, preventing sync echo loops using transactional flags (`_isRemoteSync`).

## Main Features
- Udhaar (Credit/Debt) Management
- Income, Expense, and Investment Logging with Analytics
- Inventory Management
- Goals & Budget Planner
- Live Voice Assistant (powered by Gemini)
- Smart Document Ingestion (PDFs, Receipts, CSVs via Gemini Vision/OCR)
- AI Financial Insights
- Multi-User & Role Access with Context Isolation (Personal vs Business)
- Offline-First PWA capabilities with Cloud Sync option

## Important Services / Logic
- `db.ts`: The core database definition extending Dexie. Configures stores (transactions, customers, etc.) and attaches CRUD hooks for audit logging and remote sync syncing.
- `FirebaseSyncService`: Manages bidirectional synchronization between local Dexie and remote Firestore.
- `DocumentProcessingAgent` & `AIService`: Interfaces with Google's Gemini for document parsing, smart insights, and voice assistance.
- `TransactionService` / `UdhaarService`: Domain-specific wrappers over Dexie for managing financial records securely.

## Database / Schema Notes
The IndexedDB schema includes `transactions`, `categories`, `settings`, `customers`, `udhaarEntries`, `goals`, `budgets`, `inventory`, `auditLogs`, `appUsers`, `messages`, and `syncQueue`. 
Entities support context isolation (`context: 'business' | 'personal'`). Records generate a `remoteId` (UUID) upon creation to ensure smooth syncing with Firebase. Audit logs track all CRUD operations locally.

## UI / Routing Notes
The app utilizes React Router for navigation. The UI is built entirely with Tailwind CSS using a glassmorphic design language. It fully supports RTL layouts for Urdu/Roman Urdu localization. The app functions as a PWA, featuring a custom install banner and an offline status indicator.

## Business Rules
- Data must always be persisted locally first to guarantee offline availability.
- The app operates in split contexts (Personal vs Business); queries must respect the active context.
- Udhaar entries must accurately map to underlying transactions to maintain a balanced ledger.
- The UI should degrade gracefully when offline (e.g., disabling cloud AI features while keeping core ledger functions active).

## Current Known Issues
- Syncing very large batches of legacy offline data may experience delays or hit quota limits, handled by a background non-blocking backfill.
- Document parsing accuracy depends on Gemini API availability and image clarity.

## Agent Instructions
- Always read this file before working.
- Always read AGENT_RULES.md before working.
- Do not scan the whole repo unless explicitly approved.
- Inspect only files relevant to the task.
- Ask before reading many files.
- Make minimal targeted changes.
- Preserve existing architecture.
- Update this file only when important architecture or logic changes.
