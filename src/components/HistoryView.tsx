import React, { useState, useEffect } from 'react';
import {
  History,
  GraduationCap,
  Cpu,
  Clock,
  Trash2,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

interface HistoryViewProps {
  onSelectSession: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onSelectSession }) => {
  const { profile } = useAuth();
  const userId = profile?.uid || 'guest-demo-user';

  const [analyses, setAnalyses] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [userId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        firestoreService.getAnalyses(userId).catch(() => []),
        firestoreService.getPredictions(userId).catch(() => []),
      ]);
      setAnalyses(a || []);
      setPredictions(p || []);
    } catch (e) {
      console.warn('History load error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <History className="w-4 h-4" />
            Audit Trail & Persistent Logs
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            System Activity & History Log
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of student performance diagnostic runs and machine learning inferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagnostic Analyses Audit */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              Student Analyses Log ({analyses.length})
            </h3>
          </div>

          {analyses.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No student analyses logged yet.</p>
          ) : (
            <div className="space-y-2">
              {analyses.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{item.studentName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {item.department} • Semester {item.semester}
                  </div>
                  <div className="flex items-center gap-3 pt-1 text-[11px]">
                    <span className="text-indigo-300 font-mono font-semibold">
                      Composite: {item.overallScore}
                    </span>
                    <span className="text-slate-400">Attendance: {item.attendancePercentage}%</span>
                    <span className="text-amber-400 font-semibold">{item.academicRisk}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Machine Learning Inferences Audit */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              ML Prediction Inferences Log ({predictions.length})
            </h3>
          </div>

          {predictions.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No ML inference runs logged yet.</p>
          ) : (
            <div className="space-y-2">
              {predictions.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{p.studentName || 'Student'}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Model: {p.modelType} ({p.modelVersion})
                  </div>
                  <div className="flex items-center gap-3 pt-1 text-[11px]">
                    <span className="text-emerald-400 font-bold">{p.predictedClass}</span>
                    <span className="text-slate-300 font-mono">
                      {(p.confidence * 100).toFixed(1)}% Confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
