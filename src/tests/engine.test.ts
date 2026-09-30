import { calculateStudentMetrics, generateRuleBasedRecommendations } from '../ml/studentAnalytics';
import { predictStudentPerformance, getOrTrainModel } from '../ml/inference';
import { extractStudentDataFromText, detectIntent } from '../services/orchestrator';
import { processDatasetStats } from '../server/api';
import { StudentInput } from '../types';

export function runAllTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean) {
    if (condition) {
      passed++;
      results.push(`✓ [PASS] ${testName}`);
    } else {
      failed++;
      results.push(`✗ [FAIL] ${testName}`);
      console.error(`Test failed: ${testName}`);
    }
  }

  // 1. Student Calculations Test
  const mockStudent: StudentInput = {
    studentName: 'Test Student',
    department: 'CS',
    semester: 5,
    attendancePercentage: 85,
    subjectMarks: { python: 80, math: 70, db: 90 },
    internalMarks: 20,
    maxInternalMarks: 25,
    aptitudeScore: 80,
    communicationScore: 75,
    technicalSkillScore: 85,
    numberOfProjects: 3,
    numberOfCertifications: 2,
    studyHoursPerWeek: 15,
    backlogs: 0,
    previousSemesterGpa: 8.0,
  };

  const metrics = calculateStudentMetrics(mockStudent);
  assert('Average subject marks calculation', metrics.averageSubjectScore === 80);
  assert('Internal assessment normalized percentage', metrics.normalizedInternalPercentage === 80);
  assert('Attendance risk is Optimal for 85%', metrics.attendanceRisk === 'Optimal');
  assert('Composite academic score is between 0 and 100', metrics.compositeAcademicScore >= 0 && metrics.compositeAcademicScore <= 100);
  assert('Skill index is calculated', metrics.skillIndex > 0);

  // 2. ML Inference Test
  const prediction = predictStudentPerformance(mockStudent);
  assert('ML prediction returns valid class', ['High Performance', 'Moderate Performance', 'Needs Improvement'].includes(prediction.predictedClass));
  const probSum = Object.values(prediction.probabilities).reduce((a, b) => a + b, 0);
  assert('ML class probabilities sum approximately to 1.0', Math.abs(probSum - 1.0) < 0.05);
  assert('Confidence is greater than 0.33', prediction.confidence >= 0.33);
  assert('Model version is tagged', prediction.modelVersion.length > 0);
  assert('Limitations are stated', prediction.limitations.length > 0);

  // 3. Orchestration & NLP Extraction Test
  const userText = 'I scored 72 in Python, 64 in statistics and my attendance is 81%. What should I improve?';
  const extracted = extractStudentDataFromText(userText);
  assert('NLP extracts attendance percentage', extracted.attendancePercentage === 81);
  assert('NLP extracts Python score', extracted.subjectMarks?.python === 72);
  const intent = detectIntent(userText, true);
  assert('NLP detects Student Performance Analysis intent', intent === 'STUDENT_PERFORMANCE_ANALYSIS');

  // 4. Recommendation Generation Test
  const recs = generateRuleBasedRecommendations(mockStudent, metrics);
  assert('Generates at least one valid recommendation item', recs.length > 0);
  assert('Recommendations have stated assumptions & limitations', !!recs[0].assumptions && !!recs[0].limitations);

  // 5. File Dataset Statistics Test
  const sampleRows = [
    { id: 1, score: 80, grade: 'A' },
    { id: 2, score: 90, grade: 'A' },
    { id: 3, score: 70, grade: 'B' },
  ];
  const stats = processDatasetStats(sampleRows);
  assert('Dataset stats counts rows accurately', stats.rowCount === 3);
  assert('Dataset stats counts columns accurately', stats.columnCount === 3);
  const scoreCol = stats.columns.find(c => c.name === 'score');
  assert('Dataset stats correctly identifies numeric mean', scoreCol?.mean === 80);

  // 6. Model Evaluation Metrics Verification
  const model = getOrTrainModel();
  assert('Model evaluation accuracy is > 75%', model.evaluation.accuracy > 0.75);
  assert('Confusion matrix is 3x3', model.evaluation.confusionMatrix.length === 3 && model.evaluation.confusionMatrix[0].length === 3);

  console.log(`Test Execution Complete: ${passed} passed, ${failed} failed.`);
  return { passed, failed, results };
}

// Auto-run tests in development console
if (typeof window !== 'undefined') {
  (window as any).runEngineTests = runAllTests;
}
