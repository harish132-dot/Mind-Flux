export interface StudentInput {
  studentName: string;
  age?: number;
  department: string;
  semester: number;
  attendancePercentage: number;
  subjectMarks: {
    mathematics?: number;
    programming?: number;
    dataStructures?: number;
    databaseSystems?: number;
    operatingSystems?: number;
    webDevelopment?: number;
    [key: string]: number | undefined;
  };
  internalMarks: number; // 0 - 25 or 0 - 50 scale
  maxInternalMarks?: number;
  aptitudeScore: number; // 0 - 100
  communicationScore: number; // 0 - 100
  technicalSkillScore: number; // 0 - 100
  numberOfProjects: number;
  numberOfCertifications: number;
  studyHoursPerWeek: number;
  backlogs: number;
  previousSemesterGpa: number; // 0 - 10 scale or percentage
}

export interface StudentCalculatedMetrics {
  averageSubjectScore: number;
  normalizedInternalPercentage: number;
  attendanceRisk: 'Optimal' | 'Satisfactory' | 'At-Risk' | 'Critical';
  compositeAcademicScore: number; // 0 - 100
  skillIndex: number; // 0 - 100
  learningEfficiencyIndex: number; // study hours vs score efficiency
  academicRiskScore: number; // 0 - 100 (lower is better)
  strongAreas: string[];
  weakAreas: string[];
  attendanceAnalysis: string;
  academicTrend: 'Upward' | 'Consistent' | 'Declining';
  skillProfile: {
    technical: number;
    communication: number;
    aptitude: number;
    practical: number;
  };
}

export type PerformanceClass = 'High Performance' | 'Moderate Performance' | 'Needs Improvement';

export interface MLPredictionResult {
  predictedClass: PerformanceClass;
  probabilities: {
    'High Performance': number;
    'Moderate Performance': number;
    'Needs Improvement': number;
  };
  confidence: number;
  featureImportances: {
    feature: string;
    impact: number;
    direction: 'positive' | 'negative';
  }[];
  modelVersion: string;
  modelType: string;
  evaluationMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  limitations: string[];
  predictionTimestamp: string;
}

export type IntentType =
  | 'STUDENT_PERFORMANCE_ANALYSIS'
  | 'DATA_ANALYSIS'
  | 'ML_PREDICTION'
  | 'RECOMMENDATION'
  | 'ACTION_PLANNING'
  | 'DOCUMENT_ANALYSIS'
  | 'GENERAL_AI_EXPLANATION';

export interface OrchestrationResult {
  detectedIntent: IntentType;
  extractedStudentData?: Partial<StudentInput>;
  missingFields: string[];
  isMlRequired: boolean;
  canExecuteMl: boolean;
  clarificationRequired: boolean;
  clarificationQuestion?: string;
  analysisResults?: {
    metrics: StudentCalculatedMetrics;
    prediction?: MLPredictionResult;
    recommendations: RecommendationItem[];
    actionPlanSuggested?: ActionPlanDraft;
  };
}

export interface RecommendationItem {
  id: string;
  title: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  difficulty: 'easy' | 'medium' | 'challenging';
  nextAction: string;
  assumptions: string;
  limitations: string;
}

export interface ActionPlanDraft {
  title: string;
  targetGoal: string;
  tasks: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    duration: string;
    dueDateDays: number;
  }[];
}

export interface ActionPlanDocument {
  id: string;
  userId: string;
  title: string;
  targetGoal: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface TaskDocument {
  id: string;
  planId: string;
  userId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  duration: string;
  dueDate: string;
  status: 'todo' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  detectedIntent?: IntentType;
  structuredAnswer?: {
    answer: string;
    analysis?: string;
    prediction?: MLPredictionResult;
    recommendations?: RecommendationItem[];
    nextSteps?: string[];
  };
  metrics?: StudentCalculatedMetrics;
  actionPlanId?: string;
  suggestedPrompts?: string[];
}

export interface ConversationThread {
  id: string;
  userId: string;
  title: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: string;
  createdAt: string;
}

export interface DatasetStatistics {
  rowCount: number;
  columnCount: number;
  columns: {
    name: string;
    type: 'number' | 'string' | 'boolean' | 'date';
    missingCount: number;
    uniqueCount: number;
    mean?: number;
    median?: number;
    min?: number;
    max?: number;
    stdDev?: number;
  }[];
  correlations?: {
    featureA: string;
    featureB: string;
    correlation: number;
  }[];
  outlierSummary?: {
    column: string;
    outlierCount: number;
  }[];
}
