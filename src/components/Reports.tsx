import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Lang, t } from '../lib/i18n';
import { FileText, Download, FileSpreadsheet, Calendar, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import jsPDF from 'jspdf';
import { formatCurrency as formatSharedCurrency } from '../lib/currency';
import autoTable from 'jspdf-autotable';

export default function Reports({ lang, currency, activeContext }: { lang: Lang, currency: string, activeContext: 'business' | 'personal' }) {
  const allTransactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const transactions = allTransactions.filter(t => t.context === activeContext);

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const filteredTransactions = useMemo(() => {
    if (!selectedMonth) return [];
    
    // selectedMonth is 'YYYY-MM'. Let's create start and end dates for filtering
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = endOfMonth(startDate);

    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedMonth]);

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const formatCurrency = (val: number) => {
    return formatSharedCurrency(val, currency, lang);
  };

  const getCategoryName = (id: number) => {
    const cat = categories.find(c => c.id === id);
    return cat ? t(lang, cat.name) : 'Unknown';
  };

  const exportCSV = () => {
    if (filteredTransactions.length === 0) return;
    
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Context'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.date), 'yyyy-MM-dd'),
      `"${t.description.replace(/"/g, '""')}"`,
      `"${getCategoryName(t.categoryId).replace(/"/g, '""')}"`,
      t.type,
      t.amount,
      t.context
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Hisaab-Kitab_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    if (filteredTransactions.length === 0) return;
    
    const doc = new jsPDF();
    const formattedMonth = format(new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1), 'MMMM yyyy');
    
    // Header
    doc.setFontSize(20);
    doc.text('Hisaab-Kitab Financial Report', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Month: ${formattedMonth}`, 14, 30);
    
    // Summary
    doc.setFontSize(11);
    doc.text(`Total Income: ${formatCurrency(totalIncome)}`, 14, 40);
    doc.text(`Total Expenses: ${formatCurrency(totalExpense)}`, 14, 47);
    doc.text(`Net Balance: ${formatCurrency(netBalance)}`, 14, 54);
    
    const tableBody = filteredTransactions.map(t => [
      format(new Date(t.date), 'dd MMM yyyy'),
      t.description,
      getCategoryName(t.categoryId),
      t.type === 'income' ? 'Income' : 'Expense',
      t.context === 'personal' ? 'Personal' : 'Business',
      formatCurrency(t.amount)
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Date', 'Description', 'Category', 'Type', 'Context', 'Amount']],
      body: tableBody,
      headStyles: { fillColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 60 }
    });
    
    doc.save(`Hisaab-Kitab_Report_${selectedMonth}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">{t(lang, 'monthlyReports')}</h2>
            <p className="text-sm text-slate-400">View and export your monthly financials</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-48 bg-[#0F172A]/50 border border-white/10 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={exportCSV}
              disabled={filteredTransactions.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-colors"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">{t(lang, 'exportCSV')}</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <button 
              onClick={exportPDF}
              disabled={filteredTransactions.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">{t(lang, 'exportPDF')}</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>
          <div className="flex md:ml-2">
            <button
              onClick={() => {
                const wsText = `PaisaTrack Summary - ${format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}%0A%0A` +
                  `Mode: ${activeContext === 'business' ? 'Business' : 'Personal'}%0A` +
                  `Total Income: ${formatCurrency(totalIncome)}%0A` +
                  `Total Expense: ${formatCurrency(totalExpense)}%0A` +
                  `Net Cash: ${formatCurrency(netBalance)}%0A%0A` +
                  `Powered by PaisaTrack by Zain`;
                window.open(`https://wa.me/?text=${wsText}`, '_blank');
              }}
              disabled={filteredTransactions.length === 0}
              className="w-full sm:w-auto px-4 py-2.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/10"
            >
              Share WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-6 rounded-[2rem]">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400/80 mb-2 flex items-center gap-2"><ArrowUpRight size={14}/> {activeContext === 'business' ? 'Total Sales' : t(lang, 'totalIncome')}</p>
          <h3 className="text-3xl font-black text-emerald-400 tracking-tight">{formatCurrency(totalIncome)}</h3>
        </div>
        <div className="bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 p-6 rounded-[2rem]">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-400/80 mb-2 flex items-center gap-2"><ArrowDownRight size={14}/> {activeContext === 'business' ? 'Total Purchases' : t(lang, 'totalExpense')}</p>
          <h3 className="text-3xl font-black text-rose-400 tracking-tight">{formatCurrency(totalExpense)}</h3>
        </div>
        <div className={`bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-6 rounded-[2rem] ${netBalance < 0 ? 'from-rose-500/10 border-rose-500/20' : ''}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${netBalance < 0 ? 'text-rose-400/80' : 'text-blue-400/80'}`}><Wallet size={14}/> {activeContext === 'business' ? 'Net Profit' : t(lang, 'netBalance')}</p>
          <h3 className={`text-3xl font-black tracking-tight ${netBalance < 0 ? 'text-rose-400' : 'text-blue-400'}`}>{formatCurrency(netBalance)}</h3>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-bold tracking-tight">Transactions Overview</h3>
        </div>
        
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No transactions found for {selectedMonth}.
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
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors flex flex-col sm:table-row py-3 sm:py-0 px-4 sm:px-0">
                    <td className="sm:p-4 text-sm text-slate-400 sm:text-slate-300 w-[120px]">
                      {format(new Date(t.date), 'dd MMM yyyy')}
                    </td>
                    <td className="sm:p-4">
                      <div className="font-medium text-white">{t.description}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 sm:hidden">{getCategoryName(t.categoryId)}</div>
                    </td>
                    <td className="sm:p-4 hidden sm:table-cell">
                      <span className="bg-white/10 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-300 border border-white/10 shadow-sm">
                        {getCategoryName(t.categoryId)}
                      </span>
                    </td>
                    <td className={`sm:p-4 text-right font-bold tabular-nums relative sm:static -mt-10 sm:mt-0 ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
