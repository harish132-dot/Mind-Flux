import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  Cpu,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  FileDown,
  RefreshCw,
  Sliders,
  ChevronRight,
  BookOpen,
  Award,
  Clock,
  Send,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { StudentInput, StudentCalculatedMetrics, MLPredictionResult } from '../types';
import { calculateStudentMetrics, generateRuleBasedRecommendations } from '../ml/studentAnalytics';
import { predictStudentPerformance } from '../ml/inference';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

interface StudentAnalyzerViewProps {
  onOpenInChat: (student: StudentInput, metrics: StudentCalculatedMetrics, prediction: MLPredictionResult) => void;
  onPlanCreated?: () => void;
}

const PRESETS: Record<string, StudentInput> = {
  high: {
    studentName: 'Aarav Sharma',
    age: 21,
    department: 'Computer Science & Engineering',
    semester: 6,
    attendancePercentage: 92,
    subjectMarks: {
      python: 88,
      mathematics: 91,
      databaseSystems: 86,
      operatingSystems: 84,
      webDevelopment: 90,
    },
    internalMarks: 23,
    maxInternalMarks: 25,
    aptitudeScore: 88,
    communicationScore: 84,
    technicalSkillScore: 90,
    numberOfProjects: 4,
    numberOfCertifications: 3,
    studyHoursPerWeek: 18,
    backlogs: 0,
    previousSemesterGpa: 8.8,
  },
  moderate: {
    studentName: 'Priya Patel',
    age: 20,
    department: 'Information Technology',
    semester: 5,
    attendancePercentage: 78,
    subjectMarks: {
      python: 68,
      mathematics: 62,
      databaseSystems: 74,
      operatingSystems: 66,
      webDevelopment: 70,
    },
    internalMarks: 18,
    maxInternalMarks: 25,
    aptitudeScore: 68,
    communicationScore: 72,
    technicalSkillScore: 65,
    numberOfProjects: 2,
    numberOfCertifications: 1,
    studyHoursPerWeek: 11,
    backlogs: 0,
    previousSemesterGpa: 7.1,
  },
  atRisk: {
    studentName: 'Rohan Kumar',
    age: 21,
    department: 'Electronics & Communication',
    semester: 4,
    attendancePercentage: 61,
    subjectMarks: {
      signalsAndSystems: 48,
      mathematics: 42,
      digitalElectronics: 52,
      cProgramming: 50,
      analogCircuits: 45,
    },
    internalMarks: 11,
    maxInternalMarks: 25,
    aptitudeScore: 46,
    communicationScore: 54,
    technicalSkillScore: 45,
    numberOfProjects: 0,
    numberOfCertifications: 0,
    studyHoursPerWeek: 5,
    backlogs: 2,
    previousSemesterGpa: 5.6,
  },
};

export const StudentAnalyzerView: React.FC<StudentAnalyzerViewProps> = ({
  onOpenInChat,
  onPlanCreated,
}) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState<StudentInput>(PRESETS.moderate);
  const [calculated, setCalculated] = useState<StudentCalculatedMetrics>(() => calculateStudentMetrics(PRESETS.moderate));
  const [prediction, setPrediction] = useState<MLPredictionResult>(() => predictStudentPerformance(PRESETS.moderate));
  const [planSaved, setPlanSaved] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const handlePresetSelect = (presetKey: 'high' | 'moderate' | 'atRisk') => {
    const selected = PRESETS[presetKey];
    setFormData(selected);
    const m = calculateStudentMetrics(selected);
    const p = predictStudentPerformance(selected);
    setCalculated(m);
    setPrediction(p);
    setPlanSaved(false);
  };

  const handleInputChange = (field: keyof StudentInput, val: any) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
    const m = calculateStudentMetrics(updated);
    const p = predictStudentPerformance(updated);
    setCalculated(m);
    setPrediction(p);
    setPlanSaved(false);
  };

  const handleSubjectMarkChange = (sub: string, score: number) => {
    const updatedMarks = { ...formData.subjectMarks, [sub]: score };
    const updated = { ...formData, subjectMarks: updatedMarks };
    setFormData(updated);
    const m = calculateStudentMetrics(updated);
    const p = predictStudentPerformance(updated);
    setCalculated(m);
    setPrediction(p);
    setPlanSaved(false);
  };

  const handleCreateActionPlan = async () => {
    if (!profile) return;
    setSavingPlan(true);
    try {
      const recs = generateRuleBasedRecommendations(formData, calculated);
      await firestoreService.createActionPlan(profile.uid, {
        title: `Academic Growth Plan for ${formData.studentName} (Sem ${formData.semester})`,
        targetGoal: `Target: Elevate ${calculated.academicTrend === 'Declining' ? 'stabilize & improve' : 'advance to top honors'} and clear academic risks.`,
        tasks: recs.map((r, i) => ({
          title: r.title,
          description: r.nextAction,
          priority: r.priority,
          duration: r.difficulty === 'easy' ? '1 week' : r.difficulty === 'medium' ? '2 weeks' : '4 weeks',
          dueDateDays: (i + 1) * 7,
        })),
      });

      // Also persist analysis and prediction
      await firestoreService.saveAnalysis(profile.uid, {
        studentName: formData.studentName,
        department: formData.department,
        semester: formData.semester,
        metrics: calculated,
      });

      await firestoreService.savePrediction(profile.uid, {
        studentName: formData.studentName,
        prediction,
      });

      setPlanSaved(true);
      if (onPlanCreated) onPlanCreated();
    } catch (e) {
      console.error('Failed to create action plan:', e);
    } finally {
      setSavingPlan(false);
    }
  };

  // Recharts Radar data
  const radarData = [
    { subject: 'Technical', value: calculated.skillProfile.technical, fullMark: 100 },
    { subject: 'Communication', value: calculated.skillProfile.communication, fullMark: 100 },
    { subject: 'Aptitude', value: calculated.skillProfile.aptitude, fullMark: 100 },
    { subject: 'Practical/Projects', value: calculated.skillProfile.practical, fullMark: 100 },
    { subject: 'Academics', value: calculated.averageSubjectScore, fullMark: 100 },
    { subject: 'Attendance', value: formData.attendancePercentage, fullMark: 100 },
  ];

  // Subject marks bar data
  const subjectBarData = Object.entries(formData.subjectMarks).map(([sub, score]) => ({
    name: sub.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    score: score || 0,
  }));

  const recommendations = generateRuleBasedRecommendations(formData, calculated);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header with Title and Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            Flagship Intelligence Workflow
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Student Intelligence & Performance Analyzer
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Empirical statistical diagnostic, rule-based reasoning, and verified ML performance classification.
          </p>
        </div>

        {/* Demo Preset Buttons */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 px-2">Presets:</span>
          <button
            onClick={() => handlePresetSelect('high')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              formData.studentName === 'Aarav Sharma'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            High Performer
          </button>
          <button
            onClick={() => handlePresetSelect('moderate')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              formData.studentName === 'Priya Patel'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Moderate
          </button>
          <button
            onClick={() => handlePresetSelect('atRisk')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              formData.studentName === 'Rohan Kumar'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            At-Risk / Arrear
          </button>
        </div>
      </div>

      {/* Main Grid: Form Inputs (Left) and Live Intelligence (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Inputs (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Student Profile & Parameters
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">14 Features</span>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Student Name</label>
              <input
                type="text"
                value={formData.studentName}
                onChange={(e) => handleInputChange('studentName', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Semester</label>
              <input
                type="number"
                min={1}
                max={8}
                value={formData.semester}
                onChange={(e) => handleInputChange('semester', parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Attendance %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.attendancePercentage}
                onChange={(e) => handleInputChange('attendancePercentage', parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Previous GPA</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={10}
                value={formData.previousSemesterGpa}
                onChange={(e) => handleInputChange('previousSemesterGpa', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Subject Marks */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">Subject Scores (0 - 100%)</span>
              <span className="text-[10px] text-slate-400">Mean: {calculated.averageSubjectScore}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(formData.subjectMarks).map(([sub, score]) => (
                <div key={sub} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/60">
                  <span className="text-[11px] text-slate-300 capitalize truncate max-w-[110px]">
                    {sub.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={score ?? 0}
                    onChange={(e) => handleSubjectMarkChange(sub, parseInt(e.target.value, 10) || 0)}
                    className="w-14 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-right text-indigo-300 font-mono font-semibold"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Skill Ratings & Assessments */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">Competency & Effort Metrics</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Internal (/25)</label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={formData.internalMarks}
                  onChange={(e) => handleInputChange('internalMarks', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Technical (/100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.technicalSkillScore}
                  onChange={(e) => handleInputChange('technicalSkillScore', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Aptitude (/100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.aptitudeScore}
                  onChange={(e) => handleInputChange('aptitudeScore', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Projects</label>
                <input
                  type="number"
                  min={0}
                  value={formData.numberOfProjects}
                  onChange={(e) => handleInputChange('numberOfProjects', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Certs</label>
                <input
                  type="number"
                  min={0}
                  value={formData.numberOfCertifications}
                  onChange={(e) => handleInputChange('numberOfCertifications', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Hrs/Wk</label>
                <input
                  type="number"
                  min={0}
                  value={formData.studyHoursPerWeek}
                  onChange={(e) => handleInputChange('studyHoursPerWeek', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 text-rose-400">Backlogs</label>
                <input
                  type="number"
                  min={0}
                  value={formData.backlogs}
                  onChange={(e) => handleInputChange('backlogs', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-rose-900/60 text-xs text-rose-300 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={() => onOpenInChat(formData, calculated, prediction)}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              Discuss in AI Chat
            </button>
            <button
              onClick={handleCreateActionPlan}
              disabled={savingPlan || planSaved}
              className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                planSaved
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
              }`}
            >
              {planSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Plan Created!
                </>
              ) : savingPlan ? (
                'Saving...'
              ) : (
                <>
                  <ListTodo className="w-3.5 h-3.5" /> Save Action Plan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Panel: Analytics & ML Outcome (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Key Metric Scorecards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-semibold uppercase text-slate-400">Composite Score</span>
              <div className="text-xl font-extrabold text-white mt-1">
                {calculated.compositeAcademicScore}
                <span className="text-xs font-normal text-slate-500"> /100</span>
              </div>
              <span className="text-[10px] text-indigo-400 font-medium">Weighted formula</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-semibold uppercase text-slate-400">Attendance Risk</span>
              <div
                className={`text-sm font-bold mt-1 ${
                  calculated.attendanceRisk === 'Optimal'
                    ? 'text-emerald-400'
                    : calculated.attendanceRisk === 'Satisfactory'
                    ? 'text-blue-400'
                    : calculated.attendanceRisk === 'At-Risk'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {calculated.attendanceRisk} ({formData.attendancePercentage}%)
              </div>
              <span className="text-[10px] text-slate-500">Min 75% required</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-semibold uppercase text-slate-400">Learning Index</span>
              <div className="text-xl font-extrabold text-white mt-1">
                {calculated.learningEfficiencyIndex}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Score / weekly effort</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-semibold uppercase text-slate-400">Academic Trend</span>
              <div className="text-sm font-bold text-white mt-1 flex items-center gap-1">
                <TrendingUp
                  className={`w-3.5 h-3.5 ${
                    calculated.academicTrend === 'Upward'
                      ? 'text-emerald-400'
                      : calculated.academicTrend === 'Declining'
                      ? 'text-rose-400 rotate-90'
                      : 'text-amber-400'
                  }`}
                />
                {calculated.academicTrend}
              </div>
              <span className="text-[10px] text-slate-500">vs prev {formData.previousSemesterGpa} GPA</span>
            </div>
          </div>

          {/* Machine Learning Prediction Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-purple-950/30 border border-indigo-500/30 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Machine Learning Classification</h3>
                  <p className="text-[10px] text-indigo-300/80 font-mono">
                    Model: {prediction.modelType} ({prediction.modelVersion})
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Validated Accuracy</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {(prediction.evaluationMetrics.accuracy * 100).toFixed(1)}% (F1: {(prediction.evaluationMetrics.f1Score * 100).toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-medium">Inferred Performance Tier</span>
                <div className="text-2xl font-black tracking-tight text-white mt-0.5 flex items-center gap-2">
                  <span
                    className={
                      prediction.predictedClass === 'High Performance'
                        ? 'text-emerald-400'
                        : prediction.predictedClass === 'Moderate Performance'
                        ? 'text-indigo-400'
                        : 'text-rose-400'
                    }
                  >
                    {prediction.predictedClass}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-normal">
                    {(prediction.confidence * 100).toFixed(1)}% Confidence
                  </span>
                </div>
              </div>

              {/* Class Probability Distribution Bars */}
              <div className="w-full md:w-64 space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Probability Distribution
                </span>
                {Object.entries(prediction.probabilities).map(([cls, prob]) => (
                  <div key={cls} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-300">
                      <span className="truncate">{cls}</span>
                      <span className="font-mono font-semibold">{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cls === 'High Performance'
                            ? 'bg-emerald-500'
                            : cls === 'Moderate Performance'
                            ? 'bg-indigo-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.round(prob * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top driving features */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-slate-400 font-medium">Influencing Features:</span>
              {prediction.featureImportances.slice(0, 3).map((f) => (
                <span
                  key={f.feature}
                  className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${
                    f.direction === 'positive'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {f.feature} ({f.direction === 'positive' ? '+impact' : '-drag'})
                </span>
              ))}
            </div>
          </div>

          {/* Visual Charts: Skill Profile Radar & Subject Marks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Radar Chart */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
              <span className="text-xs font-semibold text-slate-300 self-start mb-2">Competency Radar Profile</span>
              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke="#818cf8"
                      fill="#6366f1"
                      fillOpacity={0.45}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Marks Bar Chart */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col">
              <span className="text-xs font-semibold text-slate-300 mb-2">Curriculum Subject Comparison</span>
              <div className="w-full h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#94a3b8', fontSize: 9 }}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {subjectBarData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.score >= 75 ? '#10b981' : entry.score >= 60 ? '#6366f1' : '#f43f5e'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Strong Areas and Weak Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4" /> Strong Competencies
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {calculated.strongAreas.map((s, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4" /> Priority Areas for Intervention
              </span>
              <ul className="space-y-1 text-xs text-slate-300">
                {calculated.weakAreas.map((w, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Recommendations List */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                Personalized Recommendations ({recommendations.length})
              </h4>
              <span className="text-[10px] text-slate-500">Stated Assumptions & Limitations Attached</span>
            </div>

            <div className="space-y-2.5">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{rec.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${
                        rec.priority === 'critical'
                          ? 'bg-rose-500/20 text-rose-300'
                          : rec.priority === 'high'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{rec.reason}</p>
                  <div className="mt-2 text-xs text-indigo-300 font-medium bg-indigo-950/30 p-2 rounded border border-indigo-500/20">
                    <span className="font-bold">Next Action:</span> {rec.nextAction}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-[10px] text-slate-500">
                    <span>Assumptions: {rec.assumptions}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
