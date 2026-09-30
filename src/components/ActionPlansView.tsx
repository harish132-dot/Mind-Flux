import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Award,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { ActionPlanDocument, TaskDocument } from '../types';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

export const ActionPlansView: React.FC = () => {
  const { profile } = useAuth();
  const userId = profile?.uid || 'guest-demo-user';

  const [plans, setPlans] = useState<ActionPlanDocument[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>('all');

  useEffect(() => {
    loadPlans();
  }, [userId]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const list = await firestoreService.getActionPlans(userId);
      setPlans(list || []);
      if (list && list.length > 0) {
        setSelectedPlanId(list[0].id);
        loadPlanTasks(list[0].id);
      }
    } catch (e) {
      console.warn('Failed to load plans:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanTasks = async (planId: string) => {
    try {
      const taskList = await firestoreService.getTasksForPlan(planId, userId);
      setTasks(taskList || []);
    } catch (e) {
      console.warn('Failed to load tasks:', e);
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    loadPlanTasks(planId);
  };

  const handleToggleTaskStatus = async (task: TaskDocument) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    // Optimistic UI update
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));

    try {
      await firestoreService.updateTaskStatus(task.id, task.planId, nextStatus, userId);
      // Refresh plan progress in list
      const updatedPlans = await firestoreService.getActionPlans(userId);
      setPlans(updatedPlans || []);
    } catch (e) {
      console.error('Error toggling task:', e);
      loadPlanTasks(task.planId);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority === 'all') return true;
    return t.priority === filterPriority;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <CheckSquare className="w-4 h-4" />
            Execution Roadmap & Milestone Tracker
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Personalized Action Plans
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Turn recommendations into completed tasks with verified dynamic progress calculation.
          </p>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-4 max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No Action Plans Created</h3>
            <p className="text-xs text-slate-400 mt-1">
              Run a student analysis or ask AI to generate an action plan to create structured weekly tasks.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Plans List (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
              Active Plans ({plans.length})
            </span>
            <div className="space-y-2">
              {plans.map((plan) => {
                const isSelected = plan.id === selectedPlanId;
                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`p-4 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-900/30'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-white truncate">{plan.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          plan.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-indigo-500/20 text-indigo-300'
                        }`}
                      >
                        {plan.status}
                      </span>
                    </div>

                    <p className="text-slate-400 text-[11px] line-clamp-2 mb-3">{plan.targetGoal}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Progress</span>
                        <span className="font-mono font-bold text-slate-200">
                          {plan.completedTasks} / {plan.totalTasks} ({plan.progress}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${plan.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks Detail View (8 Cols) */}
          <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            {selectedPlan ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white">{selectedPlan.title}</h2>
                    <p className="text-xs text-indigo-300 mt-0.5 font-medium">{selectedPlan.targetGoal}</p>
                  </div>

                  {/* Priority Filter */}
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                    <span className="text-slate-500 px-1.5">Priority:</span>
                    {['all', 'critical', 'high', 'medium'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setFilterPriority(p)}
                        className={`px-2 py-0.5 rounded capitalize font-medium ${
                          filterPriority === p ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Celebration Banner when 100% */}
                {selectedPlan.progress === 100 && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/40 flex items-center gap-3 text-xs text-emerald-200">
                    <Award className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold block">100% Roadmap Completed!</span>
                      <span>All academic intervention milestones successfully satisfied.</span>
                    </div>
                  </div>
                )}

                {/* Task Checklist */}
                <div className="space-y-2.5">
                  {filteredTasks.map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTaskStatus(task)}
                        className={`p-3.5 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-3 select-none ${
                          isDone
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-70'
                            : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          className="mt-0.5 text-indigo-400 hover:text-indigo-300"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-500" />
                          )}
                        </button>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`font-semibold text-xs ${
                                isDone ? 'line-through text-slate-500' : 'text-white'
                              }`}
                            >
                              {task.title}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                                task.priority === 'critical'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : task.priority === 'high'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-indigo-500/20 text-indigo-300'
                              }`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          <p className={`text-[11px] leading-relaxed ${isDone ? 'text-slate-600' : 'text-slate-300'}`}>
                            {task.description}
                          </p>

                          <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Est: {task.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Due: {task.dueDate}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500 text-center py-10">Select an action plan to view tasks.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
