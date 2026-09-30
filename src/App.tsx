import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { WorkspaceView } from './components/WorkspaceView';
import { DashboardView } from './components/DashboardView';
import { StudentAnalyzerView } from './components/StudentAnalyzerView';
import { MLStudioView } from './components/MLStudioView';
import { FilesView } from './components/FilesView';
import { ActionPlansView } from './components/ActionPlansView';
import { ReportsView } from './components/ReportsView';
import { HistoryView } from './components/HistoryView';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { StudentInput, StudentCalculatedMetrics, MLPredictionResult } from './types';

function MainApp() {
  const [currentTab, setCurrentTab] = useState<NavTab>('analyses');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Active student context passed to Workspace
  const [activeStudentContext, setActiveStudentContext] = useState<{
    student: StudentInput;
    metrics: StudentCalculatedMetrics;
    prediction: MLPredictionResult;
  } | null>(null);

  const handleSelectTab = (tab: NavTab) => {
    if (tab === 'settings') {
      setIsSettingsModalOpen(true);
    } else {
      setCurrentTab(tab);
    }
  };

  const handleOpenStudentInChat = (
    student: StudentInput,
    metrics: StudentCalculatedMetrics,
    prediction: MLPredictionResult
  ) => {
    setActiveStudentContext({ student, metrics, prediction });
    setCurrentTab('workspace');
  };

  const handleAnalyzeDatasetWithAi = (summaryPrompt: string) => {
    setCurrentTab('workspace');
    // Workspace will consume or user can send
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Topbar */}
        <Topbar
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onNavigate={(tab) => setCurrentTab(tab)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* View Switcher */}
        <main className="flex-1 flex overflow-hidden relative">
          {currentTab === 'workspace' && (
            <WorkspaceView
              initialStudentContext={activeStudentContext}
              onOpenActionPlans={() => setCurrentTab('action-plans')}
            />
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateToAnalyzer={() => setCurrentTab('analyses')}
              onNavigateToPlans={() => setCurrentTab('action-plans')}
            />
          )}

          {currentTab === 'analyses' && (
            <StudentAnalyzerView
              onOpenInChat={handleOpenStudentInChat}
              onPlanCreated={() => setCurrentTab('action-plans')}
            />
          )}

          {currentTab === 'predictions' && <MLStudioView />}

          {currentTab === 'files' && (
            <FilesView onAnalyzeWithAi={handleAnalyzeDatasetWithAi} />
          )}

          {currentTab === 'action-plans' && <ActionPlansView />}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'history' && (
            <HistoryView onSelectSession={(id) => setCurrentTab('workspace')} />
          )}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
