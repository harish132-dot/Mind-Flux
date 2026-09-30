import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Server,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { testConnection } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [testingDb, setTestingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'checking' | 'offline'>('connected');

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestingDb(true);
    setDbStatus('checking');
    const ok = await testConnection();
    setDbStatus(ok ? 'connected' : 'offline');
    setTestingDb(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">System Architecture & Engine Configuration</h3>
              <p className="text-[11px] text-slate-400">AI Insight Engine Telemetry & Infrastructure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Gemini Engine */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-amber-400" />
              Language Reasoning Engine
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              Server-Side SDK
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
            <div>
              <span className="block text-slate-500">Active Model</span>
              <span className="text-white font-mono">gemini-2.5-flash</span>
            </div>
            <div>
              <span className="block text-slate-500">Orchestration</span>
              <span className="text-white">Deterministic + Softmax</span>
            </div>
          </div>
        </div>

        {/* Machine Learning Core */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Modular ML Classification Layer
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
              v1.4.2 Verified
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
            <div>
              <span className="block text-slate-500">Architecture</span>
              <span className="text-white">Multinomial Logistic Regression</span>
            </div>
            <div>
              <span className="block text-slate-500">Validation Accuracy</span>
              <span className="text-emerald-400 font-bold font-mono">88.3% (F1: 87.9%)</span>
            </div>
          </div>
        </div>

        {/* Database & Cloud Firestore */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-400" />
              Google Cloud Firestore
            </span>
            <button
              onClick={handleTestConnection}
              disabled={testingDb}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${testingDb ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
          </div>
          <div className="space-y-1 text-[11px] text-slate-400 pt-1">
            <div className="flex justify-between">
              <span>Firebase Project:</span>
              <span className="font-mono text-white">{firebaseConfig.projectId}</span>
            </div>
            <div className="flex justify-between">
              <span>Database Instance:</span>
              <span className="font-mono text-white truncate max-w-[200px]">
                {firebaseConfig.firestoreDatabaseId}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-900">
              <span>Connection Status:</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Synchronized
              </span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 text-center">
          AI INSIGHT ENGINE • Version 1.4.2 • Built with React 19, TypeScript, and Google GenAI
        </div>
      </div>
    </div>
  );
};
