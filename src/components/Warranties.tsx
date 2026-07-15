import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Plus, Search, Trash2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { WarrantyService } from '../services/WarrantyService';
import { CustomerService } from '../services/CustomerService';
import { InventoryService } from '../services/InventoryService';
import type { Warranty, Customer, InventoryItem } from '../db';
import { useToast } from '../contexts/ToastContext';

export default function Warranties() {
  const { lang, activeContext } = useSettings();
  const { showToast } = useToast();
  
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Warranty State
  const [customerId, setCustomerId] = useState<number>(0);
  const [itemId, setItemId] = useState<number>(0);
  const [serialNumber, setSerialNumber] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [activeContext]);

  const loadData = async () => {
    try {
      const allWarranties = await WarrantyService.getAllByContext(activeContext);
      setWarranties(allWarranties);
      
      const allCustomers = await CustomerService.getAll();
      setCustomers(allCustomers.filter(c => c.type === 'customer'));
      
      const allItems = await InventoryService.getAllByContext(activeContext);
      setInventory(allItems);
    } catch (e) {
      console.error('Failed to load warranties', e);
      showToast('Failed to load warranties', 'error');
    }
  };

  const filteredWarranties = warranties.filter(w => 
    w.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCustomerName = (id: number) => {
    if (id === 0) return 'Walk-in Customer';
    return customers.find(c => c.id === id)?.name || 'Unknown';
  };

  const getItemName = (id: number) => {
    return inventory.find(i => i.id === id)?.name || 'Unknown Item';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) {
      showToast('Please select an item', 'error');
      return;
    }

    try {
      await WarrantyService.add({
        customerId,
        itemId,
        serialNumber,
        saleDate,
        warrantyMonths: Number(warrantyMonths),
        status: 'active',
        context: activeContext
      });
      showToast('Warranty registered', 'success');
      setIsModalOpen(false);
      resetForm();
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to add warranty', 'error');
    }
  };

  const resetForm = () => {
    setCustomerId(0);
    setItemId(0);
    setSerialNumber('');
    setWarrantyMonths('12');
    setSaleDate(new Date().toISOString().split('T')[0]);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this warranty record?')) {
      await WarrantyService.delete(id);
      showToast('Warranty deleted', 'success');
      loadData();
    }
  };

  const getStatusBadge = (warranty: Warranty) => {
    const status = WarrantyService.getCalculatedStatus(warranty);
    switch (status) {
      case 'active': return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1 w-max"><ShieldCheck size={12} /> Active</span>;
      case 'expired': return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold flex items-center gap-1 w-max"><ShieldAlert size={12} /> Expired</span>;
      case 'claimed': return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1 w-max"><Shield size={12} /> Claimed</span>;
      default: return null;
    }
  };

  const calculateExpiryDate = (saleDate: string, months: number) => {
    const d = new Date(saleDate);
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/50 p-6 rounded-3xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Warranties</h1>
            <p className="text-slate-400 text-sm">Track serial numbers and warranty validity</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors w-full sm:w-auto justify-center shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} />
          Register Warranty
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search by serial number..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
        />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWarranties.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-800/30 rounded-3xl border border-white/5">
            <Shield size={48} className="mx-auto mb-4 opacity-20" />
            <p>No warranties found.</p>
          </div>
        ) : (
          filteredWarranties.map(warranty => (
            <div key={warranty.id} className="bg-slate-800/40 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors flex flex-col">
              <div className="flex justify-between items-start mb-3">
                {getStatusBadge(warranty)}
                <button onClick={() => handleDelete(warranty.id!)} className="text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
              
              <h3 className="font-bold text-white text-lg line-clamp-1">{getItemName(warranty.itemId)}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                  SN: {warranty.serialNumber}
                </span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Customer</span>
                  <span className="text-sm font-medium text-slate-300">{getCustomerName(warranty.customerId)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Sale Date</span>
                  <span className="text-sm font-medium text-slate-300">{new Date(warranty.saleDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Duration</span>
                  <span className="text-sm font-medium text-slate-300">{warranty.warrantyMonths} months</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                  <span className="text-xs text-slate-500">Expires On</span>
                  <span className={`text-sm font-bold ${WarrantyService.getCalculatedStatus(warranty) === 'expired' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {calculateExpiryDate(warranty.saleDate, warranty.warrantyMonths)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Warranty Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Register Warranty</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Customer</label>
                <select
                  value={customerId}
                  onChange={e => setCustomerId(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={0}>Walk-in Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Item (Solar Panel, Inverter, etc)</label>
                <select
                  required
                  value={itemId}
                  onChange={e => setItemId(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={0} disabled>Select Item</option>
                  {inventory.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Serial Number</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. SN-987654321"
                  value={serialNumber}
                  onChange={e => setSerialNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Duration (Months)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={warrantyMonths}
                    onChange={e => setWarrantyMonths(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Sale Date</label>
                  <input
                    required
                    type="date"
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
                >
                  Save Warranty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
