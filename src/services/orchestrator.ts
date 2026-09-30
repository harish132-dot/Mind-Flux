import {
  StudentInput,
  OrchestrationResult,
  IntentType,
  StudentCalculatedMetrics,
  MLPredictionResult,
  RecommendationItem,
  ActionPlanDraft,
} from '../types';
import { calculateStudentMetrics, generateRuleBasedRecommendations } from '../ml/studentAnalytics';
import { predictStudentPerformance } from '../ml/inference';

export function detectIntent(text: string, hasStructuredStudentData = false): IntentType {
  const lower = text.toLowerCase();

  if (
    hasStructuredStudentData ||
    lower.includes('attendance') ||
    lower.includes('student') ||
    lower.includes('subject marks') ||
    lower.includes('cgpa') ||
    lower.includes('gpa') ||
    lower.includes('backlog') ||
    lower.includes('scored') ||
    lower.includes('internal marks') ||
    lower.includes('semester')
  ) {
    return 'STUDENT_PERFORMANCE_ANALYSIS';
  }

  if (
    lower.includes('predict') ||
    lower.includes('forecast') ||
    lower.includes('classification') ||
    lower.includes('accuracy') ||
    lower.includes('probability')
  ) {
    return 'ML_PREDICTION';
  }

  if (
    lower.includes('csv') ||
    lower.includes('dataset') ||
    lower.includes('dataframe') ||
    lower.includes('column') ||
    lower.includes('correlation') ||
    lower.includes('data analysis')
  ) {
    return 'DATA_ANALYSIS';
  }

  if (
    lower.includes('action plan') ||
    lower.includes('roadmap') ||
    lower.includes('tasks') ||
    lower.includes('schedule') ||
    lower.includes('step by step plan')
  ) {
    return 'ACTION_PLANNING';
  }

  if (
    lower.includes('recommend') ||
    lower.includes('advice') ||
    lower.includes('suggest') ||
    lower.includes('how to improve')
  ) {
    return 'RECOMMENDATION';
  }

  if (
    lower.includes('file') ||
    lower.includes('pdf') ||
    lower.includes('document') ||
    lower.includes('extract')
  ) {
    return 'DOCUMENT_ANALYSIS';
  }

  return 'GENERAL_AI_EXPLANATION';
}

export function extractStudentDataFromText(text: string): Partial<StudentInput> {
  const extracted: Partial<StudentInput> = {
    subjectMarks: {},
  };

  // Match attendance
  const attMatch = text.match(/attendance\s*(?:is|of|:)?\s*(\d{1,3})%/i) ||
                   text.match(/(\d{1,3})%\s*attendance/i);
  if (attMatch) {
    extracted.attendancePercentage = Math.min(100, Math.max(0, parseInt(attMatch[1], 10)));
  }

  // Match study hours
  const hoursMatch = text.match(/(\d{1,2})\s*(?:hours|hrs)\s*(?:per week|\/week|weekly)?/i) ||
                     text.match(/study\s*(?:hours|time)\s*(?:is|:)?\s*(\d{1,2})/i);
  if (hoursMatch) {
    extracted.studyHoursPerWeek = parseInt(hoursMatch[1], 10);
  }

  // Match GPA / CGPA
  const gpaMatch = text.match(/(?:gpa|cgpa)\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i) ||
                   text.match(/previous\s*(?:semester|sem)\s*gpa\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (gpaMatch) {
    extracted.previousSemesterGpa = parseFloat(gpaMatch[1]);
  }

  // Match backlogs
  const backlogMatch = text.match(/(\d+)\s*(?:active\s*)?backlog/i) ||
                       text.match(/backlogs?\s*[:=]?\s*(\d+)/i) ||
                       text.match(/no\s*backlogs/i);
  if (backlogMatch) {
    if (backlogMatch[0].toLowerCase().includes('no backlog')) {
      extracted.backlogs = 0;
    } else if (backlogMatch[1]) {
      extracted.backlogs = parseInt(backlogMatch[1], 10);
    }
  }

  // Match scores like "scored 72 in Python, 64 in statistics" or "Python: 80, Math: 75"
  const subjectPatterns = [
    /(?:scored|marks?|got)\s+(\d{1,3})\s+(?:in|for)\s+([a-zA-Z\s]+?)(?:,|\.|\band\b|$)/gi,
    /([a-zA-Z\s]+?)\s*[:=]\s*(\d{1,3})(?:%|\b)/gi,
  ];

  for (const pattern of subjectPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let subject = '';
      let score = 0;
      if (isNaN(Number(match[1]))) {
        subject = match[1].trim().toLowerCase();
        score = parseInt(match[2], 10);
      } else {
        score = parseInt(match[1], 10);
        subject = match[2].trim().toLowerCase();
      }

      if (subject.length > 2 && subject.length < 30 && !['scored', 'got', 'and', 'with', 'the', 'my', 'is'].includes(subject)) {
        if (!extracted.subjectMarks) extracted.subjectMarks = {};
        extracted.subjectMarks[subject] = Math.min(100, Math.max(0, score));
      }
    }
  }

  // Match skills / scores
  const techMatch = text.match(/technical\s*(?:skill|score)?\s*[:=]?\s*(\d{1,3})/i);
  if (techMatch) extracted.technicalSkillScore = parseInt(techMatch[1], 10);

  const commMatch = text.match(/communication\s*(?:skill|score)?\s*[:=]?\s*(\d{1,3})/i);
  if (commMatch) extracted.communicationScore = parseInt(commMatch[1], 10);

  const aptMatch = text.match(/aptitude\s*(?:score)?\s*[:=]?\s*(\d{1,3})/i);
  if (aptMatch) extracted.aptitudeScore = parseInt(aptMatch[1], 10);

  const projMatch = text.match(/(\d+)\s*projects?/i);
  if (projMatch) extracted.numberOfProjects = parseInt(projMatch[1], 10);

  const certMatch = text.match(/(\d+)\s*certifications?/i);
  if (certMatch) extracted.numberOfCertifications = parseInt(certMatch[1], 10);

  return extracted;
}

export function orchestrateAnalysis(
  userMessage: string,
  providedStudentData?: Partial<StudentInput>
): OrchestrationResult {
  const extractedFromMsg = extractStudentDataFromText(userMessage);
  const mergedData: Partial<StudentInput> = {
    ...extractedFromMsg,
    ...providedStudentData,
    subjectMarks: {
      ...(extractedFromMsg.subjectMarks || {}),
      ...(providedStudentData?.subjectMarks || {}),
    },
  };

  const hasAnyStudentFields = Object.keys(mergedData.subjectMarks || {}).length > 0 ||
    mergedData.attendancePercentage !== undefined ||
    mergedData.previousSemesterGpa !== undefined;

  const detectedIntent = detectIntent(userMessage, hasAnyStudentFields);

  const missingFields: string[] = [];
  if (mergedData.attendancePercentage === undefined) missingFields.push('Attendance %');
  if (Object.keys(mergedData.subjectMarks || {}).length === 0) missingFields.push('Subject Marks');
  if (mergedData.technicalSkillScore === undefined) missingFields.push('Technical Skill Score (0-100)');
  if (mergedData.aptitudeScore === undefined) missingFields.push('Aptitude Score (0-100)');
  if (mergedData.studyHoursPerWeek === undefined) missingFields.push('Weekly Study Hours');

  // Can we execute ML prediction? We need at least basic academic metrics
  const canExecuteMl = mergedData.attendancePercentage !== undefined ||
    Object.keys(mergedData.subjectMarks || {}).length > 0 ||
    mergedData.previousSemesterGpa !== undefined;

  let clarificationRequired = false;
  let clarificationQuestion: string | undefined;

  if (detectedIntent === 'STUDENT_PERFORMANCE_ANALYSIS' && missingFields.length >= 4) {
    clarificationRequired = true;
    clarificationQuestion = `To deliver a fully calibrated academic diagnostic, could you share your approximate attendance percentage and technical skill rating (0-100)?`;
  }

  // Construct complete StudentInput with sensible defaults for unfilled dimensions
  const completeInput: StudentInput = {
    studentName: mergedData.studentName || 'Student',
    department: mergedData.department || 'Computer Science & Engineering',
    semester: mergedData.semester || 5,
    attendancePercentage: mergedData.attendancePercentage ?? 78,
    subjectMarks: Object.keys(mergedData.subjectMarks || {}).length > 0
      ? mergedData.subjectMarks!
      : { python: 72, mathematics: 68, databaseSystems: 74 },
    internalMarks: mergedData.internalMarks ?? 20,
    maxInternalMarks: mergedData.maxInternalMarks ?? 25,
    aptitudeScore: mergedData.aptitudeScore ?? 70,
    communicationScore: mergedData.communicationScore ?? 72,
    technicalSkillScore: mergedData.technicalSkillScore ?? 68,
    numberOfProjects: mergedData.numberOfProjects ?? 2,
    numberOfCertifications: mergedData.numberOfCertifications ?? 1,
    studyHoursPerWeek: mergedData.studyHoursPerWeek ?? 12,
    backlogs: mergedData.backlogs ?? 0,
    previousSemesterGpa: mergedData.previousSemesterGpa ?? 7.4,
  };

  let analysisResults: OrchestrationResult['analysisResults'];

  if (detectedIntent === 'STUDENT_PERFORMANCE_ANALYSIS' || detectedIntent === 'ML_PREDICTION' || detectedIntent === 'RECOMMENDATION') {
    const metrics: StudentCalculatedMetrics = calculateStudentMetrics(completeInput);
    const prediction: MLPredictionResult = predictStudentPerformance(completeInput);
    const recommendations: RecommendationItem[] = generateRuleBasedRecommendations(completeInput, metrics);

    const actionPlanDraft: ActionPlanDraft = {
      title: `Academic Growth Plan for ${completeInput.studentName} (Sem ${completeInput.semester})`,
      targetGoal: `Elevate performance to High Performance tier and achieve target CGPA >= 8.5.`,
      tasks: recommendations.slice(0, 4).map((rec, i) => ({
        title: rec.title,
        description: rec.nextAction,
        priority: rec.priority,
        duration: rec.difficulty === 'easy' ? '1 week' : rec.difficulty === 'medium' ? '2 weeks' : '4 weeks',
        dueDateDays: (i + 1) * 7,
      })),
    };

    analysisResults = {
      metrics,
      prediction,
      recommendations,
      actionPlanSuggested: actionPlanDraft,
    };
  }

  return {
    detectedIntent,
    extractedStudentData: mergedData,
    missingFields,
    isMlRequired: detectedIntent === 'STUDENT_PERFORMANCE_ANALYSIS' || detectedIntent === 'ML_PREDICTION',
    canExecuteMl,
    clarificationRequired,
    clarificationQuestion,
    analysisResults,
  };
}
