import { GoogleGenAI } from '@google/genai';
import { orchestrateAnalysis } from '../services/orchestrator';
import { predictStudentPerformance, getOrTrainModel, retrainModel } from '../ml/inference';
import { calculateStudentMetrics, generateRuleBasedRecommendations } from '../ml/studentAnalytics';
import { StudentInput, DatasetStatistics } from '../types';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function processChat(body: {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  studentData?: Partial<StudentInput>;
  fileContext?: string;
}) {
  const { message, history = [], studentData, fileContext } = body;

  // Run Orchestrator: extracts features, identifies intent, runs calculations & ML if applicable
  const orchestration = orchestrateAnalysis(message, studentData);

  const ai = getGeminiClient();
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  let answerText = '';
  let analysisSection: string | undefined;
  let predictionData = orchestration.analysisResults?.prediction;
  let recommendationsData = orchestration.analysisResults?.recommendations;
  let nextSteps: string[] = [];

  const metrics = orchestration.analysisResults?.metrics;

  if (orchestration.analysisResults?.actionPlanSuggested) {
    nextSteps = orchestration.analysisResults.actionPlanSuggested.tasks.map(t => `${t.title} (${t.duration})`);
  }

  // Construct system prompt grounded with ground-truth calculations
  let groundingContext = '';
  if (metrics && predictionData) {
    groundingContext = `
[GROUND TRUTH COMPUTATIONS - DO NOT ALTER THESE CALCULATIONS]:
- Average Subject Score: ${metrics.averageSubjectScore}%
- Internal Assessment Normalized: ${metrics.normalizedInternalPercentage}%
- Attendance Status: ${metrics.attendanceRisk} (${metrics.attendanceAnalysis})
- Composite Academic Score: ${metrics.compositeAcademicScore} / 100
- Skill Index: ${metrics.skillIndex} / 100
- Learning Efficiency Index: ${metrics.learningEfficiencyIndex}
- Academic Risk Score: ${metrics.academicRiskScore} / 100
- Academic Trend: ${metrics.academicTrend}
- Strong Areas: ${metrics.strongAreas.join(', ')}
- Weak Areas: ${metrics.weakAreas.join(', ')}

[GROUND TRUTH ML MODEL PREDICTION]:
- Model Architecture: ${predictionData.modelType} (${predictionData.modelVersion})
- Validated Model Accuracy: ${(predictionData.evaluationMetrics.accuracy * 100).toFixed(1)}% (Macro F1: ${(predictionData.evaluationMetrics.f1Score * 100).toFixed(1)}%)
- Predicted Performance Class: "${predictionData.predictedClass}"
- Calibrated Probability Distribution:
  * High Performance: ${(predictionData.probabilities['High Performance'] * 100).toFixed(1)}%
  * Moderate Performance: ${(predictionData.probabilities['Moderate Performance'] * 100).toFixed(1)}%
  * Needs Improvement: ${(predictionData.probabilities['Needs Improvement'] * 100).toFixed(1)}%
- Top Driving Features: ${predictionData.featureImportances.map(f => `${f.feature} (${f.direction})`).join(', ')}
`;
  }

  if (fileContext) {
    groundingContext += `\n[ATTACHED FILE CONTEXT]:\n${fileContext.slice(0, 4000)}\n`;
  }

  const systemInstruction = `You are AI INSIGHT ENGINE ("Think. Analyze. Predict. Act."), a serious AI decision-support platform.
You combine conversational understanding, deterministic data calculations, and empirical machine learning.

CRITICAL RULES:
1. Distinguish clearly between LLM explanation, empirical ML classification, and deterministic calculations.
2. Never invent or hallucinate metrics, model accuracy, or confidence scores.
3. If grounded calculations and ML results are provided above, reference them precisely.
4. Structure your response clearly using the following distinct markdown sections where relevant:
### Executive Summary
(Direct, clear answer to the user's intent)

### Performance & Diagnostic Analysis
(Breakdown of strong areas, weak areas, attendance risk, and academic indicators)

### Machine Learning Classification
(Explicitly quote the model version, predicted class, probabilities, and stated limitations)

### Strategic Recommendations
(High-impact prioritized recommendations with rationale and constraints)

### Next Steps & Action Roadmap
(Concrete actionable tasks)

5. Always state assumptions and limitations for sensitive predictions.`;

  if (ai) {
    try {
      const contents = [
        ...history.slice(-6).map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
        {
          role: 'user',
          parts: [{ text: `${groundingContext}\n\nUser Question/Input: ${message}` }],
        },
      ];

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      answerText = response.text || 'Analysis completed.';
    } catch (err: unknown) {
      console.warn('Gemini API call encountered issue, falling back to deterministic synthesis:', err);
      answerText = generateFallbackResponse(message, orchestration, metrics, predictionData);
    }
  } else {
    answerText = generateFallbackResponse(message, orchestration, metrics, predictionData);
  }

  return {
    content: answerText,
    orchestration,
    metrics,
    prediction: predictionData,
    recommendations: recommendationsData,
    nextSteps,
  };
}

function generateFallbackResponse(
  message: string,
  orchestration: ReturnType<typeof orchestrateAnalysis>,
  metrics?: ReturnType<typeof calculateStudentMetrics>,
  prediction?: ReturnType<typeof predictStudentPerformance>
): string {
  if (metrics && prediction) {
    return `### Executive Summary
Based on the academic parameters analyzed, the student is currently categorized under the **${prediction.predictedClass}** tier with a composite score of **${metrics.compositeAcademicScore}/100** and an academic risk rating of **${metrics.academicRiskScore}/100** (${metrics.attendanceRisk} attendance).

### Performance & Diagnostic Analysis
- **Attendance Status:** ${metrics.attendanceAnalysis}
- **Subject Mark Average:** ${metrics.averageSubjectScore}% (Internal Assessment: ${metrics.normalizedInternalPercentage}%)
- **Academic Trajectory:** ${metrics.academicTrend} compared to previous benchmarks.
- **Identified Strengths:** ${metrics.strongAreas.join('; ')}.
- **Areas Demanding Intervention:** ${metrics.weakAreas.join('; ')}.

### Machine Learning Classification
- **Model Used:** ${prediction.modelType} (Version: \`${prediction.modelVersion}\`)
- **Empirical Validation Accuracy:** ${(prediction.evaluationMetrics.accuracy * 100).toFixed(1)}% (Test Sample F1: ${(prediction.evaluationMetrics.f1Score * 100).toFixed(1)}%)
- **Predicted Class:** **${prediction.predictedClass}**
- **Calibrated Class Probabilities:**
  - High Performance: ${(prediction.probabilities['High Performance'] * 100).toFixed(1)}%
  - Moderate Performance: ${(prediction.probabilities['Moderate Performance'] * 100).toFixed(1)}%
  - Needs Improvement: ${(prediction.probabilities['Needs Improvement'] * 100).toFixed(1)}%
*Limitations:* ${prediction.limitations[0]}

### Strategic Recommendations
1. **Attendance Stabilization:** Maintain uncompromised lecture attendance to secure examination eligibility.
2. **Core Domain Focus:** Targeted problem-solving for subjects with scores below 60%.
3. **Applied Portfolio Development:** Complete at least one capstone GitHub repository with clean documentation.

### Next Steps & Action Roadmap
- Open the **Action Plan** tab to monitor scheduled weekly milestones and clear backlogs systematically.`;
  }

  return `### Executive Summary
Welcome to **AI Insight Engine**. I am ready to analyze your academic profile, run machine learning predictions, or process tabular datasets.

To generate a full diagnostic evaluation, provide details such as:
- Subject marks or GPA
- Attendance percentage
- Technical & communication ratings (0-100)
- Number of projects and backlogs (if any)`;
}

export function processPrediction(studentInput: StudentInput) {
  const prediction = predictStudentPerformance(studentInput);
  const metrics = calculateStudentMetrics(studentInput);
  return { prediction, metrics };
}

export function processDatasetStats(rows: Record<string, any>[]): DatasetStatistics {
  if (!rows || rows.length === 0) {
    return { rowCount: 0, columnCount: 0, columns: [] };
  }

  const rowCount = rows.length;
  const colKeys = Object.keys(rows[0]);
  const columnCount = colKeys.length;

  const columns = colKeys.map(colName => {
    let numCount = 0;
    let missingCount = 0;
    const values: any[] = [];
    const numValues: number[] = [];

    for (const r of rows) {
      const val = r[colName];
      if (val === undefined || val === null || val === '') {
        missingCount++;
      } else {
        values.push(val);
        const parsed = Number(val);
        if (!isNaN(parsed) && typeof val !== 'boolean') {
          numCount++;
          numValues.push(parsed);
        }
      }
    }

    const isNumeric = numCount > rows.length * 0.6;
    const uniqueCount = new Set(values).size;

    let mean: number | undefined;
    let median: number | undefined;
    let min: number | undefined;
    let max: number | undefined;
    let stdDev: number | undefined;

    if (isNumeric && numValues.length > 0) {
      numValues.sort((a, b) => a - b);
      min = numValues[0];
      max = numValues[numValues.length - 1];
      const sum = numValues.reduce((a, b) => a + b, 0);
      mean = Number((sum / numValues.length).toFixed(2));
      const mid = Math.floor(numValues.length / 2);
      median = numValues.length % 2 === 0
        ? Number(((numValues[mid - 1] + numValues[mid]) / 2).toFixed(2))
        : numValues[mid];

      const varSum = numValues.reduce((acc, v) => acc + Math.pow(v - mean!, 2), 0);
      stdDev = Number(Math.sqrt(varSum / numValues.length).toFixed(2));
    }

    return {
      name: colName,
      type: (isNumeric ? 'number' : 'string') as 'number' | 'string',
      missingCount,
      uniqueCount,
      mean,
      median,
      min,
      max,
      stdDev,
    };
  });

  return {
    rowCount,
    columnCount,
    columns,
  };
}
