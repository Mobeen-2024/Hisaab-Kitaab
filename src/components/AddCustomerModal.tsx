import React, { useState, useEffect, useRef } from 'react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus name input safely using standard microtask focus
      const focusTimer = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

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
      const firstError = result.error.issues[0]?.message || 'Invalid input';
      showToast(firstError, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await CustomerService.add(payload);
      
      showToast(lang === 'ur' ? 'گاہک کا ریکارڈ محفوظ کر لیا گیا ہے' : 'Customer added successfully', 'success');
      
      // Clear form and close
      setName('');
      setPhone('');
      setBalance('');
      setBalanceType('debt');
      setContactType('customer');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to add customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const themeColor = contactType === 'customer' ? 'emerald' : 'blue';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contactType === 'customer' ? t(lang, 'addCustomer') : 'Add Supplier'}
      lang={lang === 'ur' ? 'ur' : 'en'}
      closeOnOverlayClick={!isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Toggle Contact Type */}
        <div className="flex bg-white/5 p-1 rounded-xl">
          <Button
            variant={contactType === 'customer' ? 'emerald' : 'ghost'}
            className="flex-1"
            size="sm"
            disabled={isSubmitting}
            onClick={() => setContactType('customer')}
            leftIcon={<UserRound size={14} />}
          >
            Customer
          </Button>
          <Button
            variant={contactType === 'supplier' ? 'blue' : 'ghost'}
            className="flex-1"
            size="sm"
            disabled={isSubmitting}
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
            disabled={isSubmitting}
            onChange={e => setName(e.target.value)}
            focusColor={themeColor}
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
            disabled={isSubmitting}
            onChange={e => setPhone(e.target.value)}
            focusColor={themeColor}
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
              disabled={isSubmitting}
              onChange={e => setBalance(e.target.value)}
              placeholder="0"
              focusColor={themeColor}
              className="flex-1"
            />
            <select
              value={balanceType}
              disabled={isSubmitting}
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
            disabled={isSubmitting}
            onClick={onClose}
          >
            {t(lang, 'cancel')}
          </Button>
          <Button
            type="submit"
            variant={themeColor}
            className="flex-1"
            isLoading={isSubmitting}
          >
            {t(lang, 'save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
