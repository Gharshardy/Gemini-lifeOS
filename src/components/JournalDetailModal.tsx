import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Tag,
  Smile,
  FileText,
  MessageSquare,
  Trash2,
  Download,
  Save,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
} from "lucide-react";
import { JournalEntry } from "../types";

interface JournalDetailModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
  onUpdateNotes?: (journalId: string, notes: string) => Promise<void>;
  onUpdateJournal?: (journalId: string, updates: { title: string; userNotes: string }) => Promise<void>;
  onDelete: (journalId: string) => Promise<void>;
}

export const JournalDetailModal: React.FC<JournalDetailModalProps> = ({
  entry,
  onClose,
  onUpdateNotes,
  onUpdateJournal,
  onDelete,
}) => {
  if (!entry) return null;

  const [title, setTitle] = useState(entry.title || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [notes, setNotes] = useState(entry.userNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setTitle(entry.title || "");
    setNotes(entry.userNotes || "");
    setIsEditingTitle(false);
  }, [entry]);

  const handleSaveChanges = async () => {
    if (!title.trim()) {
      alert("Journal title cannot be empty.");
      return;
    }
    setIsSaving(true);
    try {
      if (onUpdateJournal) {
        await onUpdateJournal(entry.id, { title: title.trim(), userNotes: notes.trim() });
      } else if (onUpdateNotes) {
        await onUpdateNotes(entry.id, notes.trim());
      }
      setIsEditingTitle(false);
      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 2500);
    } catch (error) {
      console.error("Failed to update journal:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${entry.title}"? This action cannot be undone.`)) {
      setIsDeleting(true);
      try {
        await onDelete(entry.id);
        onClose();
      } catch (error) {
        console.error("Failed to delete journal:", error);
        setIsDeleting(false);
      }
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entry, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `journal_${entry.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formattedDate = new Date(entry.createdAt).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 my-8 max-h-[90vh] flex flex-col">
        {/* Header with Editable Title */}
        <div className="flex items-start justify-between border-b border-stone-200 pb-4">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-1.5">
              <Calendar className="h-3.5 w-3.5 text-stone-400" />
              <span>{formattedDate}</span>
              <span>&bull;</span>
              <span className="font-mono text-[11px] text-stone-400">ID: {entry.id.slice(0, 8)}</span>
            </div>

            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-1.5 text-lg sm:text-xl font-semibold text-stone-900 font-serif focus:border-stone-900 focus:outline-none"
                  placeholder="Enter journal title..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(false)}
                  className="rounded-lg bg-stone-100 p-2 text-stone-700 hover:bg-stone-200 transition-colors"
                  title="Done editing title"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-xl sm:text-2xl font-semibold text-stone-900 font-serif leading-tight">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-60 group-hover:opacity-100 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-all"
                  title="Edit journal title"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Metadata badges: Mood & Topics */}
          <div className="flex flex-wrap items-center gap-2">
            {entry.mood && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-xs font-medium text-amber-900">
                <Smile className="h-3.5 w-3.5 text-amber-600" />
                <span>Mood: {entry.mood}</span>
              </span>
            )}

            {entry.topics && entry.topics.map((t, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700"
              >
                <Tag className="h-3 w-3 text-stone-400" />
                <span>{t}</span>
              </span>
            ))}
          </div>

          {/* AI Executive Summary */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-900">
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>Executive Synthesis</span>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
              {entry.summary}
            </p>
          </div>

          {/* Key Points */}
          {entry.keyPoints && entry.keyPoints.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Key Points & Realizations
              </h4>
              <ul className="space-y-1.5 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                {entry.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-stone-700">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Goals and Action Items */}
          {((entry.goals && entry.goals.length > 0) || (entry.actionItems && entry.actionItems.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {entry.goals && entry.goals.length > 0 && (
                <div className="space-y-1.5 rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>Goals Identified</span>
                  </h4>
                  <ul className="space-y-1">
                    {entry.goals.map((g, idx) => (
                      <li key={idx} className="text-xs text-stone-700 flex items-start gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.actionItems && entry.actionItems.length > 0 && (
                <div className="space-y-1.5 rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                    <span>✅</span>
                    <span>Action Items & Commitments</span>
                  </h4>
                  <ul className="space-y-1">
                    {entry.actionItems.map((a, idx) => (
                      <li key={idx} className="text-xs text-stone-700 flex items-start gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Personal User Notes & Annotations (Editable) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Personal Reflections & Follow-up Notes
              </label>
              {showSavedNotification && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Notes updated in Firestore
                </span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your own handwritten notes, commitments, or post-reflection thoughts..."
              rows={4}
              className="w-full rounded-xl border border-stone-300 p-3 text-xs sm:text-sm text-stone-800 focus:border-stone-900 focus:outline-none transition-colors"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? "Saving..." : "Save Title & Reflections"}</span>
              </button>
            </div>
          </div>

          {/* Verbatim Conversation Transcript Accordion */}
          {entry.conversation && entry.conversation.length > 0 && (
            <div className="border-t border-stone-200 pt-4">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex w-full items-center justify-between rounded-xl bg-stone-100 p-3 text-left text-xs font-semibold text-stone-800 hover:bg-stone-200/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-stone-500" />
                  <span>
                    Original Conversation Dialogue ({entry.conversation.length} messages)
                  </span>
                </div>
                {showTranscript ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showTranscript && (
                <div className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4 max-h-72 overflow-y-auto text-xs">
                  {entry.conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-white border border-stone-200 text-stone-800 ml-4"
                          : "bg-emerald-50/60 border border-emerald-100 text-emerald-950 mr-4"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
                        <span className="font-semibold text-stone-700">
                          {msg.role === "user" ? "You" : "Gemini LifeOS"}
                        </span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-stone-200 pt-4 text-xs">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Entry (JSON)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? "Deleting..." : "Delete Entry"}</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-stone-200 px-4 py-1.5 font-semibold text-stone-800 hover:bg-stone-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
