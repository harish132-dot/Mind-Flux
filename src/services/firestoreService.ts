import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  ConversationThread,
  ChatMessage,
  StudentCalculatedMetrics,
  MLPredictionResult,
  ActionPlanDocument,
  TaskDocument,
  DatasetStatistics,
} from '../types';

export const firestoreService = {
  // === CONVERSATIONS ===
  async getConversations(userId: string): Promise<ConversationThread[]> {
    const colPath = 'conversations';
    try {
      const q = query(
        collection(db, colPath),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as ConversationThread[];
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  },

  async createConversation(userId: string, title: string): Promise<ConversationThread> {
    const colPath = 'conversations';
    try {
      const newDocRef = doc(collection(db, colPath));
      const now = new Date().toISOString();
      const conversationData: ConversationThread = {
        id: newDocRef.id,
        userId,
        title,
        lastMessage: 'Started new consultation session',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(newDocRef, conversationData);
      return conversationData;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, colPath);
    }
  },

  async updateConversationTitle(convId: string, title: string, userId: string): Promise<void> {
    const docPath = `conversations/${convId}`;
    try {
      await updateDoc(doc(db, 'conversations', convId), {
        title,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  },

  async deleteConversation(convId: string): Promise<void> {
    const docPath = `conversations/${convId}`;
    try {
      await deleteDoc(doc(db, 'conversations', convId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  },

  // === MESSAGES ===
  async getMessages(conversationId: string, userId: string): Promise<ChatMessage[]> {
    const colPath = 'messages';
    try {
      const q = query(
        collection(db, colPath),
        where('userId', '==', userId),
        orderBy('timestamp', 'asc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      const all = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as (ChatMessage & { conversationId?: string })[];
      return all.filter(m => m.conversationId === conversationId);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  },

  async saveMessage(conversationId: string, userId: string, message: ChatMessage): Promise<void> {
    const colPath = 'messages';
    try {
      await setDoc(doc(db, colPath, message.id), {
        ...message,
        conversationId,
        userId,
        timestamp: message.timestamp || new Date().toISOString(),
      });

      // Update conversation lastMessage
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: message.content.slice(0, 150),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, colPath);
    }
  },

  // === ANALYSES ===
  async saveAnalysis(userId: string, data: {
    studentName: string;
    department: string;
    semester: number;
    metrics: StudentCalculatedMetrics;
  }): Promise<string> {
    const colPath = 'analyses';
    try {
      const newDoc = doc(collection(db, colPath));
      await setDoc(newDoc, {
        id: newDoc.id,
        userId,
        studentName: data.studentName,
        department: data.department,
        semester: data.semester,
        attendancePercentage: data.metrics.normalizedInternalPercentage,
        overallScore: data.metrics.compositeAcademicScore,
        academicRisk: data.metrics.attendanceRisk,
        metrics: data.metrics,
        createdAt: new Date().toISOString(),
      });
      return newDoc.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, colPath);
    }
  },

  async getAnalyses(userId: string): Promise<any[]> {
    const colPath = 'analyses';
    try {
      const q = query(
        collection(db, colPath),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(30)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  },

  // === PREDICTIONS ===
  async savePrediction(userId: string, data: {
    studentName: string;
    prediction: MLPredictionResult;
  }): Promise<string> {
    const colPath = 'predictions';
    try {
      const newDoc = doc(collection(db, colPath));
      await setDoc(newDoc, {
        id: newDoc.id,
        userId,
        studentName: data.studentName,
        predictedClass: data.prediction.predictedClass,
        confidence: data.prediction.confidence,
        probabilities: data.prediction.probabilities,
        modelVersion: data.prediction.modelVersion,
        modelType: data.prediction.modelType,
        evaluationMetrics: data.prediction.evaluationMetrics,
        featureImportances: data.prediction.featureImportances,
        limitations: data.prediction.limitations,
        createdAt: new Date().toISOString(),
      });
      return newDoc.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, colPath);
    }
  },

  async getPredictions(userId: string): Promise<any[]> {
    const colPath = 'predictions';
    try {
      const q = query(
        collection(db, colPath),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(30)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  },

  // === ACTION PLANS & TASKS ===
  async createActionPlan(userId: string, plan: {
    title: string;
    targetGoal: string;
    tasks: {
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      duration: string;
      dueDateDays: number;
    }[];
  }): Promise<ActionPlanDocument> {
    const colPath = 'actionPlans';
    try {
      const planDoc = doc(collection(db, colPath));
      const now = new Date().toISOString();
      const planRecord: ActionPlanDocument = {
        id: planDoc.id,
        userId,
        title: plan.title,
        targetGoal: plan.targetGoal,
        totalTasks: plan.tasks.length,
        completedTasks: 0,
        progress: 0,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(planDoc, planRecord);

      // Create individual task records
      for (const t of plan.tasks) {
        const taskDoc = doc(collection(db, 'tasks'));
        const dueDate = new Date(Date.now() + t.dueDateDays * 86400000).toISOString().split('T')[0];
        const taskRecord: TaskDocument = {
          id: taskDoc.id,
          planId: planDoc.id,
          userId,
          title: t.title,
          description: t.description,
          priority: t.priority,
          duration: t.duration,
          dueDate,
          status: 'todo',
          createdAt: now,
        };
        await setDoc(taskDoc, taskRecord);
      }

      return planRecord;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, colPath);
    }
  },

  async getActionPlans(userId: string): Promise<ActionPlanDocument[]> {
    const colPath = 'actionPlans';
    try {
      const q = query(
        collection(db, colPath),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ActionPlanDocument[];
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  },

  async getTasksForPlan(planId: string, userId: string): Promise<TaskDocument[]> {
    const colPath = 'tasks';
    try {
      const q = query(
        collection(db, colPath),
        where('userId', '==', userId),
        where('planId', '==', planId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TaskDocument[];
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  },

  async getAllTasks(userId: string): Promise<TaskDocument[]> {
    const colPath = 'tasks';
    try {
      const q = query(
        collection(db, colPath),
        where('userId', '==', userId),
        limit(100)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TaskDocument[];
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  },

  async updateTaskStatus(
    taskId: string,
    planId: string,
    newStatus: 'todo' | 'in_progress' | 'completed',
    userId: string
  ): Promise<void> {
    const docPath = `tasks/${taskId}`;
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus,
      });

      // Recalculate plan progress
      const tasks = await this.getTasksForPlan(planId, userId);
      const completed = tasks.filter(t => (t.id === taskId ? newStatus === 'completed' : t.status === 'completed')).length;
      const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

      await updateDoc(doc(db, 'actionPlans', planId), {
        completedTasks: completed,
        progress,
        status: progress === 100 ? 'completed' : 'active',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }
  },

  // === UPLOADED FILES ===
  async saveUploadedFileMetadata(userId: string, meta: {
    fileName: string;
    fileSize: number;
    fileType: string;
    rowCount: number;
    columnNames: string[];
    summaryStats: DatasetStatistics;
  }): Promise<string> {
    const colPath = 'uploadedFiles';
    try {
      const fileDoc = doc(collection(db, colPath));
      await setDoc(fileDoc, {
        id: fileDoc.id,
        userId,
        ...meta,
        createdAt: new Date().toISOString(),
      });
      return fileDoc.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, colPath);
    }
  },

  async getUploadedFiles(userId: string): Promise<any[]> {
    const colPath = 'uploadedFiles';
    try {
      const q = query(
        collection(db, colPath),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  },

  // === REPORTS ===
  async saveReport(userId: string, report: {
    title: string;
    reportType: string;
    summary: string;
    dataSnapshot: any;
    recommendations: any[];
  }): Promise<string> {
    const colPath = 'reports';
    try {
      const repDoc = doc(collection(db, colPath));
      await setDoc(repDoc, {
        id: repDoc.id,
        userId,
        ...report,
        createdAt: new Date().toISOString(),
      });
      return repDoc.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, colPath);
    }
  },

  async getReports(userId: string): Promise<any[]> {
    const colPath = 'reports';
    try {
      const q = query(
        collection(db, colPath),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  },
};
