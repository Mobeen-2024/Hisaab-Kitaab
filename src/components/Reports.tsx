import React, { useState, useMemo } from 'react';
import { Lang, t } from '../lib/i18n';
import { FileText, Download, FileSpreadsheet, Calendar, ArrowUpRight, ArrowDownRight, Wallet, Upload, Search, TrendingUp } from 'lucide-react';
import { format, parseISO, endOfMonth, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import jsPDF from 'jspdf';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import autoTable from 'jspdf-autotable';
import TransactionCalendar from './TransactionCalendar';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSettings } from '../contexts/SettingsContext';
import { useUIStore } from '../lib/store';
import { useTransactions, useCategories } from '../hooks/useData';

const CHART_COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6', '#ef4444'];

export default function Reports() {
  const { lang, currency, activeContext } = useSettings();
  const { setImportModalOpen } = useUIStore();
  const allTransactions = useTransactions();
  const categories = useCategories();

  const transactions = useMemo(() => allTransactions.filter(t => t.context === activeContext), [allTransactions, activeContext]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeView, setActiveView] = useState<'summary' | 'calendar'>('summary');
  const [tableSearch, setTableSearch] = useState('');

  const filteredTransactions = useMemo(() => {
    if (!selectedMonth) return [];
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = endOfMonth(startDate);
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= startDate && d <= endDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedMonth]);

  const searchedTransactions = useMemo(() => {
    if (!tableSearch.trim()) return filteredTransactions;
    const q = tableSearch.toLowerCase();
    return filteredTransactions.filter(t =>
      t.description.toLowerCase().includes(q) ||
      getCategoryName(t.categoryId).toLowerCase().includes(q)
    );
  }, [filteredTransactions, tableSearch]);

  // YTD calculations
  const ytdTransactions = useMemo(() => {
    const start = startOfYear(new Date());
    const end = endOfYear(new Date());
    return transactions.filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
  }, [transactions]);
  const ytdIncome = useMemo(() => ytdTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [ytdTransactions]);
  const ytdExpense = useMemo(() => ytdTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [ytdTransactions]);

  // Category breakdown for chart
  const categoryBreakdown = useMemo(() => {
    const expenseTxs = filteredTransactions.filter(t => t.type === 'expense');
    const map: Record<number, number> = {};
    expenseTxs.forEach(t => { map[t.categoryId] = (map[t.categoryId] || 0) + t.amount; });
    return Object.entries(map)
      .map(([catId, amount]) => ({ name: getCategoryName(Number(catId)), amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filteredTransactions, categories]);

  const totalIncome = useMemo(() => filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [filteredTransactions]);
  const totalExpense = useMemo(() => filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [filteredTransactions]);
  const netBalance = totalIncome - totalExpense;

  const formatCurrency = (val: number) => formatSharedCurrency(val, currency, lang);
  function getCategoryName(id: number) {
    const cat = categories.find(c => c.id === id);
    return cat ? t(lang, cat.name) : 'Unknown';
  }

  const exportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Context'];
    const rows = filteredTransactions.map(tx => [
      format(new Date(tx.date), 'yyyy-MM-dd'),
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${getCategoryName(tx.categoryId).replace(/"/g, '""')}"`,
      tx.type, tx.amount, tx.context
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `HisaibKitaib_Report_${selectedMonth}.csv`;
    a.click();
  };

  const exportPDF = () => {
    if (filteredTransactions.length === 0) return;
    const doc = new jsPDF();
    const fMonth = format(new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1), 'MMMM yyyy');
    doc.setFontSize(20); doc.text('Hisaib Kitaib Financial Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`Month: ${fMonth}`, 14, 30);
    doc.text(`Total Income: ${formatCurrency(totalIncome)}`, 14, 40);
    doc.text(`Total Expenses: ${formatCurrency(totalExpense)}`, 14, 47);
    doc.text(`Net Balance: ${formatCurrency(netBalance)}`, 14, 54);
    autoTable(doc, {
      startY: 65,
      head: [['Date', 'Description', 'Category', 'Type', 'Context', 'Amount']],
      body: filteredTransactions.map(tx => [
        format(new Date(tx.date), 'dd MMM yyyy'), tx.description,
        getCategoryName(tx.categoryId), tx.type, tx.context, formatCurrency(tx.amount)
      ]),
      headStyles: { fillColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    doc.save(`HisaibKitaib_Report_${selectedMonth}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex bg-[#0F172A]/80 backdrop-blur-md border border-white/10 rounded-2xl p-1 self-start w-fit shadow-xl">
        <button onClick={() => setActiveView('summary')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeView === 'summary' ? 'bg-indigo-500/20 text-indigo-400 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <FileText size={16} /> Monthly Summary
        </button>
        <button onClick={() => setActiveView('calendar')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeView === 'calendar' ? 'bg-blue-500/20 text-blue-400 shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <Calendar size={16} /> Interactive Calendar
        </button>
      </div>

      {activeView === 'calendar' ? (
        <TransactionCalendar lang={lang} currency={currency} activeContext={activeContext} />
      ) : (
        <>
          {/* YTD Strip */}
          <div className="bg-gradient-to-r from-indigo-900/40 to-slate-900/60 border border-indigo-500/20 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <TrendingUp size={16} className="text-indigo-400" />
              <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">YTD {new Date().getFullYear()}</span>
            </div>
            <div className="flex flex-wrap gap-4 flex-1">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Income</p>
                <p className="text-base font-black text-emerald-400">{formatCurrency(ytdIncome)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Expenses</p>
                <p className="text-base font-black text-rose-400">{formatCurrency(ytdExpense)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Net</p>
                <p className={`text-base font-black ${ytdIncome - ytdExpense >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatCurrency(ytdIncome - ytdExpense)}</p>
              </div>
            </div>
          </div>

          {/* Header controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">{t(lang, 'monthlyReports')}</h2>
                <p className="text-sm text-slate-400">View reports or import Bank Statements</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <button onClick={() => setImportModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-sm font-bold transition-colors border border-blue-500/30">
                <Upload size={16} /> Import Data
              </button>
              <div className="relative w-full sm:w-auto">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full sm:w-44 bg-[#0F172A]/50 border border-white/10 text-white rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none" />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={exportCSV} disabled={!filteredTransactions.length}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-colors">
                  <FileSpreadsheet size={15} /> CSV
                </button>
                <button onClick={exportPDF} disabled={!filteredTransactions.length}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-colors">
                  <Download size={15} /> PDF
                </button>
                <button
                  onClick={() => {
                    const txt = `Hisaib Kitaib Summary - ${format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}%0A%0A` +
                      `Mode: ${activeContext}%0AIncome: ${formatCurrency(totalIncome)}%0AExpense: ${formatCurrency(totalExpense)}%0ANet: ${formatCurrency(netBalance)}%0A%0APowered by Hisaib Kitaib`;
                    window.open(`https://wa.me/?text=${txt}`, '_blank');
                  }}
                  disabled={!filteredTransactions.length}
                  className="flex-1 sm:flex-none px-3 py-2.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5">
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-6 rounded-[2rem]">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400/80 mb-2 flex items-center gap-2"><ArrowUpRight size={14} /> {activeContext === 'business' ? 'Total Sales' : t(lang, 'totalIncome')}</p>
              <h3 className="text-3xl font-black text-emerald-400 tracking-tight">{formatCurrency(totalIncome)}</h3>
            </div>
            <div className="bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 p-6 rounded-[2rem]">
              <p className="text-xs font-bold uppercase tracking-widest text-rose-400/80 mb-2 flex items-center gap-2"><ArrowDownRight size={14} /> {activeContext === 'business' ? 'Total Purchases' : t(lang, 'totalExpense')}</p>
              <h3 className="text-3xl font-black text-rose-400 tracking-tight">{formatCurrency(totalExpense)}</h3>
            </div>
            <div className={`bg-gradient-to-br to-transparent p-6 rounded-[2rem] border ${netBalance < 0 ? 'from-rose-500/10 border-rose-500/20' : 'from-blue-500/10 border-blue-500/20'}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${netBalance < 0 ? 'text-rose-400/80' : 'text-blue-400/80'}`}><Wallet size={14} /> {activeContext === 'business' ? 'Net Profit' : t(lang, 'netBalance')}</p>
              <h3 className={`text-3xl font-black tracking-tight ${netBalance < 0 ? 'text-rose-400' : 'text-blue-400'}`}>{formatCurrency(netBalance)}</h3>
            </div>
          </div>

          {/* Category Breakdown Chart */}
          {categoryBreakdown.length > 0 && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <ArrowDownRight size={16} className="text-rose-400" /> Expense Breakdown by Category
              </h3>
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-64 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryBreakdown} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40}>
                        {categoryBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }} formatter={(val: number) => formatCurrency(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 w-full">
                  {categoryBreakdown.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-sm text-slate-300 flex-1 truncate">{cat.name}</span>
                      <span className="text-sm font-bold text-white tabular-nums">{formatCurrency(cat.amount)}</span>
                      <span className="text-xs text-slate-500 w-10 text-right">{totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden">
            <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold tracking-tight text-white">Transactions Overview</h3>
              <div className="relative w-full sm:w-60">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text" placeholder="Search transactions…" value={tableSearch} onChange={e => setTableSearch(e.target.value)}
                  className="w-full bg-[#0F172A]/50 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {searchedTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                {filteredTransactions.length === 0 ? `No transactions found for ${selectedMonth}.` : 'No transactions match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-xs uppercase tracking-widest text-slate-400 border-b border-white/10 hidden sm:table-row">
                      <th className="p-4 font-bold">Date</th>
                      <th className="p-4 font-bold">Description</th>
                      <th className="p-4 font-bold">Category</th>
                      <th className="p-4 font-bold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchedTransactions.map(tx => (
                      <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors flex flex-col sm:table-row py-3 sm:py-0 px-4 sm:px-0">
                        <td className="sm:p-4 text-sm text-slate-400">{format(new Date(tx.date), 'dd MMM yyyy')}</td>
                        <td className="sm:p-4">
                          <div className="font-medium text-white">{tx.description}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 sm:hidden">{getCategoryName(tx.categoryId)}</div>
                        </td>
                        <td className="sm:p-4 hidden sm:table-cell">
                          <span className="bg-white/10 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-300 border border-white/10">{getCategoryName(tx.categoryId)}</span>
                        </td>
                        <td className={`sm:p-4 text-right font-bold tabular-nums ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
