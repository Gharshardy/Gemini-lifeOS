import React from "react";
import {
  BrainCircuit,
  LayoutDashboard,
  MessageSquarePlus,
  History,
  Sparkles,
  ShieldCheck,
  LogOut,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ActiveTab } from "../types";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSecurityModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSecurityModal,
}) => {
  const { user, signOutUser } = useAuth();

  const navItems = [
    { id: "dashboard" as ActiveTab, label: "Dashboard", icon: LayoutDashboard },
    { id: "journal" as ActiveTab, label: "AI Journal", icon: MessageSquarePlus },
    { id: "memory" as ActiveTab, label: "Personal Memory", icon: BrainCircuit },
    { id: "history" as ActiveTab, label: "History", icon: History },
    { id: "insights" as ActiveTab, label: "Weekly Life Intelligence", icon: Sparkles },
    { id: "privacy" as ActiveTab, label: "Privacy Center", icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("dashboard")}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-stone-100 shadow-sm transition-transform group-hover:scale-105">
              <BrainCircuit className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-stone-900 tracking-tight">
                  Gemini LifeOS
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200/60">
                  Zero-Knowledge Path
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-mono">
                users/{user ? `${user.uid.slice(0, 6)}...` : "auth"}
              </p>
            </div>
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-stone-200/60 p-1 border border-stone-300/40">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white text-stone-900 shadow-xs border border-stone-200/80 font-semibold"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-stone-500"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenSecurityModal}
            className="hidden lg:flex items-center gap-1.5 rounded-lg border border-stone-300/80 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
            title="View Security Architecture & Verification Audit"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Security Spec</span>
          </button>

          {user && (
            <div className="flex items-center gap-2 border-l border-stone-200 pl-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User Avatar"}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full border border-stone-300 object-cover shadow-2xs"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-stone-700 border border-stone-300">
                  <UserCheck className="h-4 w-4" />
                </div>
              )}
              <div className="hidden xl:block text-left">
                <p className="text-xs font-semibold text-stone-800 leading-tight truncate max-w-[120px]">
                  {user.displayName || "Authenticated"}
                </p>
                <p className="text-[10px] text-stone-400 truncate max-w-[120px]">
                  {user.email}
                </p>
              </div>

              <button
                onClick={signOutUser}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                title="Sign out of Gemini LifeOS"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="flex md:hidden border-t border-stone-200/80 bg-stone-100/80 px-2 py-1.5 justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center py-1 px-2 text-[10px] font-medium transition-colors ${
                isActive ? "text-emerald-700 font-semibold" : "text-stone-500"
              }`}
            >
              <Icon className="h-4 w-4 mb-0.5" />
              <span>{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
