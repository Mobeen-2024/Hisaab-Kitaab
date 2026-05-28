import React, { useState, useEffect } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import DatePicker from '../DatePicker';
import { DocumentExtractionResult, ConfirmedExtractionResult, ConfirmedReceiptItem } from '../../services/DocumentProcessingAgent';

interface EditableExtractionFormProps {
  result: DocumentExtractionResult;
  onConfirm: (confirmed: ConfirmedExtractionResult) => void;
  onReset: () => void;
  setCanConfirm: (val: boolean) => void; // communicates to parent modal's sticky button
  confirmTriggerRef?: React.RefObject<(() => void) | null>; // allows parent modal to trigger submit
}

export default function EditableExtractionForm({
  result,
  onConfirm,
  onReset,
  setCanConfirm,
  confirmTriggerRef
}: EditableExtractionFormProps) {
  const [docType] = useState<DocumentExtractionResult['documentType']>(result.documentType);
  const [summary, setSummary] = useState(result.summary);

  // Receipt State
  const [vendor, setVendor] = useState(result.receipt?.vendor || '');
  const [date, setDate] = useState(
    result.receipt?.date && result.receipt.date !== '[Unreadable]'
      ? result.receipt.date
      : new Date().toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState(result.receipt?.currency || 'PKR');
  const [items, setItems] = useState<ConfirmedReceiptItem[]>(
    result.receipt?.items.map(item => ({
      name: item.name === '[Unreadable]' ? '' : item.name,
      quantity: item.quantity === '[Unreadable]' ? 1 : Number(item.quantity) || 1,
      unitPrice: item.unitPrice === '[Unreadable]' ? 0 : Number(item.unitPrice) || 0,
      total: item.total === '[Unreadable]' ? 0 : Number(item.total) || 0,
      include: true
    })) || []
  );
  const [tax, setTax] = useState<number>(
    result.receipt?.tax === '[Unreadable]' ? 0 : Number(result.receipt?.tax) || 0
  );

  // Table Mode State
  const [headers, setHeaders] = useState<string[]>(result.table?.headers || []);
  const [rows, setRows] = useState<(string | number)[][]>(
    result.table?.rows.map(row =>
      row.map(cell => (cell === '[Unreadable]' ? '' : cell))
    ) || []
  );
  const [includedRows, setIncludedRows] = useState<boolean[]>(
    result.table?.rows.map(() => true) || []
  );

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Automatic calculation of Receipt Totals
  const subtotal = items
    .filter(item => item.include)
    .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const calculatedGrandTotal = subtotal + tax;

  // Run validation checks
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (docType === 'receipt') {
      if (!vendor.trim()) {
        errors.push('Vendor name cannot be empty.');
      }
      if (vendor === '[Unreadable]') {
        errors.push('Please correct the [Unreadable] vendor name.');
      }
      if (!date) {
        errors.push('Please select a valid date.');
      }
      
      const activeItems = items.filter(item => item.include);
      if (activeItems.length === 0) {
        errors.push('At least one item must be included.');
      }

      activeItems.forEach((item, idx) => {
        if (!item.name.trim()) {
          errors.push(`Item #${idx + 1} name cannot be empty.`);
        }
        if (item.name === '[Unreadable]') {
          errors.push(`Please correct the [Unreadable] name for item #${idx + 1}.`);
        }
        if (item.quantity <= 0) {
          errors.push(`Item #${idx + 1} quantity must be greater than zero.`);
        }
        if (item.unitPrice < 0) {
          errors.push(`Item #${idx + 1} price cannot be negative.`);
        }
      });
    } else if (headers.length > 0) {
      // Table Mode Validation
      if (headers.some(h => !h.trim())) {
        errors.push('Table column headers cannot be empty.');
      }
      
      // Ensure no cell has empty/unreadable values where values are active
      rows.forEach((row, rowIndex) => {
        if (!includedRows[rowIndex]) return;
        row.forEach((cell, colIndex) => {
          const strCell = String(cell).trim();
          if (strCell === '' || strCell === '[Unreadable]') {
            errors.push(`Row #${rowIndex + 1}, Column "${headers[colIndex]}" cannot be empty.`);
          }
        });
      });
    }

    setValidationErrors(errors);
    const isValid = errors.length === 0;
    setCanConfirm(isValid);
    return isValid;
  };

  // Trigger validation on any change
  useEffect(() => {
    validateForm();
  }, [vendor, date, currency, items, tax, headers, rows, includedRows, docType]);

  // Handle saving & sending finalized values
  const handleSubmit = () => {
    if (!validateForm()) return;

    if (docType === 'receipt') {
      const confirmedResult: ConfirmedExtractionResult = {
        documentType: 'receipt',
        receipt: {
          vendor: vendor.trim(),
          date,
          items,
          subtotal,
          tax,
          total: calculatedGrandTotal,
          currency
        }
      };
      onConfirm(confirmedResult);
    } else {
      const confirmedResult: ConfirmedExtractionResult = {
        documentType: docType,
        table: {
          headers,
          rows,
          includedRows
        }
      };
      onConfirm(confirmedResult);
    }
  };

  // Expose handleSubmit to the parent via confirmTriggerRef
  useEffect(() => {
    if (confirmTriggerRef) {
      (confirmTriggerRef as any).current = handleSubmit;
    }
    return () => {
      if (confirmTriggerRef) {
        (confirmTriggerRef as any).current = null;
      }
    };
  }, [vendor, date, currency, items, tax, headers, rows, includedRows, docType]);

  // Receipt action handlers
  const handleItemChange = (index: number, field: keyof ConfirmedReceiptItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Automatically update the total for this row when quantity or unitPrice changes
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? Number(value) : updated[index].quantity;
      const price = field === 'unitPrice' ? Number(value) : updated[index].unitPrice;
      updated[index].total = qty * price;
    }

    setItems(updated);
  };

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Table action handlers
  const handleCellChange = (rowIndex: number, colIndex: number, value: string | number) => {
    const updated = rows.map((row, rIdx) => 
      row.map((cell, cIdx) => (rIdx === rowIndex && cIdx === colIndex ? value : cell))
    );
    setRows(updated);
  };

  const handleHeaderChange = (index: number, value: string) => {
    const updated = [...headers];
    updated[index] = value;
    setHeaders(updated);
  };

  const toggleRow = (index: number) => {
    const updated = [...includedRows];
    updated[index] = !updated[index];
    setIncludedRows(updated);
  };

  const deleteRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
    setIncludedRows(includedRows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      {/* Document Summary Badge */}
      <div className="bg-[#1E293B] border border-white/5 p-4 rounded-2xl flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
          <AlertCircle size={18} />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">AI Document Summary</h4>
          <p className="text-sm text-slate-200 font-medium mt-0.5">{summary}</p>
        </div>
      </div>

      {docType === 'receipt' ? (
        /* ==================== RECEIPT MODE ==================== */
        <div className="space-y-6">
          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Vendor Name
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Merchant/Vendor"
                className={`w-full bg-[#0F172A] border ${
                  !vendor.trim() || vendor === '[Unreadable]' ? 'border-amber-500/50 focus:ring-amber-500/30' : 'border-white/10 focus:ring-blue-500/30'
                } rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 transition-all`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Transaction Date
              </label>
              <div className="bg-[#0F172A] border border-white/10 rounded-xl px-3 py-1 flex items-center h-[42px]">
                <DatePicker value={date} onChange={setDate} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              >
                <option value="PKR">PKR (Rs.)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED</option>
                <option value="SAR">SAR</option>
              </select>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Line Items</h3>
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#0F172A]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1E293B]/50 text-xs font-semibold text-slate-400 border-b border-white/5 uppercase">
                  <tr>
                    <th className="px-4 py-3 w-[60px] text-center">Inc</th>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3 w-[80px]">Qty</th>
                    <th className="px-4 py-3 w-[110px]">Price</th>
                    <th className="px-4 py-3 w-[110px]">Total</th>
                    <th className="px-4 py-3 w-[50px] text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item, index) => (
                    <tr 
                      key={index} 
                      className={`hover:bg-white/[0.02] transition-colors ${!item.include ? 'opacity-40 bg-slate-900/50' : ''}`}
                    >
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={item.include}
                          onChange={(e) => handleItemChange(index, 'include', e.target.checked)}
                          className="rounded border-white/10 bg-[#0F172A] text-blue-500 focus:ring-blue-500/30 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={item.name}
                          disabled={!item.include}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          placeholder="Item Name"
                          className={`w-full bg-transparent border-b ${
                            item.include && !item.name.trim() ? 'border-amber-500/50' : 'border-transparent hover:border-white/20 focus:border-blue-500'
                          } px-1 py-0.5 text-white focus:outline-none focus:ring-0 text-sm`}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          value={item.quantity}
                          disabled={!item.include}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          placeholder="1"
                          min="1"
                          className="w-full bg-transparent border-b border-transparent hover:border-white/20 focus:border-blue-500 px-1 py-0.5 text-white focus:outline-none focus:ring-0 text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          value={item.unitPrice}
                          disabled={!item.include}
                          onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          className="w-full bg-transparent border-b border-transparent hover:border-white/20 focus:border-blue-500 px-1 py-0.5 text-white focus:outline-none focus:ring-0 text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-200 tabular-nums">
                        {currency} {item.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => deleteItem(index)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic">
                        No items extracted or all items deleted.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary / Totals Breakdown */}
          <div className="flex flex-col md:flex-row gap-6 md:justify-between pt-4 border-t border-white/5">
            <div className="text-xs text-slate-500 max-w-sm">
              <p>* Line item row total = Quantity × Unit Price.</p>
              <p>* Included items will generate individual expense transactions.</p>
            </div>
            <div className="bg-[#1E293B]/40 border border-white/5 rounded-2xl p-4 w-full md:w-[320px] space-y-3">
              <div className="flex justify-between items-center text-sm text-slate-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-200 tabular-nums">{currency} {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-400 gap-4">
                <span>Tax Amount:</span>
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 bg-[#0F172A] border border-white/10 rounded-lg px-2 py-1 text-right text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="border-t border-white/5 pt-2 flex justify-between items-center text-base font-bold text-white">
                <span>Grand Total:</span>
                <span className="text-blue-400 tabular-nums">{currency} {calculatedGrandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== TABLE MODE ==================== */
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#0F172A]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1E293B]/50 text-xs font-semibold text-slate-400 border-b border-white/5 uppercase">
                <tr>
                  <th className="px-4 py-3 w-[60px] text-center">Inc</th>
                  {headers.map((header, colIndex) => (
                    <th key={colIndex} className="px-4 py-3 min-w-[120px]">
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-white/20 focus:border-blue-500 px-1 py-0.5 text-xs text-white font-bold tracking-wider uppercase focus:outline-none"
                      />
                    </th>
                  ))}
                  <th className="px-4 py-3 w-[50px] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className={`hover:bg-white/[0.02] transition-colors ${!includedRows[rowIndex] ? 'opacity-40 bg-slate-900/50' : ''}`}
                  >
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={includedRows[rowIndex]}
                        onChange={() => toggleRow(rowIndex)}
                        className="rounded border-white/10 bg-[#0F172A] text-blue-500 focus:ring-blue-500/30 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    {row.map((cell, colIndex) => {
                      const isEmptyOrUnreadable = String(cell).trim() === '' || String(cell) === '[Unreadable]';
                      return (
                        <td key={colIndex} className="px-4 py-2.5">
                          <input
                            type="text"
                            value={cell}
                            disabled={!includedRows[rowIndex]}
                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                            placeholder="Value"
                            className={`w-full bg-transparent border-b ${
                              includedRows[rowIndex] && isEmptyOrUnreadable
                                ? 'border-amber-500/50 bg-amber-500/5 focus:bg-transparent'
                                : 'border-transparent hover:border-white/20 focus:border-blue-500'
                            } px-1 py-0.5 text-white focus:outline-none focus:ring-0 text-sm`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => deleteRow(rowIndex)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation Errors panel */}
      {validationErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
            <AlertCircle size={14} />
            <span>Validation Checks Needed ({validationErrors.length})</span>
          </div>
          <ul className="text-xs text-slate-300 list-disc pl-4 space-y-0.5">
            {validationErrors.slice(0, 3).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {validationErrors.length > 3 && (
              <li className="italic text-slate-400">and {validationErrors.length - 3} more...</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
