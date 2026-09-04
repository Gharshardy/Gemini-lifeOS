import React, { useState } from "react";
import {
  BrainCircuit,
  Search,
  Sparkles,
  BookOpen,
  Calendar,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { JournalEntry, AIMemoryResult } from "../types";
import { authFetch } from "../lib/api";

interface AIMemoryViewProps {
  journals: JournalEntry[];
  onSelectJournal: (entry: JournalEntry) => void;
}

const SAMPLE_MEMORY_QUERIES = [
  "What did I write about my project last week?",
  "What goals have I set recently and are any still pending?",
  "When did I feel most energized or fulfilled, and what was I doing?",
  "What recurring tensions or challenges have I documented?",
  "What major decisions did I make about my work or personal life?",
];

export const AIMemoryView: React.FC<AIMemoryViewProps> = ({
  journals,
  onSelectJournal,
}) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AIMemoryResult | null>(null);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAskMemory = async (textToAsk?: string) => {
    const questionText = textToAsk || query.trim();
    if (!questionText || isLoading) return;

    if (journals.length === 0) {
      setError("You don't have any saved journal entries yet. Save reflections in the AI Journal to build your personal memory bank.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchedQuery(questionText);

    try {
      const res = await authFetch("/api/gemini/memory", {
        method: "POST",
        body: JSON.stringify({
          question: questionText,
          userJournals: journals,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to search personal memory.");
      }

      setResult({
        answer: data.answer,
        citedJournals: data.citedJournals || [],
      });
    } catch (err: unknown) {
      console.warn("AI Memory query notice:", err);
      setError(err instanceof Error ? err.message : "Unable to retrieve memory.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-1">
          <BrainCircuit className="h-4 w-4 text-emerald-600" />
          <span>Zero-Knowledge Grounded Memory</span>
        </div>
        <h1 className="text-2xl font-semibold text-stone-900 font-serif">
          Personal AI Memory
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Ask natural-language questions about your past journal entries, decisions, and emotions.
          Gemini queries strictly your private Firestore archive.
        </p>
      </div>

      {/* Memory Query Bar */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
            Ask Your Past Self
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAskMemory();
                  }
                }}
                placeholder='e.g., "What did I write about my project last week?"'
                className="w-full rounded-xl border border-stone-300 bg-stone-50/60 pl-10 pr-4 py-3 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={() => handleAskMemory()}
              disabled={!query.trim() || isLoading}
              className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Sparkles className={`h-4 w-4 text-emerald-400 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Recalling..." : "Recall Memory"}</span>
            </button>
          </div>
        </div>

        {/* Suggested Query Chips */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500">
            <HelpCircle className="h-3.5 w-3.5 text-stone-400" />
            <span>Try asking:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_MEMORY_QUERIES.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(q);
                  handleAskMemory(q);
                }}
                className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] text-stone-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-900 transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Memory Query Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Memory Results */}
      {result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Recalled Memory Response
                  </h3>
                  <p className="text-xs font-medium text-stone-900 italic">
                    "{searchedQuery}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Grounded in your journals</span>
              </div>
            </div>

            {/* Synthesized Answer */}
            <div className="text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-line space-y-2">
              <p>{result.answer}</p>
            </div>
          </div>

          {/* Cited Journal Entries */}
          {result.citedJournals && result.citedJournals.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-stone-600" />
                <span>Referenced Journal Entries ({result.citedJournals.length})</span>
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {result.citedJournals.map((citation, idx) => {
                  const matchingJournal = journals.find((j) => j.id === citation.id);
                  return (
                    <div
                      key={idx}
                      onClick={() => matchingJournal && onSelectJournal(matchingJournal)}
                      className="group flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="h-3 w-3" />
                            {citation.date}
                          </span>
                          <span className="text-emerald-700 font-medium group-hover:underline">
                            Open entry &rarr;
                          </span>
                        </div>

                        <h4 className="font-semibold text-stone-900 text-xs sm:text-sm font-serif group-hover:text-emerald-900">
                          {citation.title}
                        </h4>

                        <p className="text-[11px] text-stone-600 italic border-l-2 border-stone-200 pl-2 mt-1">
                          "{citation.quoteExcerpt}"
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State when no query made yet */}
      {!result && !isLoading && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
            <Clock className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-stone-900">
            Personal Memory is Ready
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            Your journal archive currently holds <strong>{journals.length}</strong> entries.
            Ask any question to cross-reference previous goals, insights, challenges, and milestones.
          </p>
        </div>
      )}
    </div>
  );
};
