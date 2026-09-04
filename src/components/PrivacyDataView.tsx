import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  LogOut,
  BookOpen,
  MessageSquare,
  FileText,
  Sparkles,
  Server,
  Layers,
  Database,
  Check,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { JournalEntry, ConversationSession, SavedSummary, SavedWeeklyInsight } from "../types";
import {
  deleteAllUserData,
  deleteJournalEntry,
  deleteConversationSession,
  fetchUserSummaries,
  fetchUserWeeklyInsights,
} from "../lib/firebase";

interface PrivacyDataViewProps {
  journals: JournalEntry[];
  conversations: ConversationSession[];
  onDataPurged: () => void;
  onOpenSecurityModal: () => void;
  onRefreshData?: () => void;
}

export const PrivacyDataView: React.FC<PrivacyDataViewProps> = ({
  journals,
  conversations,
  onDataPurged,
  onOpenSecurityModal,
  onRefreshData,
}) => {
  const { user, signOutUser } = useAuth();
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeInputText, setPurgeInputText] = useState("");
  const [isPurging, setIsPurging] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dynamic counts for all 4 subcollections
  const [savedSummaries, setSavedSummaries] = useState<SavedSummary[]>([]);
  const [savedInsights, setSavedInsights] = useState<SavedWeeklyInsight[]>([]);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  // Load summaries and weekly insights for total counts
  useEffect(() => {
    if (!user) return;
    setIsLoadingCounts(true);
    Promise.all([
      fetchUserSummaries(user.uid).catch(() => []),
      fetchUserWeeklyInsights(user.uid).catch(() => []),
    ])
      .then(([summaries, insights]) => {
        setSavedSummaries(summaries || []);
        setSavedInsights(insights || []);
      })
      .finally(() => {
        setIsLoadingCounts(false);
      });
  }, [user]);

  // Combined AI summaries count (from dedicated collection + journal summaries)
  const totalSummariesCount = Math.max(
    savedSummaries.length,
    journals.filter((j) => !!j.summary).length
  );

  // 1. Export My Data handler
  const handleExportMyData = async () => {
    if (!user) return;
    setIsExporting(true);
    try {
      const [currentSummaries, currentInsights] = await Promise.all([
        fetchUserSummaries(user.uid).catch(() => []),
        fetchUserWeeklyInsights(user.uid).catch(() => []),
      ]);

      const exportPayload = {
        app: "Gemini LifeOS",
        exportTitle: "Personal Data Archive",
        exportedAt: new Date().toISOString(),
        user: {
          authenticatedUid: user.uid,
          email: user.email,
          displayName: user.displayName,
        },
        storageMetrics: {
          totalConversations: conversations.length,
          totalJournals: journals.length,
          totalAISummaries: (currentSummaries?.length || 0) + totalSummariesCount,
          totalWeeklyInsights: currentInsights?.length || 0,
        },
        data: {
          journals,
          conversations,
          summaries: currentSummaries || [],
          weeklyInsights: currentInsights || [],
        },
      };

      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `gemini_lifeos_data_export_${user.uid.slice(0, 8)}_${Date.now()}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error("Export personal data error:", err);
      alert("An error occurred while generating your export archive.");
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Delete Journal handler
  const handleDeleteJournal = async (id: string, title: string) => {
    if (!user) return;
    if (
      !window.confirm(
        `Are you sure you want to delete the journal entry "${title}"? This cannot be recovered.`
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteJournalEntry(user.uid, id);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error("Failed to delete journal entry:", err);
      alert("Failed to delete journal entry. Please verify permissions.");
    } finally {
      setDeletingId(null);
    }
  };

  // 3. Delete Conversation handler
  const handleDeleteConversation = async (id: string, title: string) => {
    if (!user) return;
    if (
      !window.confirm(
        `Are you sure you want to delete the conversation session "${title}"? This cannot be recovered.`
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteConversationSession(user.uid, id);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error("Failed to delete conversation session:", err);
      alert("Failed to delete conversation session. Please verify permissions.");
    } finally {
      setDeletingId(null);
    }
  };

  // 4. Delete All My Data handler (Permanent purge with strict confirmation)
  const handleDeleteAllMyData = async () => {
    if (!user) return;
    if (purgeInputText.trim() !== "DELETE ALL") {
      alert('Please type "DELETE ALL" exactly in the confirmation field.');
      return;
    }

    setIsPurging(true);
    try {
      await deleteAllUserData(user.uid);
      setShowPurgeModal(false);
      setPurgeInputText("");
      setSavedSummaries([]);
      setSavedInsights([]);
      onDataPurged();
      alert("All your personal data across all subcollections has been permanently erased from Cloud Firestore.");
    } catch (err: unknown) {
      console.error("Purge all data error:", err);
      alert("Failed to delete all data. Please check connection and permissions.");
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div id="privacy-center-container" className="space-y-8 pb-16">
      {/* 1. Header with Title & Sign Out Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <span className="uppercase tracking-wider">User Sovereignty & Security</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight font-serif">
            Privacy Center
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
            Audit your stored documents, inspect cryptographic path boundaries, export a complete
            archive of your data, manage individual entries, or permanently erase your footprint.
          </p>
        </div>

        {/* Mandated Button: Sign Out */}
        <button
          id="privacy-sign-out-button"
          onClick={signOutUser}
          className="inline-flex items-center justify-center gap-2 self-start sm:self-auto rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-800 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-2xs"
        >
          <LogOut className="h-4 w-4 text-stone-500" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* 2. Authenticated Identity Banner */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Authoritative Firebase Identity
              </span>
              <p className="font-mono text-xs sm:text-sm font-bold text-stone-900 truncate">
                {user?.uid || "Unauthenticated"}
              </p>
              <p className="text-[11px] text-stone-500">
                Authenticated Account: {user?.email || "Google Account"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-right self-start sm:self-auto">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
              Security Status
            </span>
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 justify-end">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Isolated User Sandbox
            </span>
          </div>
        </div>
      </div>

      {/* 3. The 4 Mandated Document Totals */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Your Stored Data Footprint
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Number of conversations */}
          <div
            id="metric-total-conversations"
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Number of conversations
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-stone-900 font-serif">
              {conversations.length}
            </p>
            <span className="mt-2 text-[11px] text-stone-400 font-mono">
              users/{user?.uid?.slice(0, 6)}.../conversations
            </span>
          </div>

          {/* 2. Number of journal entries */}
          <div
            id="metric-total-journals"
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Number of journal entries
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-stone-900 font-serif">
              {journals.length}
            </p>
            <span className="mt-2 text-[11px] text-stone-400 font-mono">
              users/{user?.uid?.slice(0, 6)}.../journals
            </span>
          </div>

          {/* 3. Number of summaries */}
          <div
            id="metric-total-summaries"
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Number of summaries
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-stone-900 font-serif">
              {isLoadingCounts ? "..." : totalSummariesCount}
            </p>
            <span className="mt-2 text-[11px] text-stone-400 font-mono">
              users/{user?.uid?.slice(0, 6)}.../summaries
            </span>
          </div>

          {/* 4. Number of weekly insights */}
          <div
            id="metric-total-insights"
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Number of weekly insights
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-stone-900 font-serif">
              {isLoadingCounts ? "..." : savedInsights.length}
            </p>
            <span className="mt-2 text-[11px] text-stone-400 font-mono">
              users/{user?.uid?.slice(0, 6)}.../weeklyInsights
            </span>
          </div>
        </div>
      </div>

      {/* 4. Mandated Action: Export My Data */}
      <div
        id="export-my-data-section"
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Export My Data</span>
            </div>
            <p className="text-xs text-stone-600 max-w-xl leading-relaxed">
              Download your complete personal data in standard, open JSON format. Includes all
              conversations, journals, structured AI summaries, goals, key points, and weekly
              intelligence reports.
            </p>
          </div>

          <button
            id="export-my-data-button"
            onClick={handleExportMyData}
            disabled={isExporting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-all shrink-0 shadow-xs"
          >
            <FileCode className="h-4 w-4" />
            <span>{isExporting ? "Compiling Archive..." : "Export My Data"}</span>
          </button>
        </div>

        {exportSuccess && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Personal data archive exported and downloaded to your device successfully.</span>
          </div>
        )}
      </div>

      {/* 5. Mandated Section: Clean Explanation of How User Data Isolation Works */}
      <div
        id="user-data-isolation-explanation"
        className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6"
      >
        <div className="border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-1">
            <Lock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Account-Level Isolation</span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-stone-900 font-serif">
            User Data Isolation & Storage Guarantee
          </h2>
          <p className="mt-1 text-xs text-stone-500 leading-relaxed max-w-3xl">
            Gemini LifeOS guarantees strict multi-tenant boundary separation on Google Cloud Firestore
            and Firebase Authentication.
          </p>
        </div>

        {/* Primary Mandated Explanation Banner */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
          <ShieldCheck className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-emerald-950">
              Your journal data is isolated by your authenticated account.
            </h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Every journal entry, conversation transcript, summary, and weekly insight is strictly
              partitioned in subcollections scoped to your authenticated Firebase UID. Firestore
              security rules evaluate every read, write, and delete at the database engine level,
              ensuring that no user can access, query, or delete another user&apos;s data.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* Step 1: Authoritative Identity Verification */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                1
              </span>
              <span>Authoritative UID Identity</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Identity is validated cryptographically on every request via Firebase Authentication.
              The application never trusts client-supplied user identifiers; instead, the
              server-verified <code className="bg-stone-200 px-1 py-0.5 rounded text-[10px] font-mono">auth.currentUser.uid</code> is the sole authoritative anchor.
            </p>
          </div>

          {/* Step 2: Dedicated Subcollection Sandboxing */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                2
              </span>
              <span>Subcollection Sandboxing</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Every document is strictly partitioned in isolated subcollections under your personal
              path: <code className="bg-stone-200 px-1 py-0.5 rounded text-[10px] font-mono">users/&#123;uid&#125;/*</code>.
              Deletion operations can only affect documents belonging to the currently authenticated
              user&apos;s UID.
            </p>
          </div>

          {/* Step 3: Default-Deny Security Rules */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                3
              </span>
              <span>Engine-Enforced Rules</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Firestore Security Rules evaluate every single read and write with{" "}
              <code className="bg-stone-200 px-1 py-0.5 rounded text-[10px] font-mono">
                request.auth.uid == uid
              </code>
              . Cross-user data contamination or unauthorized deletions are rejected immediately at the
              database engine level.
            </p>
          </div>
        </div>

        {/* Gemini API Boundary Note */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold text-stone-900 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-emerald-600" />
              <span>Server-Side Gemini AI Integration</span>
            </span>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              All Gemini operations run server-side behind authenticated token verification.
              Prompt contexts are strictly minimized to the active session and internal security
              credentials are never exposed to the client.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenSecurityModal}
            className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors shadow-2xs"
          >
            Inspect Security Architecture
          </button>
        </div>
      </div>

      {/* 6. Mandated Actions: Delete a journal entry & Delete a conversation */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Delete a journal entry Section */}
        <div
          id="manage-delete-journal-section"
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-semibold text-stone-900">
                  Delete a Journal Entry ({journals.length})
                </h3>
              </div>
              <span className="text-[11px] text-stone-400">Scoped to your UID</span>
            </div>

            <p className="mt-2 text-xs text-stone-500">
              Permanently delete individual journal documents from{" "}
              <code className="font-mono text-[10px] bg-stone-100 px-1 py-0.5 rounded">
                users/{user?.uid?.slice(0, 6)}.../journals/&#123;id&#125;
              </code>
              . Deletion only affects your documents.
            </p>

            {journals.length === 0 ? (
              <p className="mt-4 text-xs text-stone-400 italic py-6 text-center">
                No saved journal entries found.
              </p>
            ) : (
              <div className="mt-4 max-h-64 overflow-y-auto space-y-2 pr-1">
                {journals.map((j) => (
                  <div
                    key={j.id}
                    className="flex items-center justify-between rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 text-xs hover:bg-white transition-colors"
                  >
                    <div className="truncate pr-2">
                      <p className="font-semibold text-stone-900 truncate">{j.title}</p>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(j.createdAt).toLocaleDateString()} &bull; {j.mood || "Reflection"}
                      </span>
                    </div>

                    <button
                      id={`delete-journal-button-${j.id}`}
                      onClick={() => handleDeleteJournal(j.id, j.title)}
                      disabled={deletingId === j.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0 text-xs font-medium"
                      title="Delete this journal entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete a journal entry</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 text-[10px] text-stone-400 border-t border-stone-100 pt-2">
            Ensures deletion operations can only affect documents belonging to your authenticated UID.
          </p>
        </div>

        {/* Delete a conversation Section */}
        <div
          id="manage-delete-conversation-section"
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-semibold text-stone-900">
                  Delete a Conversation ({conversations.length})
                </h3>
              </div>
              <span className="text-[11px] text-stone-400">Scoped to your UID</span>
            </div>

            <p className="mt-2 text-xs text-stone-500">
              Permanently delete individual conversation sessions from{" "}
              <code className="font-mono text-[10px] bg-stone-100 px-1 py-0.5 rounded">
                users/{user?.uid?.slice(0, 6)}.../conversations/&#123;id&#125;
              </code>
              . Deletion only affects your documents.
            </p>

            {conversations.length === 0 ? (
              <p className="mt-4 text-xs text-stone-400 italic py-6 text-center">
                No saved conversation sessions found.
              </p>
            ) : (
              <div className="mt-4 max-h-64 overflow-y-auto space-y-2 pr-1">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-stone-200/80 bg-stone-50/60 p-3 text-xs hover:bg-white transition-colors"
                  >
                    <div className="truncate pr-2">
                      <p className="font-semibold text-stone-900 truncate">{c.title}</p>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {c.messages.length} turns &bull;{" "}
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      id={`delete-conversation-button-${c.id}`}
                      onClick={() => handleDeleteConversation(c.id, c.title)}
                      disabled={deletingId === c.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0 text-xs font-medium"
                      title="Delete this conversation session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete a conversation</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 text-[10px] text-stone-400 border-t border-stone-100 pt-2">
            Ensures deletion operations can only affect documents belonging to your authenticated UID.
          </p>
        </div>
      </div>

      {/* 7. Mandated Action: Delete All My Data (With Required Confirmation) */}
      <div
        id="delete-all-my-data-section"
        className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 sm:p-8 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2 text-rose-900">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <h2 className="text-base font-semibold">Delete All My Data</h2>
        </div>

        <p className="text-xs text-rose-800 leading-relaxed max-w-2xl">
          Permanently delete your entire digital footprint from Cloud Firestore under your
          authoritative UID. This cascades across all four collections:{" "}
          <strong>journals</strong>, <strong>conversations</strong>, <strong>summaries</strong>,
          and <strong>weeklyInsights</strong>. This action is irreversible.
        </p>

        <div className="pt-2">
          <button
            id="delete-all-my-data-button"
            onClick={() => setShowPurgeModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-rose-700 transition-colors shadow-2xs"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete All My Data</span>
          </button>
        </div>
      </div>

      {/* PURGE CONFIRMATION MODAL */}
      {showPurgeModal && (
        <div
          id="purge-confirmation-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  Confirm Data Deletion
                </h3>
                <p className="text-[11px] text-stone-500">Irreversible operation</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              You are about to irreversibly purge all documents stored in Cloud Firestore under your
              authenticated path:
              <span className="block mt-1 font-mono text-[11px] bg-stone-100 p-2 rounded-lg font-bold text-rose-700">
                users/{user?.uid}/*
              </span>
            </p>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-stone-800 block">
                Type <span className="font-mono text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">DELETE ALL</span> to confirm:
              </label>
              <input
                id="purge-confirmation-input"
                type="text"
                value={purgeInputText}
                onChange={(e) => setPurgeInputText(e.target.value)}
                placeholder="DELETE ALL"
                className="w-full rounded-xl border border-stone-300 p-2.5 font-mono text-xs focus:border-rose-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setShowPurgeModal(false);
                  setPurgeInputText("");
                }}
                className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>

              <button
                id="confirm-purge-execute-button"
                type="button"
                onClick={handleDeleteAllMyData}
                disabled={purgeInputText.trim() !== "DELETE ALL" || isPurging}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40 transition-colors shadow-2xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isPurging ? "Erasing Records..." : "Permanently Delete Everything"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
