import React, { useState } from 'react';
import {
  FolderArchive,
  Upload,
  FileSpreadsheet,
  FileText,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Eye,
  Sparkles,
  ArrowRight,
  Database,
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { DatasetStatistics } from '../types';
import { processDatasetStats } from '../server/api';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

interface FilesViewProps {
  onAnalyzeWithAi: (summaryText: string) => void;
}

const SAMPLE_CSV = `StudentId,Name,Department,Semester,AttendancePct,Math,Python,Database,Projects,Backlogs,CGPA
ST01,Aarav Sharma,Computer Science,6,92,91,88,86,4,0,8.8
ST02,Priya Patel,Information Tech,5,78,62,68,74,2,0,7.1
ST03,Rohan Kumar,Electronics,4,61,42,50,52,0,2,5.6
ST04,Neha Reddy,Computer Science,6,88,85,92,84,3,0,8.4
ST05,Vikram Singh,Mechanical,5,72,58,64,60,1,1,6.5
ST06,Ananya Roy,Information Tech,6,95,94,90,92,5,0,9.2
ST07,Karan Verma,Computer Science,4,65,48,55,58,1,1,5.9
ST08,Pooja Hegde,Electronics,5,82,75,80,78,3,0,7.8
ST09,Suresh Raina,Mechanical,4,58,38,45,42,0,3,4.9
ST10,Divya Iyer,Computer Science,6,91,89,92,88,4,0,8.9`;

export const FilesView: React.FC<FilesViewProps> = ({ onAnalyzeWithAi }) => {
  const { profile } = useAuth();
  const userId = profile?.uid || 'guest-demo-user';

  const [fileName, setFileName] = useState<string>('student_cohort_2026.csv');
  const [fileSize, setFileSize] = useState<number>(1024);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [stats, setStats] = useState<DatasetStatistics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sample dataset on mount
  React.useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = () => {
    const parsed = Papa.parse(SAMPLE_CSV, { header: true, dynamicTyping: true });
    const rows = (parsed.data as Record<string, any>[]).filter(r => Object.keys(r).length > 2);
    setParsedRows(rows);
    const computedStats = processDatasetStats(rows);
    setStats(computedStats);
    setFileName('student_cohort_2026.csv');
    setFileSize(SAMPLE_CSV.length);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);
    setFileName(file.name);
    setFileSize(file.size);

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as Record<string, any>[];
          setParsedRows(rows);
          const s = processDatasetStats(rows);
          setStats(s);
          setIsProcessing(false);

          // Save metadata
          firestoreService.saveUploadedFileMetadata(userId, {
            fileName: file.name,
            fileSize: file.size,
            fileType: 'csv',
            rowCount: rows.length,
            columnNames: Object.keys(rows[0] || {}),
            summaryStats: s,
          }).catch(console.warn);
        },
        error: (err) => {
          setError(`CSV parse failed: ${err.message}`);
          setIsProcessing(false);
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
          setParsedRows(rows);
          const s = processDatasetStats(rows);
          setStats(s);
          setIsProcessing(false);

          firestoreService.saveUploadedFileMetadata(userId, {
            fileName: file.name,
            fileSize: file.size,
            fileType: ext,
            rowCount: rows.length,
            columnNames: Object.keys(rows[0] || {}),
            summaryStats: s,
          }).catch(console.warn);
        } catch (err: any) {
          setError(`Spreadsheet parse error: ${err.message}`);
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Unsupported file type. Please upload CSV or XLSX format.');
      setIsProcessing(false);
    }
  };

  const handleAskAiAboutData = () => {
    if (!stats) return;
    const summary = `Analyze this dataset "${fileName}" with ${stats.rowCount} records and ${stats.columnCount} features (${stats.columns.map(c => c.name).join(', ')}). Provide key distributional insights, correlations, and performance outliers.`;
    onAnalyzeWithAi(summary);
  };

  // Bar chart of averages for numeric columns
  const numericColumns = stats?.columns.filter(c => c.type === 'number' && c.mean !== undefined) || [];
  const chartData = numericColumns.map(c => ({
    name: c.name,
    mean: c.mean,
    stdDev: c.stdDev,
  }));

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <FolderArchive className="w-4 h-4" />
            Tabular Dataset & Document Intelligence
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            File Management & Statistical Profiling
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated column type inference, missing value detection, summary metrics, and safe parsing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSampleData}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Load Sample Cohort CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 transition-colors text-center relative group">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="max-w-sm mx-auto space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
            <Upload className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-white">
            Click to upload or drag & drop CSV or Excel spreadsheet
          </div>
          <p className="text-[11px] text-slate-500">
            Client-side parsing ensures spreadsheet macros are never executed and untrusted formulas are safely sanitized.
          </p>
        </div>
      </div>

      {/* Active File Summary Bar */}
      {stats && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{fileName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {(fileSize / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {stats.rowCount} Rows • {stats.columnCount} Columns
              </div>
            </div>
          </div>

          <button
            onClick={handleAskAiAboutData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer self-start md:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analyze Dataset with AI
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabular Data Preview */}
      {parsedRows.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              Tabular Preview (Showing first {Math.min(10, parsedRows.length)} rows)
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Read-only preview</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  {Object.keys(parsedRows[0] || {}).map((col) => (
                    <th key={col} className="p-2 font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {parsedRows.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    {Object.values(row).map((val, cIdx) => (
                      <td key={cIdx} className="p-2 text-slate-300 truncate max-w-[140px]">
                        {String(val ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statistical Summary Cards */}
      {stats && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Column Statistical Profiles & Distribution
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.columns.map((col) => (
              <div key={col.name} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white truncate max-w-[130px]">{col.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">
                    {col.type}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span>Missing Values:</span>
                    <span className="font-mono text-slate-200">{col.missingCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique Values:</span>
                    <span className="font-mono text-slate-200">{col.uniqueCount}</span>
                  </div>
                  {col.mean !== undefined && (
                    <>
                      <div className="flex justify-between">
                        <span>Mean (Avg):</span>
                        <span className="font-mono text-emerald-400 font-semibold">{col.mean}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Median:</span>
                        <span className="font-mono text-slate-200">{col.median}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Min / Max:</span>
                        <span className="font-mono text-slate-200">{col.min} / {col.max}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Numeric Features Means Chart */}
          {chartData.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white">Numeric Column Averages Comparison</h4>
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Bar dataKey="mean" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
