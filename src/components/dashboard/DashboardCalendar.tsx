import React, { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, addMonths, subMonths, isToday, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useTransactions } from '../../hooks/useData';

export function DashboardCalendar() {
  const { lang, rtl, activeContext } = useSettings();
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(startOfMonth(new Date()));
  const isUrdu = lang === 'ur';

  const transactions = useTransactions(activeContext);

  const calendarStart = startOfWeek(startOfMonth(currentDisplayMonth));
  const calendarEnd = endOfWeek(endOfMonth(currentDisplayMonth));

  const calendarDays = useMemo(() => {
    const days = [];
    let currentDay = calendarStart;
    while (currentDay <= calendarEnd) {
      days.push(currentDay);
      currentDay = addDays(currentDay, 1);
    }
    return days;
  }, [currentDisplayMonth]);

  const transactionsByDate = useMemo(() => {
    const grouped: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      // Extract the YYYY-MM-DD part reliably, handling full iso strings or short ones
      const dateKey = t.date.split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') grouped[dateKey].income += t.amount;
      if (t.type === 'expense') grouped[dateKey].expense += t.amount;
    });
    return grouped;
  }, [transactions]);

  const getDaySummary = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return transactionsByDate[dateKey] || { income: 0, expense: 0 };
  };

  const maxDailyValue = useMemo(() => {
    return Math.max(
      ...calendarDays.map(date => {
        const s = getDaySummary(date);
        return Math.max(s.income, s.expense);
      }),
      1
    );
  }, [calendarDays, transactions]);

  const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="bg-[#1E293B]/40 backdrop-blur-3xl border border-white/10 p-4 sm:p-6 lg:p-8 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden group hover:border-blue-500/30 transition-all duration-500 shadow-2xl h-full">
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-all duration-500"></div>
      <div className="flex flex-col xl:flex-row flex-wrap items-start xl:items-center justify-between gap-4 mb-6 sm:mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">{isUrdu ? 'کیلنڈر' : 'Calendar'}</h3>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isUrdu ? 'ماہانہ خلاصہ' : 'Monthly Summary'}</div>
          </div>
        </div>
        <div className={`flex items-center gap-2 bg-[#0F172A]/60 backdrop-blur-md border border-white/10 rounded-xl p-1 w-full xl:w-auto justify-between xl:justify-center shrink-0 ${rtl ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setCurrentDisplayMonth(subMonths(currentDisplayMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            {rtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <span className="text-xs font-black text-white min-w-[100px] text-center uppercase tracking-widest tabular-nums shrink-0">
            {format(currentDisplayMonth, 'MMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentDisplayMonth(addMonths(currentDisplayMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            {rtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-7 mb-4">
          {DAYS_SHORT.map((day, i) => (
            <div key={i} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 bg-white/5 p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-white/5 shadow-inner">
          {calendarDays.map((date, i) => {
            const isCurrentMonth = isSameMonth(date, currentDisplayMonth);
            const isTodayDate = isToday(date);
            const summary = getDaySummary(date);

            return (
              <div
                key={i}
                className={`flex flex-col p-1.5 aspect-square rounded-2xl transition-all duration-300 relative group/day border
                  ${isCurrentMonth ? 'bg-white/[0.03] border-white/5 text-slate-200' : 'bg-transparent border-transparent text-slate-700'}
                  ${isTodayDate ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)] scale-105 z-10' : 'hover:bg-white/10 hover:border-white/10'}
                `}
              >
                <div className={`
                  text-[10px] font-black mb-1 w-5 h-5 flex items-center justify-center rounded-lg mx-auto transition-colors
                  ${isTodayDate ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'group-hover/day:text-blue-400'}
                `}>
                  {format(date, 'd')}
                </div>

                <div className="flex flex-col gap-1 mt-auto items-center">
                  {summary.income > 0 && (
                    <div
                      className="w-full h-1 bg-emerald-500/20 rounded-full overflow-hidden relative"
                      title={`Income: ${summary.income}`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-500"
                        style={{ width: `${Math.max(10, (summary.income / maxDailyValue) * 100)}%` }}
                      ></div>
                    </div>
                  )}
                  {summary.expense > 0 && (
                    <div
                      className="w-full h-1 bg-rose-500/20 rounded-full overflow-hidden relative"
                      title={`Expense: ${summary.expense}`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all duration-500"
                        style={{ width: `${Math.max(10, (summary.expense / maxDailyValue) * 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
