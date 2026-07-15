import React, { useState, useEffect } from 'react';
import { Wrench, Plus, CheckCircle, Clock, CheckSquare, Search, Trash2, Phone, Share2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { RepairService } from '../services/RepairService';
import { CustomerService } from '../services/CustomerService';
import type { RepairJob, Customer } from '../db';
import { useToast } from '../contexts/ToastContext';

export default function RepairJobs() {
  const { lang, currency, activeContext } = useSettings();
  const { showToast } = useToast();
  
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Job State
  const [customerId, setCustomerId] = useState<number>(0);
  const [deviceModel, setDeviceModel] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');

  useEffect(() => {
    loadData();
  }, [activeContext]);

  const loadData = async () => {
    try {
      const allJobs = await RepairService.getAllByContext(activeContext);
      setJobs(allJobs);
      
      const allCustomers = await CustomerService.getAll();
      setCustomers(allCustomers.filter(c => c.type === 'customer'));
    } catch (e) {
      console.error('Failed to load repair jobs', e);
      showToast('Failed to load repair jobs', 'error');
    }
  };

  const filteredJobs = jobs.filter(j => 
    j.deviceModel.toLowerCase().includes(searchQuery.toLowerCase()) || 
    j.issueDescription.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCustomerName = (id: number) => {
    if (id === 0) return 'Walk-in Customer';
    return customers.find(c => c.id === id)?.name || 'Unknown';
  };

  const getCustomerPhone = (id: number) => {
    if (id === 0) return '';
    return customers.find(c => c.id === id)?.phone || '';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await RepairService.add({
        customerId,
        deviceModel,
        issueDescription,
        status: 'pending',
        estimatedCost: Number(estimatedCost),
        context: activeContext
      });
      showToast('Repair job added', 'success');
      setIsModalOpen(false);
      resetForm();
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to add repair job', 'error');
    }
  };

  const resetForm = () => {
    setCustomerId(0);
    setDeviceModel('');
    setIssueDescription('');
    setEstimatedCost('');
  };

  const handleShareRepair = (job: RepairJob) => {
    const customerName = getCustomerName(job.customerId);
    const phone = getCustomerPhone(job.customerId);
    
    let message = `Hello ${customerName},\n\n`;
    if (job.status === 'ready') {
      message += `Good news! Your device (${job.deviceModel}) is repaired and ready for pickup.\nEstimated Cost: ${currency} ${job.estimatedCost.toLocaleString()}\n\nPlease visit the shop to collect it.\n`;
    } else if (job.status === 'pending') {
      message += `Your device (${job.deviceModel}) has been received for repair.\nEstimated Cost: ${currency} ${job.estimatedCost.toLocaleString()}\nWe will notify you when it is ready.\n`;
    } else {
      message += `Your device (${job.deviceModel}) repair is marked as completed.\nThank you for choosing us!\n`;
    }
    message += `\n- _Powered by Hisaib Kitaib_`;

    let phoneNum = phone?.replace(/[^0-9]/g, '') || '';
    if (phoneNum.startsWith('0')) {
      phoneNum = '92' + phoneNum.substring(1);
    }
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleStatusChange = async (job: RepairJob, newStatus: 'pending' | 'ready' | 'delivered') => {
    try {
      if (newStatus === 'delivered') {
        // Will auto-generate transaction
        if (confirm(`Mark as delivered? This will generate a payment transaction of ${currency} ${job.estimatedCost}.`)) {
          await RepairService.deliverAndPay(job.id!);
          showToast('Job delivered and payment recorded', 'success');
        }
      } else {
        await RepairService.update(job.id!, { status: newStatus });
        showToast(`Job marked as ${newStatus}`, 'success');
      }
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this job?')) {
      await RepairService.delete(id);
      showToast('Job deleted', 'success');
      loadData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1 w-max"><Clock size={12} /> Pending</span>;
      case 'ready': return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold flex items-center gap-1 w-max"><CheckSquare size={12} /> Ready</span>;
      case 'delivered': return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1 w-max"><CheckCircle size={12} /> Delivered</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/50 p-6 rounded-3xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
            <Wrench size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Repair Jobs</h1>
            <p className="text-slate-400 text-sm">Manage repair job cards and statuses</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors w-full sm:w-auto justify-center shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} />
          New Job Card
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search by device model or issue..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Jobs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-800/30 rounded-3xl border border-white/5">
            <Wrench size={48} className="mx-auto mb-4 opacity-20" />
            <p>No repair jobs found.</p>
          </div>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="bg-slate-800/40 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors flex flex-col">
              <div className="flex justify-between items-start mb-3">
                {getStatusBadge(job.status)}
                <span className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
              
              <h3 className="font-bold text-white text-lg line-clamp-1">{job.deviceModel}</h3>
              <p className="text-sm text-slate-400 mt-1 line-clamp-2 min-h-[40px]">{job.issueDescription}</p>
              
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Customer</span>
                  <span className="text-sm font-medium text-slate-300">{getCustomerName(job.customerId)}</span>
                </div>
                {getCustomerPhone(job.customerId) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Contact</span>
                    <a href={`tel:${getCustomerPhone(job.customerId)}`} className="text-sm font-medium text-blue-400 flex items-center gap-1 hover:underline">
                      <Phone size={12} /> {getCustomerPhone(job.customerId)}
                    </a>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Est. Cost</span>
                  <span className="text-sm font-bold text-white">{currency} {job.estimatedCost.toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 flex items-center justify-between gap-2 border-t border-white/5">
                {job.status === 'pending' && (
                  <button onClick={() => handleStatusChange(job, 'ready')} className="flex-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 py-2 rounded-lg text-sm font-bold transition-colors">
                    Mark Ready
                  </button>
                )}
                {job.status === 'ready' && (
                  <button onClick={() => handleStatusChange(job, 'delivered')} className="flex-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 py-2 rounded-lg text-sm font-bold transition-colors">
                    Deliver & Pay
                  </button>
                )}
                {job.status === 'delivered' && (
                  <div className="flex-1 text-center py-2 text-sm text-emerald-500/50 font-bold">
                    Completed
                  </div>
                )}
                <button onClick={() => handleShareRepair(job)} className="p-2 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors" title="Notify via WhatsApp">
                  <Share2 size={16} />
                </button>
                <button onClick={() => handleDelete(job.id!)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">New Repair Job</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Customer</label>
                <select
                  value={customerId}
                  onChange={e => setCustomerId(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={0}>Walk-in Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Device Model / Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. iPhone 13 Pro"
                  value={deviceModel}
                  onChange={e => setDeviceModel(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Issue Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Screen cracked, battery dying fast..."
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Estimated Cost ({currency})</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={estimatedCost}
                  onChange={e => setEstimatedCost(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
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
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
                >
                  Create Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
