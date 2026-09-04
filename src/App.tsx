import React, { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/LandingPage";
import { DashboardView } from "./components/DashboardView";
import { AIJournalView } from "./components/AIJournalView";
import { ConversationHistoryView } from "./components/ConversationHistoryView";
import { InsightsView } from "./components/InsightsView";
import { PrivacyDataView } from "./components/PrivacyDataView";
import { AIMemoryView } from "./components/AIMemoryView";
import { JournalDetailModal } from "./components/JournalDetailModal";
import { SecurityAuditModal } from "./components/SecurityAuditModal";
import {
  fetchUserJournals,
  fetchUserConversations,
  deleteJournalEntry,
  deleteConversationSession,
  updateJournalNotes,
  updateJournalTitleAndNotes,
} from "./lib/firebase";
import { JournalEntry, ConversationSession, ActiveTab } from "./types";
import { BrainCircuit, Loader2 } from "lucide-react";

function MainApp() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [conversations, setConversations] = useState<ConversationSession[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);

  // Modals & Navigation state
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [activeConversationToResume, setActiveConversationToResume] =
    useState<ConversationSession | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load user data whenever authenticated user changes
  const loadUserData = useCallback(async () => {
    if (!user) {
      setJournals([]);
      setConversations([]);
      return;
    }

    setDataLoading(true);
    try {
      const [userJournals, userConvs] = await Promise.all([
        fetchUserJournals(user.uid),
        fetchUserConversations(user.uid),
      ]);
      setJournals(userJournals);
      setConversations(userConvs);
    } catch (error) {
      console.error("Error loading user documents:", error);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, loadUserData]);

  // Handlers
  const handleStartNewConversation = () => {
    setActiveConversationToResume(null);
    setActiveTab("journal");
  };

  const handleResumeConversation = (session: ConversationSession) => {
    setActiveConversationToResume(session);
    setActiveTab("journal");
  };

  const handleJournalSaved = (newEntry: JournalEntry) => {
    setJournals((prev) => [newEntry, ...prev.filter((j) => j.id !== newEntry.id)]);
    showToast(`Journal "${newEntry.title}" saved securely to Firestore.`);
    setSelectedJournal(newEntry);
    setActiveTab("dashboard");
  };

  const handleUpdateJournal = async (
    journalId: string,
    updates: { title: string; userNotes: string }
  ) => {
    if (!user) return;
    await updateJournalTitleAndNotes(user.uid, journalId, updates.title, updates.userNotes);
    setJournals((prev) =>
      prev.map((j) =>
        j.id === journalId ? { ...j, title: updates.title, userNotes: updates.userNotes } : j
      )
    );
    if (selectedJournal && selectedJournal.id === journalId) {
      setSelectedJournal({ ...selectedJournal, title: updates.title, userNotes: updates.userNotes });
    }
    showToast("Journal entry updated in Cloud Firestore.");
  };

  const handleUpdateNotes = async (journalId: string, notes: string) => {
    if (!user) return;
    await updateJournalNotes(user.uid, journalId, notes);
    setJournals((prev) =>
      prev.map((j) => (j.id === journalId ? { ...j, userNotes: notes } : j))
    );
    if (selectedJournal && selectedJournal.id === journalId) {
      setSelectedJournal({ ...selectedJournal, userNotes: notes });
    }
    showToast("Notes updated in Cloud Firestore.");
  };

  const handleDeleteJournal = async (journalId: string) => {
    if (!user) return;
    await deleteJournalEntry(user.uid, journalId);
    setJournals((prev) => prev.filter((j) => j.id !== journalId));
    if (selectedJournal?.id === journalId) {
      setSelectedJournal(null);
    }
    showToast("Journal entry deleted permanently.");
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!user) return;
    await deleteConversationSession(user.uid, conversationId);
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    showToast("Conversation session removed.");
  };

  const handleDataPurged = () => {
    setJournals([]);
    setConversations([]);
    setSelectedJournal(null);
    setActiveTab("dashboard");
    showToast("All user records purged from Firestore.");
  };

  // 1. Initial Authentication Check Screen
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 text-stone-700">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-emerald-400 shadow-md animate-pulse">
          <BrainCircuit className="h-6 w-6" />
        </div>
        <p className="mt-4 text-xs font-semibold tracking-wider uppercase text-stone-500">
          Verifying Identity Anchor...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated: Show Landing Page
  if (!user) {
    return (
      <>
        <LandingPage onOpenSecurityModal={() => setIsSecurityModalOpen(true)} />
        <SecurityAuditModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
        />
      </>
    );
  }

  // 3. Authenticated: Render Main Application
  return (
    <div className="min-h-screen bg-stone-100/60 text-stone-800 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {dataLoading && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-600 shadow-2xs">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            <span>Synchronizing secure records from Cloud Firestore...</span>
          </div>
        )}

        {/* Dynamic Tab Views */}
        {activeTab === "dashboard" && (
          <DashboardView
            journals={journals}
            conversations={conversations}
            onStartNewConversation={handleStartNewConversation}
            onSelectJournal={(entry) => setSelectedJournal(entry)}
            onDeleteJournal={handleDeleteJournal}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "journal" && (
          <AIJournalView
            onJournalSaved={handleJournalSaved}
            initialConversation={activeConversationToResume}
          />
        )}

        {activeTab === "memory" && (
          <AIMemoryView
            journals={journals}
            onSelectJournal={(entry) => setSelectedJournal(entry)}
          />
        )}

        {activeTab === "history" && (
          <ConversationHistoryView
            conversations={conversations}
            onResumeConversation={handleResumeConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        )}

        {activeTab === "insights" && (
          <InsightsView journals={journals} setActiveTab={setActiveTab} />
        )}

        {activeTab === "privacy" && (
          <PrivacyDataView
            journals={journals}
            conversations={conversations}
            onDataPurged={handleDataPurged}
            onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
            onRefreshData={loadUserData}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg border border-stone-700 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Detailed Journal Entry Modal */}
      <JournalDetailModal
        entry={selectedJournal}
        onClose={() => setSelectedJournal(null)}
        onUpdateNotes={handleUpdateNotes}
        onUpdateJournal={handleUpdateJournal}
        onDelete={handleDeleteJournal}
      />

      {/* Security Architecture Audit Modal */}
      <SecurityAuditModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
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
