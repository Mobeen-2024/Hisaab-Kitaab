import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, FileText, LayoutGrid, Menu } from 'lucide-react';

export default function BottomNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A]/90 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between px-2 z-40" style={{ paddingBottom: 'var(--safe-bottom)', height: 'calc(4rem + var(--safe-bottom))' }}>
      <NavLink
        to="/"
        className={({ isActive }) => `flex-1 flex flex-col items-center justify-center h-16 gap-1 ${isActive ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
      >
        <LayoutGrid size={20} />
        <span className="text-[10px] font-medium">Home</span>
      </NavLink>

      <NavLink
        to="/menu"
        className={({ isActive }) => `flex-1 flex flex-col items-center justify-center h-16 gap-1 ${isActive ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}
      >
        <Menu size={20} />
        <span className="text-[10px] font-medium">Menu</span>
      </NavLink>

      {/* FAB Spacer */}
      <div className="w-16 h-full pointer-events-none"></div>

      <NavLink
        to="/reports"
        className={({ isActive }) => `flex-1 flex flex-col items-center justify-center h-16 gap-1 ${isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}
      >
        <FileText size={20} />
        <span className="text-[10px] font-medium">Reports</span>
      </NavLink>

      <NavLink
        to="/customers"
        className={({ isActive }) => `flex-1 flex flex-col items-center justify-center h-16 gap-1 ${isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-white'}`}
      >
        <Users size={20} />
        <span className="text-[10px] font-medium">Khata</span>
      </NavLink>
    </div>
  );
}
