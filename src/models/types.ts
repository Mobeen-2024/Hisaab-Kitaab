import { z } from 'zod';
import {
  LangSchema,
  CategorySchema,
  CustomerSchema,
  InventoryItemSchema,
  TransactionSchema,
  UdhaarEntrySchema,
  GoalSchema,
  BudgetSchema,
  AppSettingsSchema,
  AppUserSchema,
  MessageSchema,
  AuditLogSchema
} from './schemas';

export type Lang = z.infer<typeof LangSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type UdhaarEntry = z.infer<typeof UdhaarEntrySchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Budget = z.infer<typeof BudgetSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type AppUser = z.infer<typeof AppUserSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
