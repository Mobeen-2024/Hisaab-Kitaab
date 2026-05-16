import React from 'react';
import { ParsedTransaction } from '../../utils/statementParsers';
import { Category } from '../../db';

interface PreviewTableProps {
  parsedData: (ParsedTransaction & { categoryId?: number; isSelected: boolean })[];
  setParsedData: React.Dispatch<React.SetStateAction<(ParsedTransaction & { categoryId?: number; isSelected: boolean })[]>>;
  categories: Category[];
  searchQuery: string;
}

export default function PreviewTable({ parsedData, setParsedData, categories, searchQuery }: PreviewTableProps) {
  return (
    <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-950/50">
      <div className="max-h-[40vh] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400 font-medium sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="p-3 w-10">
                <input 
                  type="checkbox" 
                  checked={parsedData.length > 0 && parsedData.every(d => d.isSelected)}
                  onChange={(e) => setParsedData(prev => prev.map(d => ({ ...d, isSelected: e.target.checked })))}
                  className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-0"
                />
              </th>
              <th className="p-3">Date</th>
              <th className="p-3">Description / Category</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {parsedData
              .filter(d => 
                d.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                d.date.includes(searchQuery) ||
                d.amount.toString().includes(searchQuery)
              )
              .map((row, i) => {
                const originalIndex = parsedData.findIndex(d => d.referenceId === row.referenceId);
                return (
                  <tr key={row.referenceId || i} className={`text-slate-300 transition-colors ${row.isSelected ? 'bg-blue-500/5' : 'opacity-40'}`}>
                    <td className="p-3">
                      <input 
                        type="checkbox" 
                        checked={row.isSelected}
                        onChange={(e) => {
                          const newData = [...parsedData];
                          newData[originalIndex].isSelected = e.target.checked;
                          setParsedData(newData);
                        }}
                        className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-0"
                      />
                    </td>
                    <td className="p-3 text-[10px] whitespace-nowrap">{row.date}</td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => {
                            const newData = [...parsedData];
                            newData[originalIndex].description = e.target.value;
                            setParsedData(newData);
                          }}
                          className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-blue-500 outline-none w-full font-medium truncate max-w-[150px] sm:max-w-[200px]"
                          title={row.description}
                        />
                        <select
                          value={row.categoryId}
                          onChange={(e) => {
                            const newData = [...parsedData];
                            newData[originalIndex].categoryId = parseInt(e.target.value);
                            setParsedData(newData);
                          }}
                          className="bg-white/5 border-none text-[10px] text-slate-400 rounded px-2 py-1 pr-6 outline-none focus:ring-1 focus:ring-blue-500/50 w-full max-w-[140px]"
                        >
                          <option value={0}>Uncategorized</option>
                          {categories?.filter(c => c.type === row.type).map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className={`p-3 text-right whitespace-nowrap`}>
                      <div className="flex items-center justify-end gap-1">
                        <span className={row.type === 'income' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                          {row.type === 'income' ? '+' : '-'}
                        </span>
                        <input
                          type="number"
                          value={row.amount}
                          onChange={(e) => {
                            const newData = [...parsedData];
                            newData[originalIndex].amount = parseFloat(e.target.value) || 0;
                            setParsedData(newData);
                          }}
                          className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent border-b border-transparent hover:border-white/20 focus:border-blue-500 outline-none w-20 text-right ${row.type === 'income' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
