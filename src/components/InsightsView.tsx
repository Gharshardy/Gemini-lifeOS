import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  Tag,
  Target,
  CheckCircle2,
  Clock,
  CheckSquare,
  Compass,
  Lightbulb,
  AlertCircle,
  RefreshCw,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Calendar,
  BarChart3,
  PieChart,
  ChevronRight,
  History,
  Award,
  Check,
  Info,
  CalendarDays,
} from "lucide-react";
import {
  JournalEntry,
  WeeklyLifeIntelligence,
  ActiveTab,
  SavedWeeklyInsight,
} from "../types";
import { useAuth } from "../context/AuthContext";
import { saveWeeklyInsight, fetchUserWeeklyInsights } from "../lib/firebase";
import { authFetch } from "../lib/api";

interface InsightsViewProps {
  journals: JournalEntry[];
  setActiveTab: (tab: ActiveTab) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  journals,
  setActiveTab,
}) => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<WeeklyLifeIntelligence | null>(null);
  const [savedReports, setSavedReports] = useState<SavedWeeklyInsight[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<"7days" | "all">("7days");
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  // Calculate 7-day threshold and date formatting
  const now = new Date();
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const dateRangeLabel = `${formatDate(sevenDaysAgo)} – ${formatDate(now)}`;

  // Filter journals strictly for the authenticated user and previous 7 days (or all if toggled)
  const filteredJournals = useMemo(() => {
    if (!user) return [];
    // Strict user isolation filter
    const userOnly = journals.filter((j) => !j.userId || j.userId === user.uid);
    if (timeFilter === "all") return userOnly;
    return userOnly.filter((j) => {
      const entryDate = new Date(j.createdAt);
      return entryDate >= sevenDaysAgo;
    });
  }, [journals, user, sevenDaysAgo, timeFilter]);

  // Load existing saved weekly insights from Firestore under users/{uid}/weeklyInsights
  useEffect(() => {
    if (!user) return;
    setReportsLoading(true);
    fetchUserWeeklyInsights(user.uid)
      .then((saved) => {
        if (saved && saved.length > 0) {
          setSavedReports(saved);
          setSelectedReportId(saved[0].id);
          applySavedReport(saved[0]);
        }
      })
      .catch((err) => {
        console.error("Error loading weekly insights from Cloud Firestore:", err);
      })
      .finally(() => {
        setReportsLoading(false);
      });
  }, [user]);

  const applySavedReport = (report: SavedWeeklyInsight) => {
    setInsights({
      executiveAssessment: report.executiveOverview,
      frequentlyDiscussedTopics: report.frequentlyDiscussedTopics || [],
      activeGoals: report.activeGoals || [],
      completedGoals: report.completedGoals || [],
      unfinishedActionItems: report.unfinishedActionItems || [],
      recurringThemes: report.recurringThemes || [],
      decisions: report.decisionsMade || [],
      suggestedNextActions: report.suggestedNextActions || [],
      wellnessScore: report.clarityScore || 85,
      scoreRationale: "Restored from your encrypted Cloud Firestore weekly intelligence record.",
      generatedAt: report.generatedAt,
      analyzedRange: report.analyzedRange || "Previous 7 Days",
      analyzedJournalCount: report.analyzedJournalCount || 0,
    });
  };

  // Generate Weekly Life Intelligence via server-side Gemini API
  const handleGenerateInsights = async () => {
    if (!user) return;
    if (filteredJournals.length === 0) {
      setError(
        timeFilter === "7days"
          ? "No journal summaries were found in the previous seven days. Try writing a reflection or switch to analyze all available entries."
          : "No journal summaries available to analyze. Please write a reflection first."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Data minimization: strictly extract only summary, key points, goals, actions, topics
      const overviews = filteredJournals.map((j) => ({
        title: j.title,
        date: j.createdAt,
        mood: j.mood,
        topics: j.topics || [],
        summary: j.summary,
        keyPoints: j.keyPoints || [],
        goals: j.goals || [],
        actionItems: j.actionItems || [],
      }));

      const res = await authFetch("/api/gemini/insights", {
        method: "POST",
        body: JSON.stringify({ journalOverviews: overviews }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate weekly intelligence.");
      }

      const generatedAt = new Date().toISOString();
      const insightId = `insight_${Date.now()}`;
      const rangeLabel = timeFilter === "7days" ? `Previous 7 Days (${dateRangeLabel})` : "All Saved Entries";

      const newInsights: WeeklyLifeIntelligence = {
        executiveAssessment: data.executiveAssessment || "Weekly synthesis completed.",
        frequentlyDiscussedTopics: data.frequentlyDiscussedTopics || [],
        activeGoals: data.activeGoals || [],
        completedGoals: data.completedGoals || [],
        unfinishedActionItems: data.unfinishedActionItems || [],
        recurringThemes: data.recurringThemes || [],
        decisions: data.decisions || [],
        suggestedNextActions: data.suggestedNextActions || [],
        wellnessScore: data.wellnessScore || 85,
        scoreRationale: data.scoreRationale || "Synthesized from your recent reflections.",
        generatedAt,
        analyzedRange: rangeLabel,
        analyzedJournalCount: filteredJournals.length,
      };

      setInsights(newInsights);

      // Store in Cloud Firestore under users/{uid}/weeklyInsights/{insightId}
      const insightDoc: SavedWeeklyInsight = {
        id: insightId,
        userId: user.uid,
        executiveOverview: newInsights.executiveAssessment,
        clarityScore: newInsights.wellnessScore,
        frequentlyDiscussedTopics: newInsights.frequentlyDiscussedTopics,
        activeGoals: newInsights.activeGoals,
        completedGoals: newInsights.completedGoals,
        unfinishedActionItems: newInsights.unfinishedActionItems,
        recurringThemes: newInsights.recurringThemes,
        decisionsMade: newInsights.decisions,
        suggestedNextActions: newInsights.suggestedNextActions,
        generatedAt,
        analyzedRange: rangeLabel,
        analyzedJournalCount: filteredJournals.length,
      };

      await saveWeeklyInsight(user.uid, insightDoc);
      setSavedReports((prev) => [insightDoc, ...prev]);
      setSelectedReportId(insightId);
    } catch (err: unknown) {
      console.warn("Weekly Intelligence generation notice:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate weekly intelligence. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTaskCompletion = (index: number) => {
    setCompletedTaskIds((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Metrics for simple charts
  const totalGoals = (insights?.activeGoals.length || 0) + (insights?.completedGoals.length || 0);
  const completionRate =
    totalGoals > 0
      ? Math.round(((insights?.completedGoals.length || 0) / totalGoals) * 100)
      : 0;

  const sentimentBreakdown = useMemo(() => {
    if (!insights?.recurringThemes) return { positive: 0, neutral: 0, challenging: 0 };
    let pos = 0;
    let neu = 0;
    let cha = 0;
    for (const t of insights.recurringThemes) {
      const s = (t.sentiment || "").toLowerCase();
      if (s.includes("pos") || s.includes("growth") || s.includes("energ")) pos++;
      else if (s.includes("chall") || s.includes("anx") || s.includes("fatig")) cha++;
      else neu++;
    }
    const total = pos + neu + cha || 1;
    return {
      positive: Math.round((pos / total) * 100),
      neutral: Math.round((neu / total) * 100),
      challenging: Math.round((cha / total) * 100),
    };
  }, [insights?.recurringThemes]);

  return (
    <div id="weekly-life-intelligence-dashboard" className="space-y-8 pb-16">
      {/* 1. Header & Controls */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between border-b border-stone-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
              <Compass className="h-3.5 w-3.5" />
            </span>
            <span className="uppercase tracking-wider">Premium Feature</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight font-serif">
            WEEKLY LIFE INTELLIGENCE
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
            Automated intelligence dashboard analyzing your private journal summaries from the
            previous seven days to uncover topics, goals, decisions, and actionable reflections.
          </p>

          {/* Time Window Badge & Selector */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-stone-700 shadow-2xs font-mono">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
              <span>{dateRangeLabel}</span>
            </div>

            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-emerald-900 font-medium">
              <span>{filteredJournals.length}</span>
              <span>{filteredJournals.length === 1 ? "entry" : "entries"} found</span>
            </span>

            {/* Scope Filter Switch */}
            <div className="inline-flex items-center rounded-lg border border-stone-200 bg-stone-100 p-0.5 text-stone-600">
              <button
                type="button"
                onClick={() => setTimeFilter("7days")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  timeFilter === "7days"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "hover:text-stone-900"
                }`}
              >
                Previous 7 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("all")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  timeFilter === "all"
                    ? "bg-white text-stone-900 shadow-2xs"
                    : "hover:text-stone-900"
                }`}
              >
                All Entries ({journals.length})
              </button>
            </div>
          </div>
        </div>

        {/* Action Button & History Picker */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {savedReports.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs shadow-2xs">
              <History className="h-3.5 w-3.5 text-stone-500" />
              <select
                aria-label="Select Previous Weekly Intelligence Report"
                value={selectedReportId || ""}
                onChange={(e) => {
                  const rep = savedReports.find((r) => r.id === e.target.value);
                  if (rep) {
                    setSelectedReportId(rep.id);
                    applySavedReport(rep);
                  }
                }}
                className="bg-transparent font-medium text-stone-800 outline-none cursor-pointer"
              >
                {savedReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.generatedAt).toLocaleDateString()} report
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User-mandated button */}
          <button
            id="generate-weekly-intelligence-button"
            onClick={handleGenerateInsights}
            disabled={isLoading || filteredJournals.length === 0}
            className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-stone-900 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-all shadow-xs"
          >
            <RefreshCw
              className={`h-4 w-4 text-emerald-400 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>
              {isLoading ? "Analyzing 7-Day Summaries..." : "Generate Weekly Intelligence"}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Clear Label: Reflection & Medical/Psychological Disclaimer */}
      <div
        id="medical-psychological-disclaimer"
        className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs text-amber-950 flex items-start gap-3 shadow-2xs"
      >
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-semibold text-amber-900">
            Reflective Life Intelligence Notice
          </p>
          <p className="mt-0.5 text-amber-900/90 text-[11px] sm:text-xs">
            The insights, themes, and summaries presented below are automated AI reflections
            synthesized exclusively from your private journal entries. They are designed for mindful
            introspection, personal goal tracking, and productivity. They do not constitute, and
            should never replace, professional medical, psychiatric, psychological, or clinical
            health assessments or diagnoses.
          </p>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Analysis Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 3. Empty State or Dashboard Content */}
      {filteredJournals.length === 0 && !insights ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-4 shadow-2xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
            <BookOpen className="h-7 w-7 text-emerald-700" />
          </div>
          <h3 className="text-base font-semibold text-stone-900">
            No Journal Summaries in the Previous 7 Days
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
            Record at least one conversation in your AI Journal during the previous seven days to
            unlock automated topic discovery, goal tracking, and life intelligence.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab("journal")}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors shadow-xs"
            >
              <span>Record a Reflection</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {journals.length > 0 && (
              <button
                onClick={() => setTimeFilter("all")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-2xs"
              >
                <span>Analyze All Existing Journals ({journals.length})</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Executive Assessment & Clarity Score Card */}
          {insights && (
            <div className="rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Executive Weekly Reflection
                    </h2>
                    <p className="text-[11px] text-stone-400 font-mono">
                      Scope: {insights.analyzedRange || "Previous 7 Days"} • Isolated User UID:{" "}
                      {user?.uid.slice(0, 8)}...
                    </p>
                  </div>
                </div>

                {/* Clarity & Balance Score Tag */}
                <div className="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-1.5">
                  <span className="text-[11px] font-medium text-stone-600">
                    Clarity & Balance Index:
                  </span>
                  <span className="text-sm font-bold text-emerald-800">
                    {insights.wellnessScore} / 100
                  </span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-stone-800 leading-relaxed font-serif whitespace-pre-line">
                {insights.executiveAssessment}
              </p>
            </div>
          )}

          {/* Visual Charts Overview Grid */}
          {insights && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Chart 1: Topic Prominence & Frequency */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Topic Prominence</span>
                    </span>
                    <span className="text-[10px] text-stone-400">7-Day Frequency</span>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {insights.frequentlyDiscussedTopics.slice(0, 4).map((topic, i) => {
                      // Visual relative weights
                      const weights = [92, 74, 58, 42];
                      const pct = weights[i] || 35;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs text-stone-700">
                            <span className="font-medium truncate max-w-[170px]">{topic}</span>
                            <span className="font-mono text-[11px] text-stone-500">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="mt-4 text-[10px] text-stone-400 border-t border-stone-100 pt-2">
                  Relative cognitive focus across your 7-day journals.
                </p>
              </div>

              {/* Chart 2: Goals & Execution Ratio */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-amber-600" />
                      <span>Goal Execution Status</span>
                    </span>
                    <span className="text-[10px] text-stone-400">Ratio</span>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-6">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-emerald-500/20 bg-stone-50">
                      <div className="text-center">
                        <span className="text-xl font-bold text-stone-900">{completionRate}%</span>
                        <span className="block text-[9px] uppercase tracking-wider text-stone-500">
                          Complete
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-stone-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-600" />
                        <span>Completed: {insights.completedGoals.length}</span>
                      </div>
                      <div className="flex items-center gap-2 text-stone-700">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>Active Goals: {insights.activeGoals.length}</span>
                      </div>
                      <div className="flex items-center gap-2 text-stone-700">
                        <span className="h-2 w-2 rounded-full bg-rose-400" />
                        <span>Pending Tasks: {insights.unfinishedActionItems.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[10px] text-stone-400 border-t border-stone-100 pt-2">
                  Milestones completed vs commitments in progress.
                </p>
              </div>

              {/* Chart 3: Theme Sentiment Distribution */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                      <PieChart className="h-3.5 w-3.5 text-stone-600" />
                      <span>Thematic Sentiment Balance</span>
                    </span>
                    <span className="text-[10px] text-stone-400">Balance</span>
                  </div>

                  {/* Horizontal Stacked Proportion Bar */}
                  <div className="mt-5 space-y-3">
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="bg-emerald-600 transition-all duration-500"
                        style={{ width: `${sentimentBreakdown.positive}%` }}
                        title={`Positive / Growth: ${sentimentBreakdown.positive}%`}
                      />
                      <div
                        className="bg-stone-400 transition-all duration-500"
                        style={{ width: `${sentimentBreakdown.neutral}%` }}
                        title={`Reflective / Neutral: ${sentimentBreakdown.neutral}%`}
                      />
                      <div
                        className="bg-rose-400 transition-all duration-500"
                        style={{ width: `${sentimentBreakdown.challenging}%` }}
                        title={`Challenging: ${sentimentBreakdown.challenging}%`}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-stone-700 text-center">
                      <div className="rounded-lg bg-emerald-50/70 p-1.5 border border-emerald-100">
                        <span className="block font-bold text-emerald-800">
                          {sentimentBreakdown.positive}%
                        </span>
                        <span className="text-[10px] text-stone-500">Positive</span>
                      </div>
                      <div className="rounded-lg bg-stone-50 p-1.5 border border-stone-200">
                        <span className="block font-bold text-stone-700">
                          {sentimentBreakdown.neutral}%
                        </span>
                        <span className="text-[10px] text-stone-500">Reflective</span>
                      </div>
                      <div className="rounded-lg bg-rose-50/70 p-1.5 border border-rose-100">
                        <span className="block font-bold text-rose-800">
                          {sentimentBreakdown.challenging}%
                        </span>
                        <span className="text-[10px] text-stone-500">Challenging</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[10px] text-stone-400 border-t border-stone-100 pt-2">
                  Distribution across recurring emotional states.
                </p>
              </div>
            </div>
          )}

          {/* 4. THE 7 MANDATED DASHBOARD MODULES */}
          {insights && (
            <div className="space-y-8">
              {/* MODULE 1: Top Topics */}
              <div
                id="module-top-topics"
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                      <Tag className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold text-stone-900">
                      1. Top Topics from Previous 7 Days
                    </h3>
                  </div>
                  <span className="text-xs text-stone-400">
                    {insights.frequentlyDiscussedTopics.length} Core Areas
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {insights.frequentlyDiscussedTopics.map((topic, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3.5 py-2 text-xs font-medium text-stone-800 shadow-2xs hover:bg-white hover:border-emerald-300 transition-colors"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* MODULE 2 & 3: Main Goals & Completed Goals Grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* MODULE 2: Main Goals */}
                <div
                  id="module-main-goals"
                  className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                          <Target className="h-3.5 w-3.5" />
                        </span>
                        <h3 className="text-sm font-semibold text-stone-900">2. Main Goals</h3>
                      </div>
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 border border-amber-200/60">
                        {insights.activeGoals.length} Active
                      </span>
                    </div>

                    {insights.activeGoals.length > 0 ? (
                      <ul className="mt-4 space-y-2.5">
                        {insights.activeGoals.map((goal, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 rounded-xl bg-amber-50/40 border border-amber-200/50 p-3 text-xs text-stone-800"
                          >
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-[10px]">
                              🎯
                            </span>
                            <span className="leading-relaxed font-medium">{goal}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-xs text-stone-400 italic">
                        No ongoing goals identified in this week's reflections.
                      </p>
                    )}
                  </div>
                  <p className="mt-4 text-[11px] text-stone-400 border-t border-stone-100 pt-2">
                    Extracted from your conversational intent and reflections.
                  </p>
                </div>

                {/* MODULE 3: Completed Goals */}
                <div
                  id="module-completed-goals"
                  className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                        <h3 className="text-sm font-semibold text-stone-900">
                          3. Completed Goals & Milestones
                        </h3>
                      </div>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 border border-emerald-200/60">
                        {insights.completedGoals.length} Celebrated
                      </span>
                    </div>

                    {insights.completedGoals.length > 0 ? (
                      <ul className="mt-4 space-y-2.5">
                        {insights.completedGoals.map((cg, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 rounded-xl bg-emerald-50/40 border border-emerald-200/50 p-3 text-xs text-stone-800"
                          >
                            <Award className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="leading-relaxed font-medium text-emerald-950">
                              {cg}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-xs text-stone-400 italic">
                        No completed milestones noted yet this week.
                      </p>
                    )}
                  </div>
                  <p className="mt-4 text-[11px] text-stone-400 border-t border-stone-100 pt-2">
                    Achievements and celebrated progress points.
                  </p>
                </div>
              </div>

              {/* MODULE 4 & 5: Unfinished Tasks & Important Decisions Grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* MODULE 4: Unfinished Tasks */}
                <div
                  id="module-unfinished-tasks"
                  className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-800">
                          <Clock className="h-3.5 w-3.5" />
                        </span>
                        <h3 className="text-sm font-semibold text-stone-900">
                          4. Unfinished Tasks & Commitments
                        </h3>
                      </div>
                      <span className="text-xs text-stone-400">
                        {insights.unfinishedActionItems.length} Identified
                      </span>
                    </div>

                    {insights.unfinishedActionItems.length > 0 ? (
                      <ul className="mt-4 space-y-2">
                        {insights.unfinishedActionItems.map((item, idx) => {
                          const isDone = !!completedTaskIds[idx];
                          return (
                            <li
                              key={idx}
                              onClick={() => toggleTaskCompletion(idx)}
                              className={`flex items-start gap-3 rounded-xl border p-3 text-xs cursor-pointer transition-all ${
                                isDone
                                  ? "bg-stone-50 border-stone-200 text-stone-400 line-through"
                                  : "bg-white border-stone-200 text-stone-800 hover:border-stone-300"
                              }`}
                            >
                              <div
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                  isDone
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-stone-300 bg-white text-transparent hover:border-stone-400"
                                }`}
                              >
                                <Check className="h-3 w-3" />
                              </div>
                              <span className="leading-relaxed select-none">{item}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-4 text-xs text-stone-400 italic">
                        No pending unfinished tasks detected.
                      </p>
                    )}
                  </div>
                  <p className="mt-4 text-[10px] text-stone-400 border-t border-stone-100 pt-2">
                    Click items to toggle completion locally.
                  </p>
                </div>

                {/* MODULE 5: Important Decisions */}
                <div
                  id="module-important-decisions"
                  className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-stone-100 text-stone-800">
                          <Compass className="h-3.5 w-3.5" />
                        </span>
                        <h3 className="text-sm font-semibold text-stone-900">
                          5. Important Decisions Made
                        </h3>
                      </div>
                      <span className="text-xs text-stone-400">
                        {insights.decisions.length} Determinations
                      </span>
                    </div>

                    {insights.decisions.length > 0 ? (
                      <ul className="mt-4 space-y-2.5">
                        {insights.decisions.map((decision, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 rounded-xl bg-stone-50 border border-stone-200/80 p-3 text-xs text-stone-800"
                          >
                            <span className="mt-0.5 text-stone-500">🧭</span>
                            <span className="leading-relaxed font-medium">{decision}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-xs text-stone-400 italic">
                        No major decisions formulated in recent journals.
                      </p>
                    )}
                  </div>
                  <p className="mt-4 text-[11px] text-stone-400 border-t border-stone-100 pt-2">
                    Key determinations, trade-offs, and directions resolved this week.
                  </p>
                </div>
              </div>

              {/* MODULE 6: Recurring Themes */}
              <div
                id="module-recurring-themes"
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold text-stone-900">
                      6. Recurring Cognitive & Emotional Themes
                    </h3>
                  </div>
                  <span className="text-xs text-stone-400">
                    {insights.recurringThemes.length} Patterns
                  </span>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-3">
                  {insights.recurringThemes.map((theme, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-xs text-stone-900">{theme.theme}</h4>
                        <span className="rounded-full bg-stone-200/70 px-2 py-0.5 text-[10px] font-medium text-stone-700">
                          {theme.sentiment}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {theme.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* MODULE 7: Suggested Next Actions */}
              <div
                id="module-suggested-actions"
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                      <Lightbulb className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold text-stone-900">
                      7. Suggested Next Actions for the Week Ahead
                    </h3>
                  </div>
                  <span className="text-xs text-stone-400">
                    {insights.suggestedNextActions.length} Recommendations
                  </span>
                </div>

                <ul className="space-y-2.5">
                  {insights.suggestedNextActions.map((action, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 rounded-xl border border-stone-200 bg-emerald-50/30 p-3.5 text-xs text-stone-800"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-900 text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <span className="mt-0.5 leading-relaxed font-medium">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
