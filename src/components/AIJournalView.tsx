import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  RefreshCw,
  BookmarkCheck,
  BrainCircuit,
  Bot,
  User as UserIcon,
  Copy,
  Check,
  Tag,
  Smile,
  FileText,
  AlertCircle,
  X,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ChatMessage, JournalEntry, ConversationSession, SavedSummary } from "../types";
import { saveJournalEntry, saveConversationSession, saveSummary } from "../lib/firebase";
import { authFetch } from "../lib/api";

interface AIJournalViewProps {
  onJournalSaved: (entry: JournalEntry) => void;
  initialConversation?: ConversationSession | null;
}

const PROMPT_SUGGESTIONS = [
  "What is one win and one tension you experienced today?",
  "Unpack an important decision you have been wrestling with.",
  "What drained your energy today vs. what gave you clarity?",
  "Evening reflection: what are three specific moments you are grateful for?",
  "What would make tomorrow a meaningful, peaceful day?",
];

export const AIJournalView: React.FC<AIJournalViewProps> = ({
  onJournalSaved,
  initialConversation,
}) => {
  const { user } = useAuth();

  const [conversationId, setConversationId] = useState<string>(
    initialConversation?.id || `conv_${Date.now()}`
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialConversation?.messages || [
      {
        id: "msg_intro",
        role: "model",
        content:
          "Welcome to your private reflection space. How is your mind feeling right now, and what's on your heart or schedule today?",
        timestamp: new Date().toISOString(),
      },
    ]
  );
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Save Modal States
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [journalTitle, setJournalTitle] = useState("");
  const [journalSummary, setJournalSummary] = useState("");
  const [journalMood, setJournalMood] = useState("Reflective");
  const [journalTopics, setJournalTopics] = useState<string[]>([]);
  const [journalKeyPoints, setJournalKeyPoints] = useState<string[]>([]);
  const [journalGoals, setJournalGoals] = useState<string[]>([]);
  const [journalActionItems, setJournalActionItems] = useState<string[]>([]);
  const [journalNotes, setJournalNotes] = useState("");
  const [newTopicInput, setNewTopicInput] = useState("");
  const [newGoalInput, setNewGoalInput] = useState("");
  const [newActionInput, setNewActionInput] = useState("");
  const [isSavingToDb, setIsSavingToDb] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Persist conversation to Firestore in background
  const persistSession = async (updatedMessages: ChatMessage[]) => {
    if (!user) return;
    try {
      const session: ConversationSession = {
        id: conversationId,
        userId: user.uid,
        title: updatedMessages[1]?.content?.slice(0, 50) || "Life Reflection Session",
        messages: updatedMessages,
        status: "active",
        createdAt: messages[0]?.timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveConversationSession(user.uid, session);
    } catch (e) {
      console.warn("Could not auto-persist conversation draft:", e);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage.trim();
    if (!text || isLoading) return;

    setApiError(null);
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Call server-side Gemini chat endpoint with authenticated ID token
      const res = await authFetch("/api/gemini/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to communicate with Gemini API.");
      }

      const modelMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "model",
        content: data.reply || "Thank you for sharing that reflection.",
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, modelMsg];
      setMessages(finalMessages);
      persistSession(finalMessages);
    } catch (err: unknown) {
      console.warn("Chat response notice:", err);
      setApiError(err instanceof Error ? err.message : "Error receiving AI response.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewConversation = () => {
    if (messages.length > 2) {
      if (!window.confirm("Start a new conversation? Unsaved reflections can still be saved using the 'Save as Journal' button.")) {
        return;
      }
    }
    const newId = `conv_${Date.now()}`;
    setConversationId(newId);
    setMessages([
      {
        id: "msg_intro",
        role: "model",
        content:
          "Starting a fresh page. Take a slow breath. What would you like to explore or reflect on right now?",
        timestamp: new Date().toISOString(),
      },
    ]);
    setApiError(null);
  };

  const handleOpenSaveModal = async () => {
    if (messages.length <= 1) {
      alert("Please share a reflection or exchange a few messages before saving as a journal entry.");
      return;
    }

    setIsSummarizing(true);
    setApiError(null);

    try {
      // Call server-side summary & metadata extraction endpoint with authenticated ID token
      const res = await authFetch("/api/gemini/summarize", {
        method: "POST",
        body: JSON.stringify({ conversation: messages }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate summary.");
      }

      setJournalTitle(data.title || "Daily Reflection");
      setJournalSummary(data.summary || "");
      setJournalMood(data.mood || "Reflective");
      setJournalTopics(Array.isArray(data.topics) ? data.topics : ["Reflection", "Mindfulness"]);
      setJournalKeyPoints(Array.isArray(data.keyPoints) ? data.keyPoints : []);
      setJournalGoals(Array.isArray(data.goals) ? data.goals : []);
      setJournalActionItems(Array.isArray(data.actionItems) ? data.actionItems : []);
      setJournalNotes("");
      setShowSaveModal(true);
    } catch (err: unknown) {
      console.warn("Summarize notice:", err);
      // Fallback if summarization fails
      setJournalTitle(`Journal Reflection - ${new Date().toLocaleDateString()}`);
      setJournalSummary(
        messages
          .filter((m) => m.role === "user")
          .map((m) => m.content)
          .join("\n\n")
          .slice(0, 500)
      );
      setJournalTopics(["LifeOS"]);
      setJournalKeyPoints(["Reflected on daily thoughts."]);
      setJournalGoals([]);
      setJournalActionItems([]);
      setShowSaveModal(true);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCommitJournal = async () => {
    if (!user) return;
    if (!journalTitle.trim()) {
      alert("Please provide a title for your journal entry.");
      return;
    }

    setIsSavingToDb(true);
    try {
      const entryId = `journal_${Date.now()}`;
      const newEntry: JournalEntry = {
        id: entryId,
        userId: user.uid,
        title: journalTitle.trim(),
        summary: journalSummary.trim(),
        keyPoints: journalKeyPoints,
        topics: journalTopics,
        goals: journalGoals,
        actionItems: journalActionItems,
        mood: journalMood,
        userNotes: journalNotes.trim(),
        conversation: messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveJournalEntry(user.uid, newEntry);

      // Save summary record under users/{uid}/summaries/{summaryId}
      const summaryDoc: SavedSummary = {
        id: `summary_${Date.now()}`,
        userId: user.uid,
        journalId: entryId,
        title: journalTitle.trim(),
        summary: journalSummary.trim(),
        keyPoints: journalKeyPoints,
        topics: journalTopics,
        createdAt: newEntry.createdAt,
      };
      await saveSummary(user.uid, summaryDoc);

      // Mark session as saved in conversations
      const updatedSession: ConversationSession = {
        id: conversationId,
        userId: user.uid,
        title: journalTitle.trim(),
        messages,
        status: "saved",
        createdAt: messages[0]?.timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveConversationSession(user.uid, updatedSession);

      setShowSaveModal(false);
      onJournalSaved(newEntry);
    } catch (err: unknown) {
      console.error("Error saving journal to Firestore:", err);
      alert("Failed to save journal to Cloud Firestore. Please check your network or security permissions.");
    } finally {
      setIsSavingToDb(false);
    }
  };

  const handleAddTopic = () => {
    if (newTopicInput.trim() && !journalTopics.includes(newTopicInput.trim())) {
      setJournalTopics([...journalTopics, newTopicInput.trim()]);
      setNewTopicInput("");
    }
  };

  const handleRemoveTopic = (t: string) => {
    setJournalTopics(journalTopics.filter((item) => item !== t));
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-h-[900px] rounded-2xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
      {/* Top Session Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-stone-200/80 bg-stone-50/80 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-emerald-400">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-semibold text-stone-900">
              Conversational Life Reflection
            </h2>
            <p className="text-[10px] text-stone-500 font-mono">
              Model: gemini-3.8-flash &bull; Private session
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <button
            onClick={handleStartNewConversation}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>New Dialogue</span>
          </button>

          <button
            onClick={handleOpenSaveModal}
            disabled={isSummarizing || messages.length <= 1}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-2xs"
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            <span>{isSummarizing ? "Synthesizing Summary..." : "Save as Journal"}</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[90%] sm:max-w-[80%] ${
                isUser ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isUser
                    ? "bg-stone-900 text-stone-100"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}
              >
                {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`group relative rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                  isUser
                    ? "bg-stone-900 text-stone-100 rounded-tr-xs"
                    : "bg-stone-100/90 text-stone-800 border border-stone-200/80 rounded-tl-xs"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-60">
                  <span className="font-semibold">
                    {isUser ? "You" : "Gemini LifeOS"}
                  </span>
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="whitespace-pre-line">{msg.content}</p>

                {/* Copy action */}
                <button
                  onClick={() => handleCopyMessage(msg.id, msg.content)}
                  className={`absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 rounded p-1 text-[10px] transition-opacity ${
                    isUser
                      ? "text-stone-300 hover:text-white hover:bg-stone-800"
                      : "text-stone-500 hover:text-stone-900 hover:bg-stone-200"
                  }`}
                  title="Copy text"
                >
                  {copiedMsgId === msg.id ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl bg-stone-100 px-4 py-3 text-xs text-stone-500 border border-stone-200">
              <span className="h-2 w-2 rounded-full bg-stone-400 animate-bounce"></span>
              <span className="h-2 w-2 rounded-full bg-stone-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="h-2 w-2 rounded-full bg-stone-400 animate-bounce [animation-delay:0.4s]"></span>
              <span className="ml-1 text-[11px] font-medium">Gemini is reflecting...</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {apiError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to complete response</p>
              <p className="mt-0.5">{apiError}</p>
            </div>
          </div>
        )}

        {/* End-of-conversation Save Callout */}
        {messages.length > 2 && !isLoading && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-4 shadow-2xs mt-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-emerald-950">
                  Ready to capture this conversation?
                </h4>
                <p className="text-[11px] text-emerald-800">
                  Gemini will summarize this dialogue, extract key points, topics, goals, and action items.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenSaveModal}
              disabled={isSummarizing}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50 transition-colors shadow-2xs shrink-0"
            >
              <BookmarkCheck className="h-3.5 w-3.5" />
              <span>{isSummarizing ? "Synthesizing Summary..." : "Save as Journal"}</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts bar when conversation is brief */}
      {messages.length <= 2 && (
        <div className="border-t border-stone-100 bg-stone-50/60 p-3">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
            <span>Reflective Thought Starters</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PROMPT_SUGGESTIONS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-stone-700 hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-900 transition-colors text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input Form */}
      <div className="border-t border-stone-200/80 bg-white p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your reflection or prompt... (Shift+Enter for newline)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-stone-300 p-3 text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:border-stone-900 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-40 transition-colors shadow-xs"
            title="Send reflection"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* SAVE CONVERSATION AS JOURNAL MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base sm:text-lg font-semibold text-stone-900 font-serif">
                  Save as Encrypted Journal Entry
                </h3>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
              {/* Title */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Journal Title
                </label>
                <input
                  type="text"
                  value={journalTitle}
                  onChange={(e) => setJournalTitle(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs sm:text-sm text-stone-800 focus:border-stone-900 focus:outline-none font-serif"
                />
              </div>

              {/* Mood and Topics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Detected Emotional Tone / Mood
                  </label>
                  <div className="flex items-center gap-2">
                    <Smile className="h-4 w-4 text-amber-600 shrink-0" />
                    <select
                      value={journalMood}
                      onChange={(e) => setJournalMood(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 p-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none"
                    >
                      <option value="Reflective">Reflective</option>
                      <option value="Grateful">Grateful</option>
                      <option value="Grounded">Grounded</option>
                      <option value="Energized">Energized</option>
                      <option value="Contemplative">Contemplative</option>
                      <option value="Challenged">Challenged</option>
                      <option value="Anxious">Anxious</option>
                      <option value="Inspired">Inspired</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Thematic Topics
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newTopicInput}
                      onChange={(e) => setNewTopicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTopic();
                        }
                      }}
                      placeholder="Add tag and press Enter"
                      className="flex-1 rounded-xl border border-stone-300 p-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTopic}
                      className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Topic chips */}
              {journalTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {journalTopics.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700"
                    >
                      <Tag className="h-3 w-3 text-stone-400" />
                      <span>{t}</span>
                      <button
                        onClick={() => handleRemoveTopic(t)}
                        className="ml-1 text-stone-400 hover:text-stone-700"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Executive Summary */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Executive Summary (AI Generated)
                </label>
                <textarea
                  value={journalSummary}
                  onChange={(e) => setJournalSummary(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800 focus:border-stone-900 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Key Points */}
              {journalKeyPoints.length > 0 && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Key Points & Insights
                  </label>
                  <ul className="space-y-1 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
                    {journalKeyPoints.map((kp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-stone-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{kp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Goals and Action Items Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Goals */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Personal Goals Formulated
                  </label>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <input
                      type="text"
                      value={newGoalInput}
                      onChange={(e) => setNewGoalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newGoalInput.trim()) {
                          e.preventDefault();
                          setJournalGoals([...journalGoals, newGoalInput.trim()]);
                          setNewGoalInput("");
                        }
                      }}
                      placeholder="Add goal and press Enter"
                      className="flex-1 rounded-xl border border-stone-300 p-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newGoalInput.trim()) {
                          setJournalGoals([...journalGoals, newGoalInput.trim()]);
                          setNewGoalInput("");
                        }
                      }}
                      className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200"
                    >
                      Add
                    </button>
                  </div>
                  {journalGoals.length > 0 ? (
                    <div className="space-y-1">
                      {journalGoals.map((g, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] text-stone-800">
                          <span>🎯 {g}</span>
                          <button
                            type="button"
                            onClick={() => setJournalGoals(journalGoals.filter((_, i) => i !== idx))}
                            className="text-stone-400 hover:text-stone-700 ml-1"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-stone-400 italic">No goals formulated in this session.</p>
                  )}
                </div>

                {/* Action Items */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Action Items & Commitments
                  </label>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <input
                      type="text"
                      value={newActionInput}
                      onChange={(e) => setNewActionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newActionInput.trim()) {
                          e.preventDefault();
                          setJournalActionItems([...journalActionItems, newActionInput.trim()]);
                          setNewActionInput("");
                        }
                      }}
                      placeholder="Add task and press Enter"
                      className="flex-1 rounded-xl border border-stone-300 p-2 text-xs text-stone-800 focus:border-stone-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newActionInput.trim()) {
                          setJournalActionItems([...journalActionItems, newActionInput.trim()]);
                          setNewActionInput("");
                        }
                      }}
                      className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200"
                    >
                      Add
                    </button>
                  </div>
                  {journalActionItems.length > 0 ? (
                    <div className="space-y-1">
                      {journalActionItems.map((a, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] text-stone-800">
                          <span>✅ {a}</span>
                          <button
                            type="button"
                            onClick={() => setJournalActionItems(journalActionItems.filter((_, i) => i !== idx))}
                            className="text-stone-400 hover:text-stone-700 ml-1"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-stone-400 italic">No concrete action items listed.</p>
                  )}
                </div>
              </div>

              {/* Personal Notes */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Your Personal Reflections & Action Items (Optional)
                </label>
                <textarea
                  value={journalNotes}
                  onChange={(e) => setJournalNotes(e.target.value)}
                  placeholder="What is one concrete takeaway or boundary you want to remember?"
                  rows={3}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-800 focus:border-stone-900 focus:outline-none"
                />
              </div>

              {/* Security Storage Notice */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] text-emerald-900">
                <span className="font-semibold">Authoritative Identity Enforcement:</span> Stored under{" "}
                <code className="font-mono bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-950">
                  users/{user?.uid}/journals
                </code>
                . Only accessible by your authenticated token.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-stone-200 pt-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitJournal}
                disabled={isSavingToDb}
                className="flex items-center gap-1.5 rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
              >
                <BookmarkCheck className="h-4 w-4 text-emerald-400" />
                <span>{isSavingToDb ? "Committing to Firestore..." : "Confirm & Save Entry"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
