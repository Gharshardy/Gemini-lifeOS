import React, { useState } from "react";
import {
  MessageSquare,
  Calendar,
  Trash2,
  ArrowRight,
  BookmarkCheck,
  Clock,
} from "lucide-react";
import { ConversationSession } from "../types";

interface ConversationHistoryViewProps {
  conversations: ConversationSession[];
  onResumeConversation: (session: ConversationSession) => void;
  onDeleteConversation: (id: string) => Promise<void>;
}

export const ConversationHistoryView: React.FC<ConversationHistoryViewProps> = ({
  conversations,
  onResumeConversation,
  onDeleteConversation,
}) => {
  const [filter, setFilter] = useState<"all" | "active" | "saved">("all");

  const filtered = conversations.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 font-serif">
            Conversation History
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Review past dialogue sessions with Gemini, inspect raw transcripts, or resume.
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 rounded-xl bg-stone-100 p-1 border border-stone-200">
          {(["all", "active", "saved"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filter === tab
                  ? "bg-white text-stone-900 font-semibold shadow-2xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-stone-900">
            No dialogue sessions found
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Start a new reflection in the AI Journal tab to begin chatting with Gemini LifeOS.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((session) => (
            <div
              key={session.id}
              className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(session.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      session.status === "saved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {session.status === "saved" ? "Saved to Journal" : "Active Draft"}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-stone-900 line-clamp-2 font-serif">
                  {session.title || "Reflective Dialogue Session"}
                </h3>

                <p className="text-xs text-stone-600 line-clamp-2">
                  {session.messages[session.messages.length - 1]?.content || "No messages recorded."}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                <span className="flex items-center gap-1 text-[11px] text-stone-400">
                  <Clock className="h-3 w-3" />
                  {session.messages.length} messages
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this conversation session permanently?")) {
                        onDeleteConversation(session.id);
                      }
                    }}
                    className="rounded p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => onResumeConversation(session)}
                    className="flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    <span>Resume</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
