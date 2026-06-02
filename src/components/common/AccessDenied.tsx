import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  message?: string;
}

export default function AccessDenied({ message }: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 backdrop-blur-xl border border-red-500/20 rounded-[2rem] text-center max-w-md mx-auto my-12 space-y-6">
      <div className="p-4 bg-red-500/10 text-red-500 rounded-full">
        <ShieldAlert size={48} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">Access Denied</h3>
        <p className="text-sm text-slate-400">
          {message || 'You do not have the required permissions to view this page or resource.'}
        </p>
      </div>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
