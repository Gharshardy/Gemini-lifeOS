import React, { useState, useMemo } from "react";
import {
  MessageSquarePlus,
  Search,
  BookOpen,
  MessageSquare,
  Smile,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
  Trash2,
  BrainCircuit,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { JournalEntry, ConversationSession, ActiveTab } from "../types";

interface DashboardViewProps {
  journals: JournalEntry[];
  conversations: ConversationSession[];
  onStartNewConversation: () => void;
  onSelectJournal: (entry: JournalEntry) => void;
  onDeleteJournal: (journalId: string) => Promise<void>;
  setActiveTab: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  journals,
  conversations,
  onStartNewConversation,
  onSelectJournal,
  onDeleteJournal,
  setActiveTab,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>("all");

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Compute dominant mood
  const dominantMood = useMemo(() => {
    if (journals.length === 0) return "Awaiting First Entry";
    const counts: Record<string, number> = {};
    for (const j of journals) {
      if (j.mood) {
        counts[j.mood] = (counts[j.mood] || 0) + 1;
      }
    }
    let top = "Balanced";
    let max = 0;
    for (const [mood, c] of Object.entries(counts)) {
      if (c > max) {
        max = c;
        top = mood;
      }
    }
    return top;
  }, [journals]);

  // Extract all unique moods for filtering
  const allMoods = useMemo(() => {
    const set = new Set<string>();
    journals.forEach((j) => {
      if (j.mood) set.add(j.mood);
    });
    return Array.from(set);
  }, [journals]);

  // Filter journals based on search query and mood filter
  const filteredJournals = useMemo(() => {
    return journals.filter((j) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.summary.toLowerCase().includes(q) ||
        (j.topics && j.topics.some((t) => t.toLowerCase().includes(q))) ||
        (j.userNotes && j.userNotes.toLowerCase().includes(q));

      const matchesMood =
        selectedMoodFilter === "all" ||
        (j.mood && j.mood.toLowerCase() === selectedMoodFilter.toLowerCase());

      return matchesSearch && matchesMood;
    });
  }, [journals, searchQuery, selectedMoodFilter]);

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome & Primary Action Banner */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 font-serif">
              {greeting}, {user?.displayName?.split(" ")[0] || "Friend"}
            </h1>
            <p className="text-sm text-stone-600 max-w-xl">
              Your personal intelligence sanctuary is online. Take a breath and unpack what's
              on your mind today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onStartNewConversation}
              className="flex items-center gap-2 rounded-xl bg-stone-900 px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-stone-800 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageSquarePlus className="h-4 w-4 text-emerald-400" />
              <span>Start AI Reflection</span>
            </button>
            <button
              onClick={() => setActiveTab("memory")}
              className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-stone-800 hover:bg-stone-50 transition-colors shadow-2xs"
            >
              <BrainCircuit className="h-4 w-4 text-emerald-600" />
              <span>Ask AI Memory</span>
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Weekly Life Intelligence</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Journal Entries</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900 font-serif">
            {journals.length}
          </p>
          <span className="text-[11px] text-stone-400">Stored in Cloud Firestore</span>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Conversations</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900 font-serif">
            {conversations.length}
          </p>
          <span className="text-[11px] text-stone-400">Multi-turn sessions</span>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Dominant Tone</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Smile className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-stone-900 font-serif truncate">
            {dominantMood}
          </p>
          <span className="text-[11px] text-stone-400">Emotional distribution</span>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Data Isolation</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xs font-mono font-bold text-emerald-800 truncate">
            {user ? `users/${user.uid.slice(0, 10)}...` : "Isolated"}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">100% Cryptographic Lock</span>
        </div>
      </div>

      {/* Weekly Insights & Memory Teaser Banner */}
      {journals.length >= 1 && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>Weekly Life Intelligence & Memory Available</span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-800">
              You have {journals.length} saved {journals.length === 1 ? "entry" : "entries"}. Ask your past self questions or synthesize your weekly goals and themes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab("memory")}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 transition-colors shadow-2xs"
            >
              <BrainCircuit className="h-3.5 w-3.5 text-emerald-600" />
              <span>Ask Past Self</span>
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-900 transition-colors shadow-2xs"
            >
              <span>Weekly Intelligence</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, topics, thoughts, or reflections..."
              className="w-full rounded-xl border border-stone-300 bg-white pl-10 pr-4 py-2 text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:border-stone-900 focus:outline-none transition-colors shadow-2xs"
            />
          </div>

          {/* Mood filter dropdown if moods exist */}
          {allMoods.length > 0 && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Filter className="h-3.5 w-3.5 text-stone-400" />
              <select
                value={selectedMoodFilter}
                onChange={(e) => setSelectedMoodFilter(e.target.value)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-700 focus:border-stone-900 focus:outline-none shadow-2xs"
              >
                <option value="all">All Moods ({journals.length})</option>
                {allMoods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-stone-900 font-serif">
            {searchQuery || selectedMoodFilter !== "all"
              ? `Filtered Entries (${filteredJournals.length})`
              : "Recent Journal Entries"}
          </h2>
          <span className="text-xs text-stone-500">
            {filteredJournals.length} of {journals.length} {journals.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {/* Entries Grid */}
        {filteredJournals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
              <BookOpen className="h-6 w-6" />
            </div>
            {journals.length === 0 ? (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-stone-900">
                  No journal entries recorded yet
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Begin by starting an interactive conversation with Gemini. When finished,
                  save it to generate an executive summary and tags.
                </p>
                <div className="pt-2">
                  <button
                    onClick={onStartNewConversation}
                    className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
                  >
                    Start Your First Reflection
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-stone-900">
                  No matching entries found
                </h3>
                <p className="text-xs text-stone-500">
                  Try adjusting your search keywords or mood filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedMoodFilter("all");
                  }}
                  className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Clear search filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredJournals.map((entry) => (
              <div
                key={entry.id}
                onClick={() => onSelectJournal(entry)}
                className="group flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-5 shadow-2xs hover:shadow-md hover:border-stone-300 transition-all cursor-pointer relative"
              >
                <div className="space-y-3">
                  {/* Date & Mood header */}
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-mono text-[11px]">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {entry.mood && (
                      <span className="rounded-full bg-amber-50 border border-amber-200/70 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        {entry.mood}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors line-clamp-1 font-serif">
                    {entry.title}
                  </h3>

                  {/* Summary snippet */}
                  <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                    {entry.summary}
                  </p>

                  {/* Topics Pills */}
                  {entry.topics && entry.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {entry.topics.slice(0, 3).map((t, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600"
                        >
                          #{t}
                        </span>
                      ))}
                      {entry.topics.length > 3 && (
                        <span className="text-[10px] text-stone-400 self-center">
                          +{entry.topics.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px] text-stone-400">
                  <span>
                    {entry.conversation ? `${entry.conversation.length} dialogue turns` : "Saved journal"}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete journal "${entry.title}"?`)) {
                          onDeleteJournal(entry.id);
                        }
                      }}
                      className="rounded p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete journal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-emerald-700 font-semibold group-hover:underline">
                      View details &rarr;
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
