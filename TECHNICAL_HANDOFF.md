# Deep Technical Handoff Summary
**Project:** Hisaab-Kitaab
**Target Audience:** Future AI Assistants / Developers

## 1. Executive Overview
Hisaab-Kitaab is a modern, offline-first digital ledger (Khata) and inventory management application built with React, TypeScript, Vite, and TailwindCSS. It utilizes an offline-first architecture via Dexie.js (IndexedDB) with a custom background synchronization engine to Firebase Firestore. 

## 2. Architecture & Tech Stack
- **Frontend Framework**: React 18, Vite.
- **Language**: TypeScript (strict mode).
- **Styling**: TailwindCSS, Lucide React (icons), Recharts (data visualization).
- **Local Database**: IndexedDB wrapper via `Dexie.js`.
- **Remote Database**: Firebase Firestore.
- **State Management**: Zustand (global UI states), React Context (`SettingsContext`, `VoiceAssistantContext`), and Dexie Live Query (`dexie-react-hooks`).
- **AI Integration**: Google Gemini API (`@google/genai`) for Insights, OCR, and Voice Chat.

## 3. Core Database schema (`src/db.ts` & `src/models/schemas.ts`)
- **Validation**: All entities are validated using Zod.
- **Tables (Version 10)**:
  - `transactions`: General income/expense entries.
  - `customers`: Khata accounts.
  - `udhaar`: Specific debit/credit entries linked to customers.
  - `categories`: User-defined categories.
  - `inventory`: Stock items.
  - `app_settings`: Global application configurations.
  - `app_users`: Local multi-user roles/PINs.
  - `sync_queue`: The local mutation log for Firebase.
- **Strict Isolation**: Every business entity possesses a `context` string (`personal` or `business`). All UI queries filter by this context.

## 4. State Management & Hooks (`src/hooks/useData.ts`)
- Reactivity relies heavily on `useLiveQuery` from `dexie-react-hooks`.
- `useData.ts` exports custom hooks (`useTransactions`, `useCustomers`, `useInventory`, etc.).
- **Crucial Pattern**: These hooks automatically filter data based on the `activeContext` (from `useSettings()`), ensuring absolute separation between Personal and Business ledgers.

## 5. Offline-First Sync Engine (`src/services/FirebaseSyncService.ts`)
- **Write Path**: 
  - UI writes to Dexie via Services.
  - Dexie Hooks (`creating`, `updating`, `deleting`) intercept the operation.
  - The hook adds an entry to the `sync_queue` table.
  - `FirebaseSyncService.processQueue()` pushes changes from `sync_queue` to Firestore.
- **Read Path**:
  - `startSync()` subscribes to Firestore `onSnapshot`.
  - Remote changes are written down to Dexie.
  - **Loop Prevention**: To avoid triggering Dexie hooks (which would add to the `sync_queue` again), the app uses a global `isSyncingDown` flag during remote-to-local writes.

## 6. Core Business Logic: Customers & Udhaar (`src/services/UdhaarService.ts` & `CustomerService.ts`)
- **Customer Balances**: Computed on the fly. `syncBalance()` in `CustomerService` aggregates all `UdhaarEntry` items for a customer and updates the `balance` field.
- **Dual Ledger Entry Pattern**: When a user adds an Udhaar entry (e.g., Credit given), `UdhaarService.add()` automatically triggers `TransactionService.add()` to generate a corresponding transaction. These are linked via `transactionId` and `sourceId` to keep the universal cashflow balanced.

## 7. Core Business Logic: Inventory (`src/services/InventoryService.ts`)
- Exclusively active when `activeContext === 'business'`.
- Supports basic CRUD and `restock()` operations.
- Tracks `quantity`, `minQuantity` (for low stock alerts), `unitPrice`, and `costPrice`.

## 8. Financial Reporting (`src/components/Reports.tsx`)
- Provides Monthly Summaries, Interactive Calendars, and YTD calculation.
- Supports PDF exports via `jspdf`/`jspdf-autotable` and CSV exports.
- Uses `recharts` for expense breakdowns.

## 9. AI Integration (`src/lib/ai.ts`, `src/services/AIService.ts`, `src/services/LiveVoiceService.ts`)
- **AIService**: 
  - OCR (`extractFromImage`): Uses `gemini-3.1-flash-lite` (vision) to extract transactions from receipts.
  - Statement Parsing (`parseStatement`, `analyzeDocument`): Parses bank/wallet statements into JSON.
  - Insights: Analyzes spending behaviour.
- **LiveVoiceService**: 
  - Manages real-time AI conversation context.
  - **Assumption/Note**: Currently relies on HTTP streams rather than WebSockets to stream AI responses. Integrates tool calls if SDK provides them.

## 10. Security & Multi-User (`firestore.rules`, `src/components/ManageUsers.tsx`)
- **Remote Security**: `firestore.rules` locks data down to the authenticated `request.auth.uid`.
- **Local Security**: `ManageUsers.tsx` supports multi-user profiles (`owner`, `spouse`, `cashier`, `employee`).
  - Roles determine whether the user can access `personal` or `business` contexts.
  - Authentication relies on local PINs (Passcodes).
  - **Assumption**: The app assumes device-level security. The PIN is checked entirely on the client side.

## 11. Contextual Routing & Layout (`src/App.tsx`, `src/layouts/MainLayout.tsx`)
- Uses React Router for navigation.
- MainLayout houses top navigation, the Voice Assistant fab button, and restricts routes based on active contexts (e.g., hiding Inventory in personal mode).

## 12. Extensibility Guidelines for Future AI
1. **Adding New Models**: 
   - Define the schema in `src/models/schemas.ts`.
   - Bump version and add the table in `src/db.ts`.
   - **Crucial**: Ensure Dexie `creating/updating/deleting` hooks are attached so the model synchronizes via Firebase.
2. **Token Economy**: 
   - Always read `PROJECT_CONTEXT.md` to understand high-level goals without rescanning the whole repo.
   - Restrict code modifications to minimal, precise updates.
3. **Context Sensitivity**: 
   - Never fetch raw data from Dexie for the UI without filtering by `activeContext`.

---
*Generated based on an architectural review requested by the user.*
