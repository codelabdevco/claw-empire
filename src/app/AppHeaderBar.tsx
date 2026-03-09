import type { WorkflowPackKey } from "../types";
import type { View } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Sun, Moon, MoreVertical } from "lucide-react";

type OfficePackOption = {
  key: WorkflowPackKey;
  label: string;
  summary: string;
  slug: string;
  accent: number;
};

interface AppHeaderBarProps {
  currentView: View;
  connected: boolean;
  viewTitle: string;
  tasksPrimaryLabel: string;
  decisionLabel: string;
  decisionInboxLoading: boolean;
  decisionInboxCount: number;
  agentStatusLabel: string;
  reportLabel: string;
  announcementLabel: string;
  roomManagerLabel: string;
  officePackControl?: {
    label: string;
    value: WorkflowPackKey;
    options: OfficePackOption[];
    onChange: (packKey: WorkflowPackKey) => void;
  } | null;
  theme: "light" | "dark";
  mobileHeaderMenuOpen: boolean;
  onOpenMobileNav: () => void;
  onOpenTasks: () => void;
  onOpenDecisionInbox: () => void;
  onOpenAgentStatus: () => void;
  onOpenReportHistory: () => void;
  onOpenAnnouncement: () => void;
  onOpenRoomManager: () => void;
  onToggleTheme: () => void;
  onToggleMobileHeaderMenu: () => void;
  onCloseMobileHeaderMenu: () => void;
}

export default function AppHeaderBar({
  currentView,
  connected,
  viewTitle,
  tasksPrimaryLabel,
  decisionLabel,
  decisionInboxLoading,
  decisionInboxCount,
  agentStatusLabel,
  reportLabel,
  announcementLabel,
  roomManagerLabel,
  officePackControl,
  theme,
  mobileHeaderMenuOpen,
  onOpenMobileNav,
  onOpenTasks,
  onOpenDecisionInbox,
  onOpenAgentStatus,
  onOpenReportHistory,
  onOpenAnnouncement,
  onOpenRoomManager,
  onToggleTheme,
  onToggleMobileHeaderMenu,
  onCloseMobileHeaderMenu,
}: AppHeaderBarProps) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-3 py-2 backdrop-blur-sm sm:px-4 sm:py-3 lg:px-6 border-b border-border"
      style={{ background: "var(--th-bg-header)" }}
    >
      {/* Left */}
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="outline" size="icon" onClick={onOpenMobileNav} className="lg:hidden" aria-label="Open navigation">
          ☰
        </Button>
        <h1 className="truncate text-base font-bold sm:text-lg flex items-center gap-2 text-foreground">
          {currentView === "agents" && (
            <span className="relative inline-flex items-center" style={{ width: 30, height: 22 }}>
              <img src="/sprites/8-D-1.png" alt="" className="absolute left-0 top-0 w-5 h-5 rounded-full object-cover" style={{ imageRendering: "pixelated", opacity: 0.85 }} />
              <img src="/sprites/3-D-1.png" alt="" className="absolute left-2.5 top-0.5 w-5 h-5 rounded-full object-cover" style={{ imageRendering: "pixelated", zIndex: 1 }} />
            </span>
          )}
          <span className="truncate">{viewTitle}</span>
        </h1>
        {officePackControl && (
          <div className="hidden xl:flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {officePackControl.label}
            </span>
            <select
              value={officePackControl.value}
              onChange={(e) => officePackControl.onChange(e.target.value as WorkflowPackKey)}
              className="min-w-[170px] bg-transparent text-xs font-medium text-foreground focus:outline-none"
            >
              {officePackControl.options.map((option) => (
                <option key={option.key} value={option.key}>{option.slug} · {option.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button size="sm" onClick={onOpenTasks} aria-label={tasksPrimaryLabel}>
          <span className="sm:hidden">📋</span>
          <span className="hidden sm:inline">📋 {tasksPrimaryLabel}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenDecisionInbox}
          disabled={decisionInboxLoading}
          className={cn("relative", decisionInboxCount > 0 && "border-blue-500/50")}
          aria-label={decisionLabel}
        >
          <span className="sm:hidden">{decisionInboxLoading ? "⏳" : "🧭"}</span>
          <span className="hidden sm:inline">{decisionInboxLoading ? "⏳" : "🧭"} {decisionLabel}</span>
          {decisionInboxCount > 0 && (
            <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] bg-blue-500 text-white border-0">
              {decisionInboxCount}
            </Badge>
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={onOpenAnnouncement}>
          <span className="sm:hidden">📢</span>
          <span className="hidden sm:inline">{announcementLabel}</span>
        </Button>

        <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        {/* Overflow */}
        <div className="relative">
          <Button variant="outline" size="icon" onClick={onToggleMobileHeaderMenu} aria-label="More">
            <MoreVertical className="h-4 w-4" />
          </Button>
          {mobileHeaderMenuOpen && (
            <>
              <button className="fixed inset-0 z-40" onClick={onCloseMobileHeaderMenu} aria-label="Close menu" />
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-card py-1 shadow-lg">
                {officePackControl && (
                  <div className="px-3 py-2 border-b border-border">
                    <label htmlFor="mobile-office-pack-selector" className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                      {officePackControl.label}
                    </label>
                    <select
                      id="mobile-office-pack-selector"
                      value={officePackControl.value}
                      onChange={(e) => { officePackControl.onChange(e.target.value as WorkflowPackKey); onCloseMobileHeaderMenu(); }}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none"
                    >
                      {officePackControl.options.map((option) => (
                        <option key={option.key} value={option.key}>{option.slug} · {option.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button onClick={() => { onOpenAgentStatus(); onCloseMobileHeaderMenu(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition">
                  🛠 {agentStatusLabel}
                </button>
                <button onClick={() => { onOpenReportHistory(); onCloseMobileHeaderMenu(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition">
                  {reportLabel}
                </button>
                <button onClick={() => { onOpenRoomManager(); onCloseMobileHeaderMenu(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-accent transition">
                  {roomManagerLabel}
                </button>
              </div>
            </>
          )}
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-500" : "bg-red-500")} />
          <span className="hidden sm:inline">{connected ? "Live" : "Offline"}</span>
        </div>
      </div>
    </header>
  );
}
