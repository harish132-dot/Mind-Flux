import React from 'react';
import {
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  Sparkles,
  Plus,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavTab } from './Sidebar';

interface TopbarProps {
  onOpenAuth: () => void;
  onNavigate: (tab: NavTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenAuth,
  onNavigate,
  searchQuery,
  onSearchChange,
}) => {
  const { currentUser, profile, logout, isGuest } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Search Input */}
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search analyses, conversations, students, predictions..."
          className="w-full pl-10 pr-4 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
        />
      </div>

      {/* Center Engine Badges */}
      <div className="hidden lg:flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>LLM:</span>
          <span className="font-mono text-indigo-300 font-medium">gemini-2.5-flash</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>ML:</span>
          <span className="font-mono text-emerald-300 font-medium">Multinomial-LR v1.4</span>
        </div>
      </div>

      {/* Right Action & User Profile */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('analyses')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New Student Analysis
        </button>

        {currentUser || isGuest ? (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white uppercase shadow ring-1 ring-white/10">
                {profile?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                  {profile?.displayName || currentUser?.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isGuest ? 'Demo Mode' : 'Verified'}
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 shadow-sm transition-all cursor-pointer"
          >
            <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
