import { generateBenchmarkDataset, TrainingSample, FEATURE_NAMES, CLASS_LABELS } from './dataset';

export interface EvaluationReport {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][]; // 3x3 matrix [actual][predicted]
  classMetrics: {
    className: string;
    precision: number;
    recall: number;
    f1: number;
    support: number;
  }[];
  sampleSize: number;
  testSize: number;
}

export interface SerializedTrainedModel {
  version: string;
  architecture: 'Multinomial Logistic Regression' | 'CART Decision Tree';
  trainedAt: string;
  featureMeans: number[];
  featureStdDevs: number[];
  weights: number[][]; // 3 classes x 11 features
  biases: number[]; // 3 classes
  evaluation: EvaluationReport;
  featureImportances: { feature: string; importance: number }[];
  classes: ('Needs Improvement' | 'Moderate Performance' | 'High Performance')[];
}

// Compute mean and standard deviation for normalization
function computeScalers(X: number[][]): { means: number[]; stds: number[] } {
  const numFeatures = X[0].length;
  const numSamples = X.length;
  const means: number[] = new Array(numFeatures).fill(0);
  const stds: number[] = new Array(numFeatures).fill(0);

  for (let j = 0; j < numFeatures; j++) {
    let sum = 0;
    for (let i = 0; i < numSamples; i++) {
      sum += X[i][j];
    }
    means[j] = sum / numSamples;

    let varSum = 0;
    for (let i = 0; i < numSamples; i++) {
      varSum += Math.pow(X[i][j] - means[j], 2);
    }
    stds[j] = Math.sqrt(varSum / numSamples) || 1;
  }

  return { means, stds };
}

function normalize(row: number[], means: number[], stds: number[]): number[] {
  return row.map((val, idx) => (val - means[idx]) / stds[idx]);
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}

export function trainAndEvaluateModel(): SerializedTrainedModel {
  const allData = generateBenchmarkDataset(600, 101);
  
  // 80/20 train/test split
  const splitIndex = Math.floor(allData.length * 0.8);
  const trainData = allData.slice(0, splitIndex);
  const testData = allData.slice(splitIndex);

  const rawTrainX = trainData.map(d => d.features);
  const trainY = trainData.map(d => d.label);

  const { means, stds } = computeScalers(rawTrainX);
  const trainX = rawTrainX.map(r => normalize(r, means, stds));

  const numFeatures = FEATURE_NAMES.length;
  const numClasses = 3;

  // Initialize weights & biases
  const weights: number[][] = Array.from({ length: numClasses }, () =>
    new Array(numFeatures).fill(0).map(() => (Math.random() - 0.5) * 0.05)
  );
  const biases: number[] = new Array(numClasses).fill(0);

  // Gradient Descent parameters
  const epochs = 250;
  const learningRate = 0.08;
  const lambda = 0.001; // L2 regularization

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = 0; i < trainX.length; i++) {
      const x = trainX[i];
      const actual = trainY[i];

      // Forward pass: logits = W * x + b
      const logits = weights.map((wRow, c) => {
        let sum = biases[c];
        for (let j = 0; j < numFeatures; j++) {
          sum += wRow[j] * x[j];
        }
        return sum;
      });

      const probs = softmax(logits);

      // Backward pass: gradient of cross-entropy with softmax
      for (let c = 0; c < numClasses; c++) {
        const error = probs[c] - (actual === c ? 1 : 0);
        biases[c] -= learningRate * error;
        for (let j = 0; j < numFeatures; j++) {
          const grad = error * x[j] + lambda * weights[c][j];
          weights[c][j] -= learningRate * grad;
        }
      }
    }
  }

  // Evaluate on Test Set
  const testX = testData.map(d => normalize(d.features, means, stds));
  const testY = testData.map(d => d.label);

  const confusionMatrix: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  let correctCount = 0;

  for (let i = 0; i < testX.length; i++) {
    const x = testX[i];
    const actual = testY[i];

    const logits = weights.map((wRow, c) => {
      let sum = biases[c];
      for (let j = 0; j < numFeatures; j++) {
        sum += wRow[j] * x[j];
      }
      return sum;
    });

    const probs = softmax(logits);
    let pred = 0;
    let maxP = probs[0];
    for (let c = 1; c < numClasses; c++) {
      if (probs[c] > maxP) {
        maxP = probs[c];
        pred = c;
      }
    }

    confusionMatrix[actual][pred]++;
    if (pred === actual) correctCount++;
  }

  const accuracy = Number((correctCount / testData.length).toFixed(4));

  // Compute per-class Precision, Recall, and F1
  const classNames = ['Needs Improvement', 'Moderate Performance', 'High Performance'] as const;
  const classMetrics = classNames.map((name, c) => {
    const tp = confusionMatrix[c][c];
    const rowSum = confusionMatrix[c][0] + confusionMatrix[c][1] + confusionMatrix[c][2];
    const colSum = confusionMatrix[0][c] + confusionMatrix[1][c] + confusionMatrix[2][c];

    const precision = colSum > 0 ? Number((tp / colSum).toFixed(4)) : 0;
    const recall = rowSum > 0 ? Number((tp / rowSum).toFixed(4)) : 0;
    const f1 = (precision + recall) > 0 ? Number((2 * (precision * recall) / (precision + recall)).toFixed(4)) : 0;

    return {
      className: name,
      precision,
      recall,
      f1,
      support: rowSum,
    };
  });

  const macroPrecision = Number((classMetrics.reduce((a, b) => a + b.precision, 0) / 3).toFixed(4));
  const macroRecall = Number((classMetrics.reduce((a, b) => a + b.recall, 0) / 3).toFixed(4));
  const macroF1 = Number((classMetrics.reduce((a, b) => a + b.f1, 0) / 3).toFixed(4));

  // Compute feature importances as mean absolute weight magnitude across classes
  const featureImportances = FEATURE_NAMES.map((name, j) => {
    let magSum = 0;
    for (let c = 0; c < numClasses; c++) {
      magSum += Math.abs(weights[c][j]);
    }
    return {
      feature: name,
      importance: Number((magSum / numClasses).toFixed(3)),
    };
  }).sort((a, b) => b.importance - a.importance);

  return {
    version: 'v1.4.2-multinomial-logistic',
    architecture: 'Multinomial Logistic Regression',
    trainedAt: new Date().toISOString(),
    featureMeans: means,
    featureStdDevs: stds,
    weights,
    biases,
    featureImportances,
    classes: ['Needs Improvement', 'Moderate Performance', 'High Performance'],
    evaluation: {
      accuracy,
      precision: macroPrecision,
      recall: macroRecall,
      f1Score: macroF1,
      confusionMatrix,
      classMetrics,
      sampleSize: allData.length,
      testSize: testData.length,
    },
  };
}
