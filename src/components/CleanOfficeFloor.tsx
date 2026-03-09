import { useMemo } from "react";
import type { Agent, Department, Task, MeetingPresence, SubAgent, CrossDeptDelivery, CeoOfficeCall } from "../types";
import { useI18n, localeName } from "../i18n";
import AgentAvatar, { useSpriteMap } from "./AgentAvatar";

/* ── Props ── */
interface CleanOfficeFloorProps {
  departments: Department[];
  agents: Agent[];
  tasks: Task[];
  subAgents: SubAgent[];
  meetingPresence?: MeetingPresence[];
  activeMeetingTaskId?: string | null;
  unreadAgentIds?: Set<string>;
  crossDeptDeliveries?: CrossDeptDelivery[];
  onCrossDeptDeliveryProcessed?: (id: string) => void;
  ceoOfficeCalls?: CeoOfficeCall[];
  onCeoOfficeCallProcessed?: (id: string) => void;
  onOpenActiveMeetingMinutes?: (taskId: string) => void;
  customDeptThemes?: Record<string, { floor1: number; floor2: number; wall: number; accent: number }>;
  themeHighlightTargetId?: string | null;
  onSelectAgent: (agent: Agent) => void;
  onSelectDepartment: (dept: Department) => void;
}

const DOT: Record<string, string> = {
  working: "bg-green-500",
  idle: "bg-amber-400",
  break: "bg-orange-400",
  offline: "bg-gray-400",
  meeting: "bg-blue-400",
};

/* ── Tiny avatar button ── */
function Av({
  agent,
  spriteMap,
  onClick,
  size = 36,
  unread,
}: {
  agent: Agent;
  spriteMap: Map<string, number>;
  onClick: () => void;
  size?: number;
  unread?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-0.5 hover:scale-105 active:scale-95 transition-transform" title={agent.name}>
      <div className="relative">
        <AgentAvatar agent={agent} spriteMap={spriteMap} size={size} rounded="full" />
        <span className={`absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full border-2 ${DOT[agent.status ?? "idle"]}`} style={{ borderColor: "var(--th-card-bg)" }} />
        {unread && <span className="absolute -top-px -right-px w-2.5 h-2.5 rounded-full bg-red-500 border-2 animate-pulse" style={{ borderColor: "var(--th-card-bg)" }} />}
      </div>
      <span className="text-[9px] truncate max-w-[48px] leading-none" style={{ color: "var(--th-text-muted)" }}>{agent.name}</span>
    </button>
  );
}

/* ── Main ── */
export default function CleanOfficeFloor({
  departments,
  agents,
  tasks: _tasks,
  subAgents: _subAgents,
  meetingPresence = [],
  activeMeetingTaskId: _activeMeetingTaskId,
  unreadAgentIds,
  crossDeptDeliveries: _crossDeptDeliveries,
  onCrossDeptDeliveryProcessed: _onCrossDeptDeliveryProcessed,
  ceoOfficeCalls: _ceoOfficeCalls,
  onCeoOfficeCallProcessed: _onCeoOfficeCallProcessed,
  onOpenActiveMeetingMinutes: _onOpenActiveMeetingMinutes,
  customDeptThemes: _customDeptThemes,
  themeHighlightTargetId: _themeHighlightTargetId,
  onSelectAgent,
  onSelectDepartment,
}: CleanOfficeFloorProps) {
  const { t, locale } = useI18n();
  const spriteMap = useSpriteMap(agents);
  const tr = (ko: string, en: string, ja = en, zh = en) => t({ ko, en, ja, zh });

  const { deptAgents, meetingAgents, breakAgents } = useMemo(() => {
    const meetingIds = new Set(meetingPresence.map((m) => m.agent_id));
    const mAgents = agents.filter((a) => meetingIds.has(a.id));
    const bAgents = agents.filter((a) => a.status === "break" && !meetingIds.has(a.id));
    const dMap = new Map<string, Agent[]>();
    for (const a of agents) {
      if (meetingIds.has(a.id) || a.status === "break") continue;
      const deptId = a.department_id ?? "__none__";
      if (!dMap.has(deptId)) dMap.set(deptId, []);
      dMap.get(deptId)!.push(a);
    }
    return { deptAgents: dMap, meetingAgents: mAgents, breakAgents: bAgents };
  }, [agents, meetingPresence]);

  const sortedDepts = useMemo(() => [...departments].sort((a, b) => a.sort_order - b.sort_order), [departments]);

  const working = agents.filter((a) => a.status === "working").length;
  const idle = agents.filter((a) => a.status === "idle").length;
  const onBreak = agents.filter((a) => a.status === "break").length;

  return (
    <div className="space-y-3 max-w-5xl mx-auto">
      {/* Inline status counts */}
      <div className="flex items-center gap-4 px-1 text-[11px]" style={{ color: "var(--th-text-muted)" }}>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{working} {tr("작업중", "working")}</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{idle} {tr("대기", "idle")}</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" />{onBreak} {tr("휴식", "break")}</span>
        <span className="ml-auto tabular-nums">{agents.length} {tr("명", "total")}</span>
      </div>

      {/* CEO + Meeting — compact row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <img src="/sprites/ceo-lobster.png" alt="CEO" className="w-7 h-7 object-contain" style={{ imageRendering: "pixelated" }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: "var(--th-text-heading)" }}>
              👑 {tr("CEO", "CEO")}
            </span>
          </div>
        </div>
        <div className="rounded-xl p-3" style={{ background: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold" style={{ color: "var(--th-text-heading)" }}>🎯 {tr("회의실", "Meeting")}</span>
            {meetingAgents.length > 0 && <span className="text-[10px] tabular-nums" style={{ color: "var(--th-text-muted)" }}>{meetingAgents.length}</span>}
          </div>
          {meetingAgents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {meetingAgents.map((a) => <Av key={a.id} agent={{ ...a, status: "working" as const }} spriteMap={spriteMap} onClick={() => onSelectAgent(a)} size={32} unread={unreadAgentIds?.has(a.id)} />)}
            </div>
          ) : (
            <span className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>—</span>
          )}
        </div>
      </div>

      {/* Departments — 2-col grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sortedDepts.map((dept) => {
          const da = deptAgents.get(dept.id) ?? [];
          const wc = da.filter((a) => a.status === "working").length;
          return (
            <div key={dept.id} className="rounded-xl p-3" style={{ background: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}>
              <button type="button" onClick={() => onSelectDepartment(dept)} className="flex items-center gap-1.5 mb-2 hover:opacity-80 transition-opacity">
                <span className="text-sm">{dept.icon}</span>
                <span className="text-xs font-semibold" style={{ color: "var(--th-text-heading)" }}>{localeName(locale, dept)}</span>
                <span className="text-[10px] tabular-nums ml-auto" style={{ color: "var(--th-text-muted)" }}>{wc}/{da.length}</span>
              </button>
              {da.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {da.map((a) => <Av key={a.id} agent={a} spriteMap={spriteMap} onClick={() => onSelectAgent(a)} size={34} unread={unreadAgentIds?.has(a.id)} />)}
                </div>
              ) : (
                <span className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>—</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Break room — only if someone is on break */}
      {breakAgents.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "var(--th-card-bg)", border: "1px solid var(--th-card-border)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-semibold" style={{ color: "var(--th-text-heading)" }}>☕ {tr("휴게실", "Break Room")}</span>
            <span className="text-[10px] tabular-nums" style={{ color: "var(--th-text-muted)" }}>{breakAgents.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {breakAgents.map((a) => <Av key={a.id} agent={a} spriteMap={spriteMap} onClick={() => onSelectAgent(a)} size={34} />)}
          </div>
        </div>
      )}
    </div>
  );
}
