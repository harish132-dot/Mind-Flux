import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Edit2,
  Copy,
  Check,
  RotateCw,
  Send,
  Paperclip,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Cpu,
  BarChart2,
  AlertCircle,
  FileText,
  Zap,
  ListTodo,
  TrendingUp,
} from 'lucide-react';
import {
  ChatMessage,
  ConversationThread,
  StudentInput,
  StudentCalculatedMetrics,
  MLPredictionResult,
} from '../types';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

interface WorkspaceViewProps {
  initialStudentContext?: {
    student: StudentInput;
    metrics: StudentCalculatedMetrics;
    prediction: MLPredictionResult;
  } | null;
  onOpenActionPlans?: () => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  initialStudentContext,
  onOpenActionPlans,
}) => {
  const { profile } = useAuth();
  const userId = profile?.uid || 'guest-demo-user';

  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [searchConvQuery, setSearchConvQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);

  // Active student context in this workspace session
  const [currentStudentContext, setCurrentStudentContext] = useState(initialStudentContext || null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [userId]);

  const loadConversations = async () => {
    try {
      const list = await firestoreService.getConversations(userId);
      if (list && list.length > 0) {
        setConversations(list);
        if (!activeConvId) {
          setActiveConvId(list[0].id);
          loadMessages(list[0].id);
        }
      } else {
        // Create initial default welcome conversation
        handleNewChat('Academic Intelligence Consultation');
      }
    } catch (e) {
      console.warn('Using local fallback threads:', e);
      const fallbackThread: ConversationThread = {
        id: 'default-conv-1',
        userId,
        title: 'Academic Intelligence Consultation',
        lastMessage: 'Ready to assist with student analytics and ML diagnostics.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations([fallbackThread]);
      setActiveConvId('default-conv-1');
      setMessages([
        {
          id: 'welcome-msg',
          role: 'assistant',
          content: `### Executive Summary
Welcome to **AI INSIGHT ENGINE** ("Think. Analyze. Predict. Act.").

I am connected to the server-side **Gemini** intelligence engine and our verified **Modular Machine Learning** classification layer.

### What You Can Do
1. **Analyze Student Data:** Share attendance, marks, study hours, or backlogs in plain text (e.g., *"I scored 72 in Python, 64 in statistics and my attendance is 81%. What should I improve?"*).
2. **Execute ML Predictions:** Run statistical performance classification with calibrated probability confidence.
3. **Generate Action Roadmaps:** Convert diagnostic findings into actionable task milestones.
4. **Upload Datasets:** Attach CSV or Excel cohorts for automated tabular profiling.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await firestoreService.getMessages(convId, userId);
      if (msgs && msgs.length > 0) {
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.warn('Could not load remote messages:', e);
    }
  };

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // When initialStudentContext changes from outside
  useEffect(() => {
    if (initialStudentContext) {
      setCurrentStudentContext(initialStudentContext);
      // Auto post a diagnostic summary message
      const prompt = `Please provide a strategic academic evaluation for ${initialStudentContext.student.studentName} based on the calculated metrics (${initialStudentContext.metrics.compositeAcademicScore}/100 composite, ${initialStudentContext.student.attendancePercentage}% attendance) and the ${initialStudentContext.prediction.predictedClass} ML classification.`;
      handleSendMessage(prompt);
    }
  }, [initialStudentContext]);

  const handleNewChat = async (customTitle?: string) => {
    const title = customTitle || `Consultation ${conversations.length + 1}`;
    try {
      const newConv = await firestoreService.createConversation(userId, title);
      setConversations([newConv, ...conversations]);
      setActiveConvId(newConv.id);
      setMessages([
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `### Executive Summary
Started a fresh session. How can I assist you with your academic diagnostics, ML evaluations, or dataset analysis today?`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      const localId = `conv-${Date.now()}`;
      const newConv: ConversationThread = {
        id: localId,
        userId,
        title,
        lastMessage: 'Started new consultation session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations([newConv, ...conversations]);
      setActiveConvId(localId);
      setMessages([
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `### Executive Summary
Started a fresh session. How can I assist you with your academic diagnostics, ML evaluations, or dataset analysis today?`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await firestoreService.deleteConversation(convId);
    } catch (err) {
      console.warn('Local delete:', err);
    }
    const updated = conversations.filter((c) => c.id !== convId);
    setConversations(updated);
    if (activeConvId === convId && updated.length > 0) {
      setActiveConvId(updated[0].id);
    }
  };

  const handleStartRename = (conv: ConversationThread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditTitleText(conv.title);
  };

  const handleSaveRename = async (convId: string) => {
    if (!editTitleText.trim()) return;
    try {
      await firestoreService.updateConversationTitle(convId, editTitleText.trim(), userId);
    } catch (e) {
      console.warn('Rename error:', e);
    }
    setConversations(
      conversations.map((c) => (c.id === convId ? { ...c, title: editTitleText.trim() } : c))
    );
    setEditingConvId(null);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Save user message to Firestore
      if (activeConvId) {
        firestoreService.saveMessage(activeConvId, userId, userMsg).catch(console.warn);
      }

      // Call server-side API `/api/chat`
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: nextMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          studentData: currentStudentContext?.student,
          fileContext: attachedFileName ? `User attached reference file: ${attachedFileName}` : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();

      // Update right panel with new student context if detected
      if (data.metrics && data.prediction) {
        setCurrentStudentContext({
          student: {
            ...currentStudentContext?.student,
            studentName: data.orchestration?.extractedStudentData?.studentName || 'Student',
            department: data.orchestration?.extractedStudentData?.department || 'Engineering',
            semester: data.orchestration?.extractedStudentData?.semester || 5,
            attendancePercentage: data.orchestration?.extractedStudentData?.attendancePercentage ?? 78,
            subjectMarks: data.orchestration?.extractedStudentData?.subjectMarks || {},
            internalMarks: 20,
            aptitudeScore: 70,
            communicationScore: 70,
            technicalSkillScore: 70,
            numberOfProjects: 2,
            numberOfCertifications: 1,
            studyHoursPerWeek: 12,
            backlogs: 0,
            previousSemesterGpa: 7.5,
          },
          metrics: data.metrics,
          prediction: data.prediction,
        });
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
        detectedIntent: data.orchestration?.detectedIntent,
        metrics: data.metrics,
        suggestedPrompts: [
          'How can I raise my composite score to 85%?',
          'What are the concrete limitations of this ML prediction?',
          'Generate a 4-week structured action roadmap.',
        ],
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (activeConvId) {
        firestoreService.saveMessage(activeConvId, userId, assistantMsg).catch(console.warn);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `asst-err-${Date.now()}`,
        role: 'assistant',
        content: `### Executive Summary
Encountered an operational error processing your request: ${err.message || 'Network error'}.

### Recommendation
Please retry the query or review your network connection.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setAttachedFileName(null);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFileName(file.name);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchConvQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)]">
      {/* LEFT: Conversation Threads (Collapsible / fixed width) */}
      <div className="w-64 bg-slate-950/60 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={() => handleNewChat()}
            className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>

        {/* Thread Search */}
        <div className="p-2 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchConvQuery}
              onChange={(e) => setSearchConvQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.map((conv) => {
            const isActive = activeConvId === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`group flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                  {editingConvId === conv.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      onBlur={() => handleSaveRename(conv.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(conv.id)}
                      className="bg-slate-950 text-xs text-white px-1.5 py-0.5 rounded border border-indigo-500 w-full"
                    />
                  ) : (
                    <span className="truncate font-medium">{conv.title}</span>
                  )}
                </div>

                <div className="hidden group-hover:flex items-center gap-1 pl-1">
                  <button
                    onClick={(e) => handleStartRename(conv, e)}
                    className="p-1 text-slate-500 hover:text-slate-300 rounded"
                    title="Rename"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER: Main Chat Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Chat Header */}
        <div className="h-12 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/60 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white truncate max-w-sm">
              {conversations.find((c) => c.id === activeConvId)?.title || 'Consultation Session'}
            </span>
          </div>

          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {showRightPanel ? (
              <>
                <span>Hide Insight Panel</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Show Insight Panel</span>
              </>
            )}
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-md ${
                    isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gradient-to-tr from-indigo-900 via-indigo-700 to-purple-800 text-indigo-200 border border-indigo-500/40'
                  }`}
                >
                  {isUser ? 'You' : <Sparkles className="w-4 h-4 text-white" />}
                </div>

                {/* Message Bubble & Content Card */}
                <div
                  className={`flex-1 space-y-3 rounded-2xl p-4 md:p-5 text-xs shadow-lg leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600/90 text-white border border-indigo-500/40'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800/90 backdrop-blur-sm'
                  }`}
                >
                  {/* Clean Markdown parsing / formatted output */}
                  <div className="space-y-3 text-slate-200 whitespace-pre-line text-xs font-normal">
                    {msg.content.split('### ').map((section, idx) => {
                      if (!section.trim()) return null;
                      const [title, ...bodyParts] = section.split('\n');
                      const body = bodyParts.join('\n').trim();

                      if (idx === 0 && !msg.content.startsWith('### ')) {
                        return <p key={idx}>{section}</p>;
                      }

                      let borderClass = 'border-slate-800';
                      let titleColor = 'text-slate-200';
                      if (title.includes('Executive Summary')) titleColor = 'text-indigo-300';
                      if (title.includes('Diagnostic Analysis')) titleColor = 'text-blue-300';
                      if (title.includes('Machine Learning')) {
                        titleColor = 'text-emerald-300';
                        borderClass = 'border-emerald-500/30 bg-emerald-950/20';
                      }
                      if (title.includes('Recommendations')) titleColor = 'text-amber-300';
                      if (title.includes('Next Steps')) titleColor = 'text-purple-300';

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border ${borderClass} bg-slate-950/40 space-y-1.5`}
                        >
                          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${titleColor}`}>
                            {title.includes('Machine Learning') && <Cpu className="w-3.5 h-3.5" />}
                            {title.includes('Diagnostic') && <BarChart2 className="w-3.5 h-3.5" />}
                            {title.includes('Next Steps') && <ListTodo className="w-3.5 h-3.5" />}
                            {title}
                          </h4>
                          <div className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-wrap">
                            {body}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions footer (Copy, Regenerate) */}
                  {!isUser && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-pointer"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSendMessage('Please regenerate this analysis with deeper actionable suggestions.')}
                          className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-pointer ml-2"
                        >
                          <RotateCw className="w-3 h-3" /> Regenerate
                        </button>
                      </div>
                      <span className="font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Follow-up Prompts */}
                  {!isUser && msg.suggestedPrompts && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {msg.suggestedPrompts.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(prompt)}
                          className="px-2.5 py-1 rounded-full bg-slate-950 hover:bg-slate-800 text-[10px] text-indigo-300 border border-indigo-500/20 transition-all cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3.5 max-w-xl">
              <div className="w-8 h-8 rounded-xl bg-indigo-900/60 border border-indigo-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-300 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span>Executing orchestration, calculations & Gemini reasoning...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 backdrop-blur-md">
          {attachedFileName && (
            <div className="mb-2 px-3 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 truncate">
                <Paperclip className="w-3.5 h-3.5" /> Attached: {attachedFileName}
              </span>
              <button
                onClick={() => setAttachedFileName(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-2 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 shadow-lg">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileAttach}
              accept=".csv,.xlsx,.xls,.pdf,.txt"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach CSV, Excel or PDF document"
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <textarea
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask anything or enter student data (e.g. 'I scored 72 in Python, 64 in statistics and my attendance is 81%...')"
              className="flex-1 bg-transparent border-0 text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none py-1.5 max-h-32"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Collapsible Context / Insight Panel */}
      {showRightPanel && (
        <div className="w-80 bg-slate-950/90 border-l border-slate-800 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Insight Panel
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              Synchronized
            </span>
          </div>

          {currentStudentContext ? (
            <div className="space-y-4">
              {/* Target Student Identity */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Target Student</span>
                <div className="text-sm font-bold text-white mt-0.5">
                  {currentStudentContext.student.studentName}
                </div>
                <div className="text-[11px] text-slate-400">
                  {currentStudentContext.student.department} • Sem {currentStudentContext.student.semester}
                </div>
              </div>

              {/* Real Metrics Card */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Ground Truth Calculations
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Composite</span>
                    <span className="text-base font-bold text-white font-mono">
                      {currentStudentContext.metrics.compositeAcademicScore}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Attendance</span>
                    <span className="text-base font-bold text-indigo-300 font-mono">
                      {currentStudentContext.student.attendancePercentage}%
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 pt-1">
                  Risk status:{' '}
                  <span className="font-bold text-amber-400">
                    {currentStudentContext.metrics.attendanceRisk}
                  </span>
                </div>
              </div>

              {/* Real ML Classification Card */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-indigo-300 flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" /> ML Classification
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    {(currentStudentContext.prediction.confidence * 100).toFixed(1)}% Conf
                  </span>
                </div>
                <div className="text-sm font-extrabold text-white">
                  {currentStudentContext.prediction.predictedClass}
                </div>
                <div className="space-y-1 pt-1">
                  {Object.entries(currentStudentContext.prediction.probabilities).map(([cls, prob]) => (
                    <div key={cls} className="space-y-0.5 text-[10px]">
                      <div className="flex justify-between text-slate-300">
                        <span className="truncate">{cls}</span>
                        <span className="font-mono">{(prob * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.round(prob * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Plan Trigger */}
              <button
                onClick={onOpenActionPlans}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ListTodo className="w-4 h-4" />
                View Active Action Plans
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Mention student marks or run an analysis in the flagship tab to populate live context.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
