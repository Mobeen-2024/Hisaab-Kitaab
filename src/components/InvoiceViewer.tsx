import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Share2 } from 'lucide-react';
import { InvoiceService } from '../services/InvoiceService';
import { CustomerService } from '../services/CustomerService';
import type { Invoice, Customer } from '../db';
import { useSettings } from '../contexts/SettingsContext';

export default function InvoiceViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currency, ownerName, ownerAvatar } = useSettings();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  
  useEffect(() => {
    if (id) {
      loadInvoice(Number(id));
    }
  }, [id]);

  const loadInvoice = async (invoiceId: number) => {
    try {
      const inv = await InvoiceService.getById(invoiceId);
      if (inv) {
        setInvoice(inv);
        if (inv.customerId > 0) {
          const cust = await CustomerService.getAll().then(c => c.find(x => x.id === inv.customerId));
          if (cust) setCustomer(cust);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!invoice) {
    return <div className="p-8 text-center text-white">Loading invoice...</div>;
  }

  const handleWhatsAppShare = () => {
    if (!invoice) return;
    const custName = customer ? customer.name : 'Valued Customer';
    const invId = invoice.id?.toString().padStart(6, '0');
    const text = `Hello ${custName},\n\nHere is the summary of your recent purchase (Invoice INV-${invId}).\nTotal Amount: ${currency} ${invoice.total.toLocaleString()}\n\nThank you for your business with us!\n- _Powered by Hisaib Kitaib_`;
    
    // Extract numbers only for phone, default to empty to let user select
    const phoneNum = customer?.phone?.replace(/[^0-9+]/g, '') || '';
    const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-3xl mx-auto py-8 print:py-0 print:max-w-full">
      {/* Non-printable action bar */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="flex gap-3">
          <button 
            onClick={handleWhatsAppShare}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"
          >
            <Share2 size={20} />
            Share WhatsApp
          </button>
          <button 
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"
          >
            <Printer size={20} />
            Print Invoice
          </button>
        </div>
      </div>

      {/* Printable Invoice Area */}
      <div className="bg-white text-slate-900 p-8 rounded-3xl shadow-xl print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Invoice</h1>
            <p className="text-slate-500 mt-1">INV-{invoice.id?.toString().padStart(6, '0')}</p>
            <p className="text-slate-500">{new Date(invoice.createdAt).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">{ownerName || 'Hisaib Kitaib Business'}</h2>
            <p className="text-slate-500 text-sm">Powered by Hisaib Kitaib</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
          {customer ? (
            <div>
              <p className="font-bold text-lg">{customer.name}</p>
              {customer.phone && <p className="text-slate-600">{customer.phone}</p>}
            </div>
          ) : (
            <p className="font-bold text-lg">Walk-in Customer</p>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-8 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3 px-4 font-bold text-slate-900 border-b">Description</th>
                <th className="py-3 px-4 font-bold text-slate-900 border-b text-center">Qty</th>
                <th className="py-3 px-4 font-bold text-slate-900 border-b text-right">Unit Price</th>
                <th className="py-3 px-4 font-bold text-slate-900 border-b text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items?.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-4">{item.description}</td>
                  <td className="py-3 px-4 text-center">{item.quantity}</td>
                  <td className="py-3 px-4 text-right">{currency} {item.unitPrice.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-medium">{currency} {item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{currency} {invoice.subtotal.toLocaleString()}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>-{currency} {invoice.discount.toLocaleString()}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax</span>
                <span>{currency} {invoice.tax.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-black text-slate-900 border-t pt-3 mt-3">
              <span>Total</span>
              <span>{currency} {invoice.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center text-slate-500 text-sm">
          <p>Thank you for your business!</p>
          <p>Powered by Hisaib Kitaib</p>
        </div>
      </div>
    </div>
  );
}
