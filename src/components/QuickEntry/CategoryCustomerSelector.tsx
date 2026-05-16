import React from 'react';
import { Settings } from 'lucide-react';
import { Lang, t, isRTL } from '../../lib/i18n';

interface SelectionProps {
  type: "expense" | "income" | "udhaar_give" | "udhaar_take";
  categoryId: string;
  setCategoryId: (id: string) => void;
  customerId: string;
  setCustomerId: (id: string) => void;
  categories: any[];
  customers: any[];
  onManageCategories: () => void;
  lang: Lang;
}

export default function CategoryCustomerSelector({
  type,
  categoryId,
  setCategoryId,
  customerId,
  setCustomerId,
  categories,
  customers,
  onManageCategories,
  lang
}: SelectionProps) {
  const rtl = isRTL(lang);
  const isUdhaar = type === "udhaar_give" || type === "udhaar_take";

  if (!isUdhaar) {
    return (
      <div className={`flex gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
        <select
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex-1 px-4 py-3 bg-[#0F172A] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none font-medium text-ellipsis overflow-hidden"
        >
          <option value="">{lang === 'ur' ? 'زمرہ منتخب کریں...' : 'Choose Category...'}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {t(lang, c.name)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onManageCategories}
          className="px-4 py-3 bg-[#0F172A] border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0"
          aria-label="Manage Categories"
        >
          <Settings size={20} />
        </button>
      </div>
    );
  }

  return (
    <select
      required
      value={customerId}
      onChange={(e) => setCustomerId(e.target.value)}
      className="w-full px-4 py-3 bg-[#0F172A] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none font-medium"
    >
      <option value="">{lang === 'ur' ? 'شخص منتخب کریں...' : 'Choose Person...'}</option>
      {customers.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
