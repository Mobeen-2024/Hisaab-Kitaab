import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useTransactions } from '../../hooks/useData';
import { t } from '../../lib/i18n';
import { formatCurrency as formatSharedCurrency } from '../../lib/currency';

export function ContextComparison() {
  const { lang, currency, rtl } = useSettings();
  const isUrdu = lang === 'ur';

  const allTransactions = useTransactions();

  const formatCurrency = (valInPKR: number) => formatSharedCurrency(valInPKR, currency, lang);
  const formatCompactCurrency = (valInPKR: number) => formatSharedCurrency(valInPKR, currency, lang, true);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const { businessRevenue, businessCost, personalIncome, personalExpense, personalMonthlyIncome, personalMonthlyExpense } = React.useMemo(() => {
    let bRev = 0, bCost = 0, pInc = 0, pExp = 0, pMonInc = 0, pMonExp = 0;
    for (let i = 0; i < allTransactions.length; i++) {
      const t = allTransactions[i];
      if (t.context === 'business') {
        if (t.type === 'income') bRev += t.amount;
        else if (t.type === 'expense') bCost += t.amount;
      } else if (t.context === 'personal') {
        if (t.type === 'income') {
          pInc += t.amount;
          if (t.date.startsWith(currentMonth)) pMonInc += t.amount;
        }
        else if (t.type === 'expense') {
          pExp += t.amount;
          if (t.date.startsWith(currentMonth)) pMonExp += t.amount;
        }
      }
    }
    return {
      businessRevenue: bRev, businessCost: bCost,
      personalIncome: pInc, personalExpense: pExp,
      personalMonthlyIncome: pMonInc, personalMonthlyExpense: pMonExp
    };
  }, [allTransactions, currentMonth]);

  // Business calculations
  const businessProfit = businessRevenue - businessCost;
  const businessMarginPct = businessRevenue > 0 ? ((businessProfit / businessRevenue) * 100).toFixed(0) : '0';
  const businessCostPct = businessRevenue > 0 ? Math.min((businessCost / businessRevenue) * 100, 100).toFixed(0) : '0';

  // Personal calculations
  const personalBalance = personalIncome - personalExpense;

  const personalHealthPct = Math.min(100, Math.max(0, Math.round(((personalMonthlyIncome - personalMonthlyExpense) / (personalMonthlyIncome || 1)) * 100)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 relative z-10">
      {/* Business Summary Card */}
      <div className="bg-gradient-to-br from-amber-950/40 via-slate-900/70 to-slate-900/60 backdrop-blur-3xl border border-amber-500/10 hover:border-amber-400/40 transition-all duration-700 rounded-[2.5rem] p-8 flex flex-col flex-1 relative overflow-hidden group shadow-2xl">
        <div className={`absolute -top-12 -right-12 w-64 h-64 bg-amber-500/15 rounded-full ${isUrdu ? 'blur-[40px] opacity-30' : 'blur-[80px]'} group-hover:bg-amber-500/25 transition-all duration-700`}></div>
        <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

        <div className={`flex justify-between items-start mb-10 relative z-10 ${rtl ? 'flex-row-reverse' : ''}`}>
          <div className="space-y-2">
            <div className={`flex items-center gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
              <div className="w-1 h-4 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
              <h4 className={`text-[10px] font-black uppercase ${isUrdu ? '' : 'tracking-widest'} text-slate-500`}>
                {t(lang, 'business')} {isUrdu ? 'کارکردگی' : 'Stream'}
              </h4>
            </div>
          </div>
          <div className={isUrdu ? 'text-left' : 'text-right'}>
            <p className="text-[9px] text-slate-500 font-black uppercase mb-1.5 opacity-60">{isUrdu ? 'منافع' : 'Net Yield'}</p>
            <div className={`text-3xl font-black tracking-tighter tabular-nums drop-shadow-[0_0_20px_rgba(16,185,129,0.3)] ${businessProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {businessProfit >= 0 ? '+' : ''}{businessMarginPct}%
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-end space-y-8 relative z-10">
          <div className={`flex justify-between items-baseline mb-3 ${rtl ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] font-black uppercase text-slate-400">{isUrdu ? 'کل آمدنی' : 'Gross Revenue'}</span>
            <span className="text-2xl font-black text-white tracking-tighter tabular-nums" dir="ltr">{formatCurrency(businessRevenue)}</span>
          </div>
          <div className={`flex justify-between items-baseline mb-3 ${rtl ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] font-black uppercase text-slate-500">{isUrdu ? 'اخراجات' : 'Operating Costs'}</span>
            <span className="text-2xl font-black text-rose-400/90 tracking-tighter tabular-nums" dir="ltr">-{formatCurrency(businessCost)}</span>
          </div>
          <div className="space-y-4 pt-6 border-t border-white/5">
            <div className={`flex justify-between text-[9px] text-slate-500 font-black uppercase ${rtl ? 'flex-row-reverse' : 'tracking-widest'}`}>
              <span>{isUrdu ? 'اخراجات بمقابلہ آمدنی' : 'Cost-to-Revenue Index'}</span>
              <span className="text-amber-400">{businessCostPct}%</span>
            </div>
            <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden p-[2px] border border-white/5 relative shadow-inner">
              <div
                className={`absolute top-0 bottom-0 ${rtl ? 'right-0' : 'left-0'} bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400 rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${businessCostPct}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Summary Card */}
      <div className="bg-gradient-to-br from-blue-950/40 via-slate-900/70 to-slate-900/60 backdrop-blur-3xl border border-blue-500/10 hover:border-blue-400/40 transition-all duration-700 rounded-[2.5rem] p-8 flex flex-col flex-1 relative overflow-hidden group shadow-2xl">
        <div className={`absolute -top-12 -right-12 w-64 h-64 bg-blue-500/15 rounded-full ${isUrdu ? 'blur-[40px] opacity-30' : 'blur-[80px]'} group-hover:bg-blue-400/25 transition-all duration-700`}></div>
        <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

        <div className={`flex justify-between items-start mb-10 relative z-10 ${rtl ? 'flex-row-reverse' : ''}`}>
          <div className="space-y-2">
            <div className={`flex items-center gap-2 ${rtl ? 'flex-row-reverse' : ''}`}>
              <div className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
              <h4 className={`text-[10px] font-black uppercase ${isUrdu ? '' : 'tracking-widest'} text-slate-500`}>
                {t(lang, 'personal')} {isUrdu ? 'بیلنس' : 'Standing'}
              </h4>
            </div>
          </div>
          <div className={isUrdu ? 'text-left' : 'text-right'}>
            <p className="text-[9px] text-slate-500 font-black uppercase mb-1.5 opacity-60">{isUrdu ? 'موجودہ سرمایہ' : 'Available Capital'}</p>
            <div className={`text-3xl font-black tracking-tighter tabular-nums drop-shadow-[0_0_20px_rgba(96,165,250,0.3)] ${personalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {personalBalance >= 0 ? '+' : ''}{formatCompactCurrency(personalBalance)}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-end space-y-8 relative z-10">
          <div className={`flex justify-between items-baseline mb-3 ${rtl ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] font-black uppercase text-slate-400">{isUrdu ? 'کل آمدنی' : 'Monthly Inflow'}</span>
            <span className="text-2xl font-black text-white tracking-tighter tabular-nums" dir="ltr">{formatCurrency(personalMonthlyIncome)}</span>
          </div>
          <div className={`flex justify-between items-baseline mb-3 ${rtl ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] font-black uppercase text-slate-500">{isUrdu ? 'اخراجات' : 'Monthly Outflow'}</span>
            <span className="text-2xl font-black text-rose-400/90 tracking-tighter tabular-nums" dir="ltr">-{formatCurrency(personalMonthlyExpense)}</span>
          </div>
          <div className="space-y-4 pt-6 border-t border-white/5">
            <div className={`flex justify-between text-[9px] text-slate-500 font-black uppercase ${rtl ? 'flex-row-reverse' : 'tracking-widest'}`}>
              <span>{isUrdu ? 'بجت بمقابلہ خرچ' : 'Liquidity Health'}</span>
              <span className="text-blue-400">{personalHealthPct}%</span>
            </div>
            <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden p-[2px] border border-white/5 relative shadow-inner">
              <div
                className={`absolute top-0 bottom-0 ${rtl ? 'right-0' : 'left-0'} bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-400 rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${personalHealthPct}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
