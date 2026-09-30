import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  MessageSquare,
  Cpu,
  CheckSquare,
  TrendingUp,
  AlertCircle,
  Plus,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import { ActionPlanDocument, TaskDocument } from '../types';

interface DashboardViewProps {
  onNavigateToAnalyzer: () => void;
  onNavigateToPlans: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToAnalyzer,
  onNavigateToPlans,
}) => {
  const { profile } = useAuth();
  const userId = profile?.uid || 'guest-demo-user';

  const [analyses, setAnalyses] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlanDocument[]>([]);
  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [a, p, ap, t, c] = await Promise.all([
        firestoreService.getAnalyses(userId).catch(() => []),
        firestoreService.getPredictions(userId).catch(() => []),
        firestoreService.getActionPlans(userId).catch(() => []),
        firestoreService.getAllTasks(userId).catch(() => []),
        firestoreService.getConversations(userId).catch(() => []),
      ]);
      setAnalyses(a || []);
      setPredictions(p || []);
      setActionPlans(ap || []);
      setTasks(t || []);
      setConversations(c || []);
    } catch (e) {
      console.warn('Dashboard data fetch:', e);
    } finally {
      setLoading(false);
    }
  };

  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const hasData = analyses.length > 0 || predictions.length > 0 || actionPlans.length > 0;

  // Chart data from actual records
  const trendData = analyses.map((a, i) => ({
    name: a.studentName || `Record ${i + 1}`,
    score: a.overallScore || a.metrics?.compositeAcademicScore || 0,
    attendance: a.attendancePercentage || 0,
  }));

  // Prediction class breakdown from actual predictions
  const predictionCounts: Record<string, number> = {};
  predictions.forEach((p) => {
    const cls = p.predictedClass || 'Unknown';
    predictionCounts[cls] = (predictionCounts[cls] || 0) + 1;
  });

  const pieData = Object.entries(predictionCounts).map(([name, count]) => ({
    name,
    value: count,
  }));

  const PIE_COLORS: Record<string, string> = {
    'High Performance': '#10b981',
    'Moderate Performance': '#6366f1',
    'Needs Improvement': '#f43f5e',
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <LayoutDashboard className="w-4 h-4" />
            Executive Intelligence Overview
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Analytics & Cohort Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time telemetry aggregated from cloud persistent records.
          </p>
        </div>

        <button
          onClick={onNavigateToAnalyzer}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          Run Student Analysis
        </button>
      </div>

      {/* Metric KPI Cards (Actual Counts) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Analyses</span>
            <GraduationCap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{analyses.length}</div>
          <span className="text-[10px] text-slate-500">Stored diagnostics</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Conversations</span>
            <MessageSquare className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{conversations.length}</div>
          <span className="text-[10px] text-slate-500">Active AI sessions</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">ML Predictions</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{predictions.length}</div>
          <span className="text-[10px] text-slate-500">Evaluated outcomes</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Action Plans</span>
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{actionPlans.length}</div>
          <span className="text-[10px] text-slate-500">Active roadmaps</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Completed Tasks</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {completedTasksCount}
            <span className="text-xs text-slate-500 font-normal"> / {tasks.length}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">
            {tasks.length > 0 ? `${Math.round((completedTasksCount / tasks.length) * 100)}% execution` : '0%'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {!hasData ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Diagnostic Records Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Per platform standards, dashboard statistics are never fabricated. Run your first Student Intelligence Analysis to populate live Recharts trends, risk meters, and prediction distributions.
            </p>
          </div>
          <button
            onClick={onNavigateToAnalyzer}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Launch Student Analyzer Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Performance Trend Chart (8 Cols) */}
          <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Analyzed Student Composite Score Trend</h3>
                <p className="text-[11px] text-slate-400">Actual values saved in Firestore database</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                {analyses.length} Records
              </span>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#scoreGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Prediction Class Distribution Pie (4 Cols) */}
          <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
                <h3 className="text-sm font-bold text-white">Prediction Breakdown</h3>
                <span className="text-[10px] text-slate-400 font-mono">{predictions.length} Total</span>
              </div>

              {pieData.length > 0 ? (
                <div className="w-full h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={45}
                        paddingAngle={4}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[entry.name] || '#6366f1'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-10 text-center">No predictions recorded.</p>
              )}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px]">
              {pieData.map((item) => (
                <div key={item.name} className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[item.name] || '#6366f1' }}
                    />
                    <span>{item.name}</span>
                  </span>
                  <span className="font-mono font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Action Plans Table */}
          <div className="lg:col-span-12 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Recent Action Plans & Progress</h3>
              <button
                onClick={onNavigateToPlans}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View All Plans →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2">Plan Title</th>
                    <th className="py-2">Target Goal</th>
                    <th className="py-2">Tasks Completed</th>
                    <th className="py-2">Progress</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {actionPlans.slice(0, 5).map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 font-medium text-white">{plan.title}</td>
                      <td className="py-2.5 text-slate-300 truncate max-w-xs">{plan.targetGoal}</td>
                      <td className="py-2.5 text-slate-300 font-mono">
                        {plan.completedTasks} / {plan.totalTasks}
                      </td>
                      <td className="py-2.5 w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${plan.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{plan.progress}%</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                            plan.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-indigo-500/20 text-indigo-300'
                          }`}
                        >
                          {plan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
