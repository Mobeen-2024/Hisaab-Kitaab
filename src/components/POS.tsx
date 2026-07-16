import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, ArrowRight, Printer } from 'lucide-react';
import { VirtuosoGrid } from 'react-virtuoso';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { InventoryService } from '../services/InventoryService';
import { CustomerService } from '../services/CustomerService';
import { InvoiceService } from '../services/InvoiceService';
import type { InventoryItem, Customer } from '../db';
import { useToast } from '../contexts/ToastContext';

interface CartItem {
  item: InventoryItem;
  quantity: number;
}

export default function POS() {
  const { lang, currency, activeContext, businessMode } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0); // 0 = Walk-in
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeContext]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = async () => {
    try {
      const allItems = await InventoryService.getAllByContext(activeContext);
      setItems(allItems.filter(i => i.quantity > 0)); // Only show in-stock items
      
      const allCustomers = await CustomerService.getAll();
      setCustomers(allCustomers.filter(c => c.type === 'customer'));
    } catch (error) {
      console.error('Failed to load POS data', error);
      showToast('Failed to load inventory', 'error');
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [items, debouncedSearchQuery]);

  const addToCart = (item: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          showToast(`Only ${item.quantity} in stock`, 'error');
          return prev;
        }
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.item.id === itemId) {
        const newQ = c.quantity + delta;
        if (newQ > c.item.quantity) {
          showToast(`Only ${c.item.quantity} in stock`, 'error');
          return c;
        }
        return { ...c, quantity: Math.max(1, newQ) };
      }
      return c;
    }));
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  const subtotal = cart.reduce((sum, c) => sum + (c.item.unitPrice * c.quantity), 0);
  const total = subtotal + tax - discount;

  const handleCheckout = async () => {
    if (cart.length === 0) return showToast('Cart is empty', 'error');
    if (total < 0) return showToast('Total cannot be negative', 'error');

    setIsProcessing(true);
    try {
      const invoiceId = await InvoiceService.create({
        customerId: selectedCustomerId,
        type: 'invoice',
        subtotal,
        tax,
        discount,
        total,
        context: activeContext,
        items: cart.map(c => ({
          itemId: c.item.id,
          description: c.item.name,
          quantity: c.quantity,
          unitPrice: c.item.unitPrice,
          total: c.quantity * c.item.unitPrice
        }))
      });
      
      showToast('Sale completed successfully!', 'success');
      navigate(`/invoice/${invoiceId}`);
    } catch (error) {
      console.error('Checkout failed', error);
      showToast('Failed to complete sale', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row gap-6 -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 bg-slate-900/50">
      
      {/* Left Area - Inventory Grid */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-800/40 rounded-3xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No items found. Make sure you have items in stock.
            </div>
          ) : (
            <VirtuosoGrid
              style={{ height: '100%' }}
              data={filteredItems}
              components={{
                List: React.forwardRef((props, ref) => (
                  <div {...props} ref={ref} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4" />
                )),
                Item: React.forwardRef((props, ref) => (
                  <div {...props} ref={ref} className="h-full" />
                ))
              }}
              itemContent={(index, item) => (
                <div 
                  onClick={() => addToCart(item)}
                  className="bg-slate-700/30 hover:bg-slate-700/60 border border-white/5 rounded-2xl p-4 cursor-pointer transition-colors group flex flex-col h-full"
                >
                  <div className="flex-1">
                    <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                      {item.name}
                    </h3>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Stock: {item.quantity}</p>
                      <p className="font-bold text-white">{currency} {item.unitPrice.toLocaleString()}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <Plus size={16} />
                    </div>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* Right Area - Cart */}
      <div className="w-full md:w-96 flex flex-col min-h-0 bg-[#0F172A]/80 backdrop-blur-3xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-slate-800/50 flex items-center gap-3">
          <ShoppingCart className="text-blue-400" />
          <h2 className="text-lg font-black text-white">Current Sale</h2>
        </div>

        {/* Customer Selection */}
        <div className="p-4 border-b border-white/10 bg-slate-900/30">
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Customer</span>
          </div>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value={0}>Walk-in Customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
              <ShoppingCart size={48} className="opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(c => (
              <div key={c.item.id} className="bg-white/5 rounded-xl p-3 flex gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate">{c.item.name}</h4>
                  <p className="text-sm text-slate-400">{currency} {c.item.unitPrice.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <p className="font-bold text-white">{currency} {(c.quantity * c.item.unitPrice).toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2 bg-slate-900/50 rounded-lg p-1">
                    <button onClick={() => updateQuantity(c.item.id, -1)} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{c.quantity}</span>
                    <button onClick={() => updateQuantity(c.item.id, 1)} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => removeFromCart(c.item.id)} className="p-1 text-red-400 hover:text-red-300 rounded-md hover:bg-red-400/10 ml-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Checkout */}
        <div className="p-4 bg-slate-800/80 border-t border-white/10 space-y-3">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Subtotal</span>
            <span>{currency} {subtotal.toLocaleString()}</span>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Discount</label>
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-white text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Tax</label>
              <input
                type="number"
                min="0"
                value={tax || ''}
                onChange={(e) => setTax(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-white text-sm"
              />
            </div>
          </div>

          <div className="flex justify-between items-end pt-2 border-t border-white/10">
            <span className="font-bold text-white">Total</span>
            <span className="text-2xl font-black text-blue-400">{currency} {total.toLocaleString()}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className="w-full mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isProcessing ? 'Processing...' : (
              <>
                <Printer size={20} />
                Checkout & Print
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
