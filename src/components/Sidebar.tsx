import React from 'react';
import {
  MessageSquare,
  LayoutDashboard,
  GraduationCap,
  Cpu,
  FolderArchive,
  CheckSquare,
  FileText,
  History,
  Settings,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export type NavTab =
  | 'workspace'
  | 'dashboard'
  | 'analyses'
  | 'predictions'
  | 'files'
  | 'action-plans'
  | 'reports'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed = false,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'workspace', label: 'AI Workspace', icon: MessageSquare },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analyses', label: 'Student Analyzer', icon: GraduationCap, badge: 'Flagship' },
    { id: 'predictions', label: 'ML Studio', icon: Cpu, badge: 'ML' },
    { id: 'files', label: 'Data & Files', icon: FolderArchive },
    { id: 'action-plans', label: 'Action Plans', icon: CheckSquare },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'history', label: 'Audit History', icon: History },
    { id: 'settings', label: 'System & Engine', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950/90 backdrop-blur-xl border-r border-slate-800/80 flex flex-col shrink-0 h-screen select-none z-30">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
            AI INSIGHT ENGINE
          </span>
          <span className="text-[10px] tracking-wider uppercase text-indigo-400 font-semibold truncate">
            Think • Analyze • Predict • Act
          </span>
        </div>
      </div>

      {/* Engine Status Banner */}
      <div className="mx-3 my-3 p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-xs">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Orchestration Active
          </span>
          <span className="text-[10px] text-indigo-300/80 font-mono">v1.4 ML</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 py-1">
          Platform Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-900/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge ? (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase ${
                    isActive
                      ? 'bg-indigo-500/30 text-indigo-200'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              ) : (
                isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-xs">
        <div className="rounded-lg p-2.5 bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[11px] font-semibold text-slate-200">ML Pipeline</div>
              <div className="text-[10px] text-slate-400 font-mono">Accuracy: 88.3%</div>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
            READY
          </span>
        </div>
      </div>
    </aside>
  );
};
