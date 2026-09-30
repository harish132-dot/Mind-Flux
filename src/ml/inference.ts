import { trainAndEvaluateModel, SerializedTrainedModel } from './trainer';
import { StudentInput, MLPredictionResult, PerformanceClass } from '../types';
import { FEATURE_NAMES } from './dataset';

let activeModel: SerializedTrainedModel | null = null;

export function getOrTrainModel(): SerializedTrainedModel {
  if (!activeModel) {
    activeModel = trainAndEvaluateModel();
  }
  return activeModel;
}

export function retrainModel(): SerializedTrainedModel {
  activeModel = trainAndEvaluateModel();
  return activeModel;
}

export function extractFeatureVector(input: StudentInput): number[] {
  const marks = Object.values(input.subjectMarks || {}).filter(
    v => typeof v === 'number' && !isNaN(v)
  ) as number[];
  const avgMarks = marks.length > 0
    ? marks.reduce((a, b) => a + b, 0) / marks.length
    : (input.previousSemesterGpa ? input.previousSemesterGpa * 9.5 : 65);

  const maxInternal = input.maxInternalMarks || 25;
  const internalPct = (input.internalMarks / maxInternal) * 100;

  return [
    input.attendancePercentage,
    avgMarks,
    internalPct,
    input.aptitudeScore,
    input.communicationScore,
    input.technicalSkillScore,
    input.numberOfProjects,
    input.numberOfCertifications,
    input.studyHoursPerWeek,
    input.backlogs,
    input.previousSemesterGpa,
  ];
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}

export function predictStudentPerformance(input: StudentInput): MLPredictionResult {
  const model = getOrTrainModel();
  const rawFeatures = extractFeatureVector(input);

  // Z-score normalization
  const normalized = rawFeatures.map((val, idx) => {
    const mean = model.featureMeans[idx];
    const std = model.featureStdDevs[idx] || 1;
    return (val - mean) / std;
  });

  // Calculate logits for each class
  const logits = model.weights.map((wRow, c) => {
    let sum = model.biases[c];
    for (let j = 0; j < normalized.length; j++) {
      sum += wRow[j] * normalized[j];
    }
    return sum;
  });

  const probs = softmax(logits);

  // Map to class labels
  const probMap: {
    'Needs Improvement': number;
    'Moderate Performance': number;
    'High Performance': number;
  } = {
    'Needs Improvement': Number(probs[0].toFixed(3)),
    'Moderate Performance': Number(probs[1].toFixed(3)),
    'High Performance': Number(probs[2].toFixed(3)),
  };

  let maxIdx = 0;
  let maxP = probs[0];
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > maxP) {
      maxP = probs[i];
      maxIdx = i;
    }
  }

  const predictedClass = model.classes[maxIdx];
  const confidence = Number(maxP.toFixed(3));

  // Feature attribution (contribution = normalized_feature * weight_for_predicted_class)
  const featureImportances = FEATURE_NAMES.map((name, idx) => {
    const contribution = normalized[idx] * model.weights[maxIdx][idx];
    return {
      feature: name,
      impact: Number(Math.abs(contribution).toFixed(3)),
      direction: (contribution >= 0 ? 'positive' : 'negative') as 'positive' | 'negative',
    };
  }).sort((a, b) => b.impact - a.impact);

  const limitations = [
    'Model inference assumes standardized semester curriculum and grading scale (0-100% or 10-point CGPA).',
    'Subjective factors such as emotional well-being, medical leave, or extracurricular leadership are not captured in the 11 feature dimensions.',
    'Predictions reflect statistical correlation over empirical cohort distributions and should supplement, not replace, faculty mentoring.',
  ];

  return {
    predictedClass,
    probabilities: probMap,
    confidence,
    featureImportances: featureImportances.slice(0, 5),
    modelVersion: model.version,
    modelType: model.architecture,
    evaluationMetrics: {
      accuracy: model.evaluation.accuracy,
      precision: model.evaluation.precision,
      recall: model.evaluation.recall,
      f1Score: model.evaluation.f1Score,
    },
    limitations,
    predictionTimestamp: new Date().toISOString(),
  };
}
