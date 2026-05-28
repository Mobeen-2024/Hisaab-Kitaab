import React, { useState, useEffect, useRef, useActionState } from 'react';
import { Lang, t } from '../lib/i18n';
import { CustomerService } from '../services/CustomerService';
import { UserRound, Truck } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { CustomerSchema } from '../models';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

export default function AddCustomerModal({
  isOpen,
  onClose,
  lang,
}: {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState('');
  const [balanceType, setBalanceType] = useState<'advance' | 'debt'>('debt');
  const [contactType, setContactType] = useState<'customer' | 'supplier'>('customer');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus name input safely using standard microtask focus
      const focusTimer = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setBalance('');
    setBalanceType('debt');
    setContactType('customer');
    setFieldErrors({});
  };

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      setFieldErrors({});

      let initialBalance = parseFloat(balance) || 0;
      if (balanceType === 'debt') {
        initialBalance = Math.abs(initialBalance);
      } else {
        initialBalance = -Math.abs(initialBalance);
      }

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        type: contactType,
        balance: initialBalance,
        createdAt: new Date().toISOString(),
      };

      // Validation using Zod
      const result = CustomerSchema.safeParse(payload);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          const path = issue.path[0];
          if (path) errors[path.toString()] = issue.message;
        });
        setFieldErrors(errors);
        return { success: false, firstError: result.error.issues[0]?.message };
      }

      try {
        await CustomerService.add(payload);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to add customer' };
      }
    },
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      showToast(
        lang === 'ur' ? 'گاہک کا ریکارڈ محفوظ کر لیا گیا ہے' : 'Customer added successfully',
        'success'
      );
      resetForm();
      onClose();
    } else if (state.firstError) {
      showToast(state.firstError, 'error');
    } else if (state.error) {
      showToast(state.error, 'error');
    }
  }, [state, lang, onClose, showToast]);

  const themeColor = contactType === 'customer' ? 'emerald' : 'blue';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contactType === 'customer' ? t(lang, 'addCustomer') : 'Add Supplier'}
      lang={lang === 'ur' ? 'ur' : 'en'}
      closeOnOverlayClick={!isPending}
    >
      <form action={formAction} className="space-y-6">
        {/* Toggle Contact Type */}
        <div className="flex bg-white/5 p-1 rounded-xl">
          <Button
            variant={contactType === 'customer' ? 'emerald' : 'ghost'}
            className="flex-1"
            size="sm"
            disabled={isPending}
            onClick={() => setContactType('customer')}
            leftIcon={<UserRound size={14} />}
          >
            Customer
          </Button>
          <Button
            variant={contactType === 'supplier' ? 'blue' : 'ghost'}
            className="flex-1"
            size="sm"
            disabled={isPending}
            onClick={() => setContactType('supplier')}
            leftIcon={<Truck size={14} />}
          >
            Supplier
          </Button>
        </div>

        {/* Input Fields */}
        <div className="space-y-2">
          <Label htmlFor="customer-name" required>
            {contactType === 'customer' ? t(lang, 'customerName') : 'Supplier Name'}
          </Label>
          <Input
            id="customer-name"
            ref={nameInputRef}
            type="text"
            value={name}
            disabled={isPending}
            onChange={e => setName(e.target.value)}
            focusColor={themeColor}
            error={fieldErrors.name}
            required
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-phone">
            {t(lang, 'customerPhone')}
          </Label>
          <Input
            id="customer-phone"
            type="tel"
            value={phone}
            disabled={isPending}
            onChange={e => setPhone(e.target.value)}
            focusColor={themeColor}
            error={fieldErrors.phone}
            autoComplete="tel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-balance">
            {t(lang, 'balancePlaceholder')}
          </Label>
          <div className="flex gap-2">
            <Input
              id="customer-balance"
              type="number"
              value={balance}
              disabled={isPending}
              onChange={e => setBalance(e.target.value)}
              placeholder="0"
              focusColor={themeColor}
              error={fieldErrors.balance}
              className="flex-1"
            />
            <select
              value={balanceType}
              disabled={isPending}
              onChange={(e) => setBalanceType(e.target.value as 'advance' | 'debt')}
              className={`bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-${themeColor === 'emerald' ? 'emerald' : 'blue'}-500/50 disabled:opacity-50 transition-all outline-none`}
            >
              <option value="debt" className="bg-[#0F172A]">{contactType === 'customer' ? 'Udhaar (They Owe)' : 'Udhaar (We Owe)'}</option>
              <option value="advance" className="bg-[#0F172A]">Advance</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t border-white/5">
          <Button
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
