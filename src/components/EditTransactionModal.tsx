import React, { useState, useEffect, useActionState } from "react";
import { Lang, t } from "../lib/i18n";
import { TransactionService } from "../services/TransactionService";
import { useCategories } from "../hooks/useData";
import { useToast } from "../contexts/ToastContext";
import { Transaction } from "../models";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import DatePicker from "./DatePicker";

export default function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  lang,
  activeContext,
}: {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  lang: Lang;
  activeContext: "personal" | "business";
}) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const categories = useCategories(activeContext);

  useEffect(() => {
    if (isOpen && transaction) {
      setAmount(transaction.originalAmount ? transaction.originalAmount.toString() : transaction.amount.toString());
      setCategoryId(transaction.categoryId.toString());
      setDescription(transaction.description || "");
      setDate(transaction.date || new Date().toLocaleDateString('en-CA'));
    }
  }, [isOpen, transaction]);

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const numericAmount = parseFloat(amount);
      if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
        return { error: lang === 'ur' ? 'براہ کرم درست رقم درج کریں' : 'Please enter a valid amount' };
      }

      if (!transaction) {
        return { error: 'Transaction record is missing' };
      }

      const rate = transaction.exchangeRate || 1;
      const finalAmountInPKR = numericAmount * rate;

      const payload = {
        amount: finalAmountInPKR,
        originalAmount: numericAmount,
        categoryId: parseInt(categoryId, 10),
        date,
        description: description.trim(),
      };

      try {
        await TransactionService.update(transaction.id!, payload);
        return { success: true };
      } catch (err: any) {
        return { error: err.message || 'Failed to update transaction' };
      }
    },
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      showToast('Transaction updated successfully', 'success');
      onClose();
    } else if (state.error) {
      showToast(state.error, 'error');
    }
  }, [state, onClose, showToast]);

  if (!transaction) return null;

  const currentTypeCategories = categories.filter(c => c.type === transaction.type);
  const themeColor = transaction.type === 'income' ? 'emerald' : 'blue';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Transaction"
      lang={lang === 'ur' ? 'ur' : 'en'}
      closeOnOverlayClick={!isPending}
    >
      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="edit-tx-amount" required>Amount</Label>
          <Input
            id="edit-tx-amount"
            type="number"
            value={amount}
            disabled={isPending}
            onChange={e => setAmount(e.target.value)}
            focusColor={themeColor}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-tx-category" required>Category</Label>
          <select
            id="edit-tx-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none disabled:opacity-50"
            required
            disabled={isPending}
          >
            <option value="" disabled className="bg-[#0F172A]">Select Category</option>
            {currentTypeCategories.map(cat => (
              <option key={cat.id} value={cat.id} className="bg-[#0F172A]">
                {t(lang, cat.name)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-tx-desc">Description</Label>
          <Input
            id="edit-tx-desc"
            type="text"
            value={description}
            disabled={isPending}
            onChange={e => setDescription(e.target.value)}
            focusColor={themeColor}
          />
        </div>

        <div className="space-y-2">
          <Label required>Date</Label>
          <DatePicker value={date} onChange={setDate} disabled={isPending} />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t border-white/5">
          <Button
            type="button"
            variant="ghost"
            className="flex-1 text-slate-300"
            disabled={isPending}
            onClick={onClose}
          >
            {t(lang, 'cancel')}
          </Button>
          <Button
            type="submit"
            variant={themeColor}
            className="flex-1"
            loading={isPending}
          >
            {t(lang, 'save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
