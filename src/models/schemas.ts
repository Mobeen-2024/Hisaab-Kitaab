import { z } from 'zod';

export const LangSchema = z.enum(['en', 'ur', 'ru', 'hi', 'es', 'fr', 'ar', 'zh', 'pt', 'bn']);

export const CategorySchema = z.object({
  id: z.number().optional(),
  remoteId: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
  context: z.enum(['personal', 'business']),
});

export const CustomerSchema = z.object({
  id: z.number().optional(),
  remoteId: z.string().optional(),
  name: z.string().min(1),
  phone: z.string(),
  balance: z.number().default(0),
  initialBalance: z.number().default(0).optional(),
  type: z.enum(['customer', 'supplier']).optional(),
  createdAt: z.string(),
});

export const InventoryItemSchema = z.object({
  id: z.number().optional(),
  remoteId: z.string().optional(),
  name: z.string().min(1),
  category: z.string(),
  quantity: z.number(),
  minQuantity: z.number(),
  unitPrice: z.number(),
  context: z.enum(['personal', 'business']),
});

export const TransactionSchema = z.object({
  id: z.number().optional(),
  remoteId: z.string().optional(),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  categoryId: z.number(),
  context: z.enum(['personal', 'business']),
  date: z.string(),
  description: z.string(),
  customerId: z.number().optional(),
  paymentMethod: z.enum(['cash', 'bank', 'mobile_wallet']).optional(),
  originalCurrency: z.string().optional(),
  originalAmount: z.number().optional(),
  exchangeRate: z.number().optional(),
  source: z.enum(['manual', 'voice', 'easypaisa', 'jazzcash', 'bank_import', 'pdf', 'ai']).optional(),
  importReferenceId: z.string().optional(),
});

export const UdhaarEntrySchema = z.object({
  id: z.number().optional(),
  remoteId: z.string().optional(),
  customerId: z.number(),
  type: z.enum(['give', 'receive']),
  amount: z.number().positive(),
  date: z.string(),
  dueDate: z.string().optional(),
  description: z.string(),
  isCompleted: z.boolean().optional(),
  originalCurrency: z.string().optional(),
  originalAmount: z.number().optional(),
  exchangeRate: z.number().optional(),
});

export const GoalSchema = z.object({
  id: z.number().optional(),
  remoteId: z.string().optional(),
  title: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().default(0),
  deadline: z.string().optional(),
  context: z.enum(['personal', 'business']),
});

export const BudgetSchema = z.object({
  id: z.number().optional(),
  remoteId: z.string().optional(),
  month: z.string(), // 'YYYY-MM'
  amount: z.number().positive(),
  context: z.enum(['personal', 'business']),
});

export const AppSettingsSchema = z.object({
  id: z.number().optional(),
  remoteId: z.string().optional(),
  language: LangSchema.default('en'),
  currency: z.string().default('PKR'),
  highlightedCategoryId: z.number().optional(),
  ownerName: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerDob: z.string().optional(),
  ownerAvatar: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownerCountryCode: z.string().optional(),
  activeContext: z.enum(['personal', 'business']).default('business'),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().optional(),
  activeUserId: z.number().optional(),
  geminiApiKey: z.string().optional(),
});

export const AppUserSchema = z.object({
  id: z.number().optional(),
  remoteId: z.string().optional(),
  name: z.string().min(1),
  role: z.enum(['owner', 'spouse', 'cashier', 'employee']),
  contextAccess: z.enum(['personal', 'business', 'both']),
  passcode: z.string(),
  avatar: z.string().optional(),
});

export const MessageSchema = z.object({
  id: z.number().optional(),
  remoteId: z.string().optional(),
  chatId: z.string(),
  sender: z.enum(['user', 'ai', 'system']),
  content: z.string(),
  timestamp: z.string(),
});

export const AuditLogSchema = z.object({
  id: z.number().optional(),
  remoteId: z.string().optional(),
  entityType: z.enum(['transaction', 'customer', 'udhaar', 'goal', 'budget', 'inventory']),
  entityId: z.number(),
  action: z.enum(['create', 'update', 'delete']),
  timestamp: z.string(),
  details: z.string().optional(),
  context: z.enum(['personal', 'business']).optional(),
});
