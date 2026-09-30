import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  Sliders,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Database,
  GitBranch,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { getOrTrainModel, retrainModel, predictStudentPerformance } from '../ml/inference';
import { SerializedTrainedModel } from '../ml/trainer';
import { StudentInput, MLPredictionResult } from '../types';

export const MLStudioView: React.FC = () => {
  const [model, setModel] = useState<SerializedTrainedModel>(() => getOrTrainModel());
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);

  // Interactive Live Sandbox state
  const [simInput, setSimInput] = useState<StudentInput>({
    studentName: 'Simulation Sandbox',
    department: 'Computer Science',
    semester: 5,
    attendancePercentage: 82,
    subjectMarks: {
      math: 75,
      prog: 78,
      ds: 72,
    },
    internalMarks: 20,
    maxInternalMarks: 25,
    aptitudeScore: 75,
    communicationScore: 70,
    technicalSkillScore: 78,
    numberOfProjects: 3,
    numberOfCertifications: 2,
    studyHoursPerWeek: 14,
    backlogs: 0,
    previousSemesterGpa: 7.8,
  });

  const [simPrediction, setSimPrediction] = useState<MLPredictionResult>(() =>
    predictStudentPerformance(simInput)
  );

  const handleSimChange = (field: keyof StudentInput, val: any) => {
    const next = { ...simInput, [field]: val };
    setSimInput(next);
    setSimPrediction(predictStudentPerformance(next));
  };

  const handleRetrain = () => {
    setIsRetraining(true);
    setRetrainSuccess(false);
    setTimeout(() => {
      const nextModel = retrainModel();
      setModel(nextModel);
      setSimPrediction(predictStudentPerformance(simInput));
      setIsRetraining(false);
      setRetrainSuccess(true);
      setTimeout(() => setRetrainSuccess(false), 3000);
    }, 600);
  };

  const confusion = model.evaluation.confusionMatrix;
  const classNames = ['Needs Improvement', 'Moderate', 'High Performance'];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            Machine Learning Core & Model Validation
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
            Modular ML Architecture & Evaluation Studio
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent empirical validation metrics, multi-class confusion matrix, and calibrated probability inference.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRetrain}
            disabled={isRetraining}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
            {isRetraining ? 'Training on 600 Samples...' : 'Retrain & Re-evaluate Model'}
          </button>
        </div>
      </div>

      {retrainSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Model retrained successfully with cross-entropy mini-batch gradient descent. Validation metrics updated!</span>
        </div>
      )}

      {/* Architecture & Pipeline Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <span>Architecture</span>
          </div>
          <div className="text-sm font-bold text-white mt-1.5">{model.architecture}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{model.version}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Dataset Split</span>
          </div>
          <div className="text-sm font-bold text-white mt-1.5">
            {model.evaluation.sampleSize} Samples (80/20)
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Train: {model.evaluation.sampleSize - model.evaluation.testSize} | Test: {model.evaluation.testSize}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Optimization</span>
          </div>
          <div className="text-sm font-bold text-white mt-1.5">Softmax + L2 Regularization</div>
          <div className="text-[11px] text-slate-400 mt-0.5">λ = 0.001, LR = 0.08, 250 Epochs</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Test Accuracy</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">
            {(model.evaluation.accuracy * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
            Macro F1: {(model.evaluation.f1Score * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Empirical Evaluation: Confusion Matrix & Per-Class Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Confusion Matrix (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Empirical Confusion Matrix</h3>
              <p className="text-[11px] text-slate-400">Evaluated on {model.evaluation.testSize} held-out test records</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              3 x 3 Matrix
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-slate-500 font-normal text-left text-[11px]">Actual \ Predicted</th>
                  <th className="p-2 text-rose-400 font-semibold text-[10px]">Needs Impr.</th>
                  <th className="p-2 text-indigo-400 font-semibold text-[10px]">Moderate</th>
                  <th className="p-2 text-emerald-400 font-semibold text-[10px]">High Perf.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {confusion.map((row, actualIdx) => (
                  <tr key={actualIdx}>
                    <td className="p-2.5 text-left text-slate-300 font-medium text-[11px]">
                      {classNames[actualIdx]}
                    </td>
                    {row.map((val, predIdx) => {
                      const isDiagonal = actualIdx === predIdx;
                      return (
                        <td
                          key={predIdx}
                          className={`p-2.5 font-mono font-bold transition-colors ${
                            isDiagonal
                              ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 rounded-lg'
                              : val > 0
                              ? 'bg-rose-500/10 text-rose-300'
                              : 'text-slate-600'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Overall Accuracy:</span>
              <span className="font-mono font-bold text-white">{(model.evaluation.accuracy * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Macro Precision:</span>
              <span className="font-mono font-bold text-slate-200">{(model.evaluation.precision * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Macro Recall:</span>
              <span className="font-mono font-bold text-slate-200">{(model.evaluation.recall * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Macro F1 Score:</span>
              <span className="font-mono font-bold text-emerald-400">{(model.evaluation.f1Score * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Feature Importances (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Feature Weight Attribution (Importance)</h3>
                <p className="text-[11px] text-slate-400">Normalized gradient-derived weight coefficients</p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">11 Features</span>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={model.featureImportances}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                >
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis
                    dataKey="feature"
                    type="category"
                    tick={{ fill: '#cbd5e1', fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {model.featureImportances.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index < 3 ? '#6366f1' : index < 6 ? '#818cf8' : '#475569'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 mt-2">
            Top 3 drivers: <strong className="text-indigo-300">{model.featureImportances[0]?.feature}</strong>,{' '}
            <strong className="text-indigo-300">{model.featureImportances[1]?.feature}</strong>, and{' '}
            <strong className="text-indigo-300">{model.featureImportances[2]?.feature}</strong>.
          </div>
        </div>
      </div>

      {/* Interactive Live Sandbox Simulator */}
      <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Live Real-Time Inference Sandbox</h3>
              <p className="text-[11px] text-slate-400">Adjust any input slider to witness deterministic mathematical Softmax classification</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
            Interactive Testbed
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Sliders (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Attendance %</span>
                <span className="font-mono text-indigo-300 font-bold">{simInput.attendancePercentage}%</span>
              </div>
              <input
                type="range"
                min={45}
                max={100}
                value={simInput.attendancePercentage}
                onChange={(e) => handleSimChange('attendancePercentage', parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Technical Skill (/100)</span>
                <span className="font-mono text-indigo-300 font-bold">{simInput.technicalSkillScore}</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                value={simInput.technicalSkillScore}
                onChange={(e) => handleSimChange('technicalSkillScore', parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Aptitude Score (/100)</span>
                <span className="font-mono text-indigo-300 font-bold">{simInput.aptitudeScore}</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                value={simInput.aptitudeScore}
                onChange={(e) => handleSimChange('aptitudeScore', parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Previous GPA (/10)</span>
                <span className="font-mono text-indigo-300 font-bold">{simInput.previousSemesterGpa}</span>
              </div>
              <input
                type="range"
                min={4.0}
                max={10.0}
                step={0.1}
                value={simInput.previousSemesterGpa}
                onChange={(e) => handleSimChange('previousSemesterGpa', parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Active Backlogs</span>
                <span className={`font-mono font-bold ${simInput.backlogs > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {simInput.backlogs}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                value={simInput.backlogs}
                onChange={(e) => handleSimChange('backlogs', parseInt(e.target.value, 10))}
                className="w-full accent-rose-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Projects Count</span>
                <span className="font-mono text-indigo-300 font-bold">{simInput.numberOfProjects}</span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                value={simInput.numberOfProjects}
                onChange={(e) => handleSimChange('numberOfProjects', parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          {/* Outcome (5 Cols) */}
          <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Inference Output
            </span>
            <div className="text-xl font-black text-white flex items-center justify-between">
              <span
                className={
                  simPrediction.predictedClass === 'High Performance'
                    ? 'text-emerald-400'
                    : simPrediction.predictedClass === 'Moderate Performance'
                    ? 'text-indigo-400'
                    : 'text-rose-400'
                }
              >
                {simPrediction.predictedClass}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-normal">
                {(simPrediction.confidence * 100).toFixed(1)}% Conf.
              </span>
            </div>

            {/* Probability Bars */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              {Object.entries(simPrediction.probabilities).map(([cls, prob]) => (
                <div key={cls} className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span>{cls}</span>
                    <span className="font-mono font-bold">{(prob * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
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

            <div className="text-[10px] text-slate-500 italic pt-1">
              Limitations: Model inference based on academic regression correlations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
