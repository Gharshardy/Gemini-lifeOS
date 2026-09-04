import React from "react";
import {
  BrainCircuit,
  Lock,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Database,
  ArrowRight,
  Fingerprint,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface LandingPageProps {
  onOpenSecurityModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenSecurityModal }) => {
  const { signInWithGoogle, loading, error, clearError } = useAuth();
  const isEmbedded = typeof window !== "undefined" && window.self !== window.top;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col justify-between selection:bg-emerald-200">
      {/* Top Banner / Security Notice */}
      <header className="border-b border-stone-200/80 bg-stone-100/70 py-2.5 px-4 text-center text-xs text-stone-600">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium text-stone-900">Zero-Trust Life Intelligence</span>
            <span className="hidden sm:inline text-stone-400">|</span>
            <span className="hidden sm:inline text-stone-500 font-mono">
              Enforced path: /users/&#123;uid&#125;/...
            </span>
          </div>
          <button
            onClick={onOpenSecurityModal}
            className="flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Security & Architecture Spec
          </button>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="mx-auto flex max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Mission & Core CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Full-Stack Personal Life Intelligence</span>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl font-serif">
              A private space to reflect, think, and evolve.
            </h1>

            <p className="text-lg text-stone-600 leading-relaxed max-w-xl">
              Gemini LifeOS acts as an empathetic, introspective dialogue partner.
              Have open, unhurried conversations about your day, projects, or
              mindset. Gemini automatically distills key reflections, extracts
              thematic tags, and charts life patterns — stored strictly under your
              cryptographically verified Firebase identity.
            </p>

            {/* Error banner if any */}
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/95 p-4 text-xs text-rose-900 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-rose-950">Authentication Notice</p>
                    <p className="text-rose-800 leading-relaxed">{error}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-rose-200/60">
                  <a
                    href={typeof window !== "undefined" ? window.location.href : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-900 text-white px-3 py-1.5 font-medium hover:bg-rose-800 transition-colors shadow-2xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open App in New Tab to Sign In
                  </a>
                  <button
                    onClick={clearError}
                    className="text-xs text-rose-700 hover:text-rose-900 underline underline-offset-2"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Sign in button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="flex items-center justify-center gap-3 rounded-xl bg-stone-900 px-6 py-3.5 text-sm font-semibold text-stone-50 shadow-md hover:bg-stone-800 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? "Authenticating..." : "Sign in with Google"}</span>
                <ArrowRight className="h-4 w-4 text-stone-400" />
              </button>

              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Google OAuth 2.0 authentication</span>
                </div>
                {isEmbedded && (
                  <>
                    <span className="text-stone-300">|</span>
                    <a
                      href={typeof window !== "undefined" ? window.location.href : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 underline underline-offset-2 font-medium"
                    >
                      <span>Open in new tab</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Architecture Principles Pill Group */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6">
              <div className="rounded-xl border border-stone-200/90 bg-white p-3 shadow-2xs">
                <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
                  <Fingerprint className="h-4 w-4 text-emerald-600" />
                  <span>Strict UID Isolation</span>
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  Data locked under users/&#123;uid&#125; with zero cross-tenant access.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200/90 bg-white p-3 shadow-2xs">
                <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
                  <KeyRound className="h-4 w-4 text-emerald-600" />
                  <span>Zero Exposed Keys</span>
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  Gemini API runs through server-side proxy. No browser secrets.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200/90 bg-white p-3 shadow-2xs">
                <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
                  <Database className="h-4 w-4 text-emerald-600" />
                  <span>Cloud Firestore</span>
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  Hardened rules with default-deny fallback and full auditability.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Feature Flow Preview */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-stone-900 flex items-center justify-center text-emerald-400">
                    <BrainCircuit className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-stone-900">
                      Sample Life Reflection Flow
                    </h3>
                    <p className="text-[10px] text-stone-500">
                      Multi-turn AI &rarr; Executive Synthesis
                    </p>
                  </div>
                </div>
                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-stone-600">
                  Live Preview
                </span>
              </div>

              {/* Sample chat bubble */}
              <div className="space-y-3 py-4 text-xs">
                <div className="rounded-xl bg-stone-100 p-3 text-stone-700 max-w-[85%]">
                  <p className="font-semibold text-stone-900 text-[10px] mb-1">You</p>
                  I'm feeling overwhelmed balancing my startup engineering sprint with
                  staying present for my family in the evenings.
                </div>

                <div className="ml-auto rounded-xl bg-emerald-50/80 border border-emerald-200/60 p-3 text-emerald-950 max-w-[90%]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-emerald-900 text-[10px]">
                      Gemini Life Intelligence
                    </span>
                    <span className="text-[10px] text-emerald-600">Empathetic Mirror</span>
                  </div>
                  That tension is understandable. When work requires deep cognitive stamina,
                  transitioning to relational presence requires an intentional mental
                  airlock. What is one small boundary ritual we could experiment with?
                </div>

                {/* Synthesis Card Preview */}
                <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-900">
                      Auto-Synthesized Journal Entry
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                      Mood: Contemplative
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 italic">
                    "Identified cognitive spillover from work into evening presence. Establishing
                    a 15-minute transitional boundary walk."
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="rounded bg-stone-200/80 px-2 py-0.5 text-[10px] text-stone-700">
                      #Boundaries
                    </span>
                    <span className="rounded bg-stone-200/80 px-2 py-0.5 text-[10px] text-stone-700">
                      #MentalEnergy
                    </span>
                    <span className="rounded bg-stone-200/80 px-2 py-0.5 text-[10px] text-stone-700">
                      #FamilyPresence
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-3 text-center">
                <p className="text-[11px] text-stone-500">
                  Ready to start your first session? Click Sign in with Google above.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 px-4 text-center text-xs text-stone-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Gemini LifeOS &copy; {new Date().getFullYear()} &mdash; Privacy-First Personal AI Journal.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-emerald-700 font-medium">Cloud Firestore Enforced</span>
            <span>&bull;</span>
            <span className="text-stone-600">Model: gemini-3.8-flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
