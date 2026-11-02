'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  FileSpreadsheet, 
  Sparkles, 
  Database, 
  History, 
  UserCheck, 
  ShieldCheck, 
  Clock,
  Layers
} from 'lucide-react';

export type UserRole = 'estimator' | 'sales_head' | 'plant_head';

interface UserContextType {
  role: UserRole;
  setRole: (r: UserRole) => void;
  userName: string;
}

const UserContext = createContext<UserContextType>({
  role: 'estimator',
  setRole: () => {},
  userName: 'Rajesh Sharma (Senior Estimator)',
});

export const useUser = () => useContext(UserContext);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('estimator');

  useEffect(() => {
    const saved = localStorage.getItem('autoquote_role') as UserRole;
    if (saved) setRoleState(saved);
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('autoquote_role', newRole);
  };

  const userName =
    role === 'sales_head'
      ? 'Vikram Malhotra (VP Sales)'
      : role === 'plant_head'
      ? 'Anand Patil (Plant Head)'
      : 'Rajesh Sharma (Senior Estimator)';

  return (
    <UserContext.Provider value={{ role, setRole, userName }}>
      {children}
    </UserContext.Provider>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { role, setRole, userName } = useUser();

  const navLinks = [
    { href: '/', label: 'RFQ Register', icon: FileSpreadsheet },
    { href: '/rfqs/new', label: 'AI RFQ Intake', icon: Sparkles },
    { href: '/rate-masters', label: 'Rate Masters', icon: Database },
    { href: '/past-quotes', label: 'Past Quotes', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 text-white hover:text-slate-200">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-sm tracking-wider">
                CA
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide flex items-center gap-2">
                  Company A <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">Chakan, Pune</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  AutoQuote AI · RFQ Costing Engine
                </div>
              </div>
            </Link>

            {/* Navigation tabs */}
            <nav className="hidden md:flex items-center ml-6 space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      active
                        ? 'bg-slate-800 text-white border border-slate-700 shadow-inner'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Role Switcher & User Profile */}
          <div className="flex items-center space-x-3">
            
            {/* Rate Master Badge */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Rates v2.0 Active (Oct 2026)
            </div>

            {/* Role Switcher */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded p-0.5">
              <button
                onClick={() => setRole('estimator')}
                className={`px-2.5 py-1 text-xs rounded transition-all flex items-center gap-1 ${
                  role === 'estimator'
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to Estimator view"
              >
                <UserCheck className="w-3 h-3" />
                Estimator
              </button>
              <button
                onClick={() => setRole('sales_head')}
                className={`px-2.5 py-1 text-xs rounded transition-all flex items-center gap-1 ${
                  role === 'sales_head'
                    ? 'bg-amber-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to Sales Head view (Approval authority for > ₹25L)"
              >
                <ShieldCheck className="w-3 h-3" />
                Sales Head
              </button>
            </div>

            {/* Current User Label */}
            <div className="text-right hidden sm:block border-l border-slate-800 pl-3">
              <div className="text-xs font-medium text-slate-200">{userName}</div>
              <div className="text-[10px] text-slate-400">
                {role === 'sales_head' ? 'Sales Head' : role === 'plant_head' ? 'Plant Head' : 'Estimator'} Mode
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
