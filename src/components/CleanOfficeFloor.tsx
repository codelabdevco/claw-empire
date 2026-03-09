import { useMemo } from "react";
import type { Agent, Department, Task, MeetingPresence, SubAgent, CrossDeptDelivery, CeoOfficeCall } from "../types";
import { useI18n, localeName } from "../i18n";
import AgentAvatar, { useSpriteMap } from "./AgentAvatar";

/* ── Props (mirrors OfficeView) ── */
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

/* ── Status helpers ── */
const STATUS_COLOR: Record<string, string> = {
  working: "bg-green-500",
  idle: "bg-amber-400",
  break: "bg-orange-400",
  offline: "bg-gray-400",
  meeting: "bg-blue-400",
};

const STATUS_RING: Record<string, string> = {
  working: "ring-green-500/30",
  idle: "ring-amber-400/30",
  break: "ring-orange-400/30",
  offline: "ring-gray-300/20",
  meeting: "ring-blue-400/30",
};

/* ── AgentCircle: clickable avatar with status dot ── */
function AgentCircle({
  agent,
  spriteMap,
  onClick,
  size = 44,
  showName = true,
  unread,
}: {
  agent: Agent;
  spriteMap: Map<string, number>;
  onClick: () => void;
  size?: number;
  showName?: boolean;
  unread?: boolean;
}) {
  const status = agent.status ?? "idle";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group/agent flex flex-col items-center gap-1 transition-transform hover:scale-105 active:scale-95`}
      title={agent.name}
    >
      <div className={`relative ring-2 ${STATUS_RING[status] ?? STATUS_RING.idle} rounded-full`}>
        <AgentAvatar agent={agent} spriteMap={spriteMap} size={size} rounded="full" />
        {/* status dot */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${STATUS_COLOR[status] ?? STATUS_COLOR.idle}`}
        />
        {/* unread indicator */}
        {unread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-800 animate-pulse" />
        )}
      </div>
      {showName && (
        <span
          className="text-[10px] font-medium truncate max-w-[56px] text-center leading-tight"
          style={{ color: "var(--th-text-secondary)" }}
        >
          {agent.name}
        </span>
      )}
    </button>
  );
}

/* ── StatusSummaryBar ── */
function StatusSummaryBar({
  agents,
  tr,
}: {
  agents: Agent[];
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
}) {
  const working = agents.filter((a) => a.status === "working").length;
  const idle = agents.filter((a) => a.status === "idle").length;
  const onBreak = agents.filter((a) => a.status === "break").length;
  const offline = agents.filter((a) => a.status === "offline").length;

  const items = [
    { color: "bg-green-500", label: tr("작업중", "Working", "稼働中", "工作中"), count: working },
    { color: "bg-amber-400", label: tr("대기", "Idle", "待機", "空闲"), count: idle },
    { color: "bg-orange-400", label: tr("휴식", "Break", "休憩", "休息"), count: onBreak },
    { color: "bg-gray-400", label: tr("오프라인", "Offline", "オフライン", "离线"), count: offline },
  ];

  return (
    <div
      className="flex items-center gap-4 sm:gap-6 px-4 py-2.5 rounded-xl"
      style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}
    >
      <span className="text-xs font-semibold" style={{ color: "var(--th-text-heading)" }}>
        {tr("직원 현황", "Staff Status", "社員状況", "员工状态")}
      </span>
      <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${item.color}`} />
            <span className="text-xs tabular-nums" style={{ color: "var(--th-text-secondary)" }}>
              <span className="font-semibold">{item.count}</span>{" "}
              <span className="hidden sm:inline">{item.label}</span>
            </span>
          </div>
        ))}
      </div>
      <span className="ml-auto text-xs tabular-nums font-medium" style={{ color: "var(--th-text-muted)" }}>
        {agents.length} {tr("명", "total", "名", "人")}
      </span>
    </div>
  );
}

/* ── RoomCard wrapper ── */
function RoomCard({
  title,
  icon,
  badge,
  accentColor,
  children,
  onClick,
  className = "",
}: {
  title: string;
  icon: string;
  badge?: string;
  accentColor?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 transition-shadow hover:shadow-md ${className}`}
      style={{
        background: "var(--th-card-bg)",
        border: "1px solid var(--th-card-border)",
        borderTop: accentColor ? `3px solid ${accentColor}` : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
            {title}
          </span>
        </button>
        {badge && (
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: "var(--th-bg-surface)", color: "var(--th-text-muted)", border: "1px solid var(--th-border)" }}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Main component ── */
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

  // Group agents by location
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

  const sortedDepts = useMemo(
    () => [...departments].sort((a, b) => a.sort_order - b.sort_order),
    [departments],
  );

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Status summary */}
      <StatusSummaryBar agents={agents} tr={tr} />

      {/* Special rooms: CEO + Meeting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CEO Office */}
        <RoomCard
          title={tr("CEO 오피스", "CEO Office", "CEOオフィス", "CEO办公室")}
          icon="👑"
          accentColor="#f59e0b"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 ring-2 ring-amber-400/30">
              <img
                src="/sprites/ceo-lobster.png"
                alt="CEO"
                className="w-10 h-10 object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
                {tr("사장실", "Executive Suite", "社長室", "总裁室")}
              </div>
              <div className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
                {tr("지휘 본부", "Command Center", "指揮本部", "指挥中心")}
              </div>
            </div>
          </div>
        </RoomCard>

        {/* Meeting Room */}
        <RoomCard
          title={tr("회의실", "Meeting Room", "会議室", "会议室")}
          icon="🎯"
          badge={meetingAgents.length > 0 ? `${meetingAgents.length} ${tr("명", "in session", "名", "人")}` : undefined}
          accentColor="#3b82f6"
        >
          {meetingAgents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {meetingAgents.map((a) => (
                <AgentCircle
                  key={a.id}
                  agent={{ ...a, status: "working" as const }}
                  spriteMap={spriteMap}
                  onClick={() => onSelectAgent(a)}
                  size={36}
                  showName
                  unread={unreadAgentIds?.has(a.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-3 rounded-xl" style={{ background: "var(--th-bg-surface)" }}>
              <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>
                {tr("진행중인 회의 없음", "No active meetings", "会議なし", "无进行中的会议")}
              </span>
            </div>
          )}
        </RoomCard>
      </div>

      {/* Department rooms */}
      <div className="space-y-3">
        {sortedDepts.map((dept) => {
          const dAgents = deptAgents.get(dept.id) ?? [];
          const workingCount = dAgents.filter((a) => a.status === "working").length;
          return (
            <RoomCard
              key={dept.id}
              title={localeName(locale, dept)}
              icon={dept.icon}
              badge={`${workingCount}/${dAgents.length} ${tr("작업중", "active", "稼働", "活跃")}`}
              accentColor={dept.color}
              onClick={() => onSelectDepartment(dept)}
            >
              {dAgents.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {dAgents.map((a) => (
                    <AgentCircle
                      key={a.id}
                      agent={a}
                      spriteMap={spriteMap}
                      onClick={() => onSelectAgent(a)}
                      size={44}
                      showName
                      unread={unreadAgentIds?.has(a.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-3 rounded-xl" style={{ background: "var(--th-bg-surface)" }}>
                  <span className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
                    {tr("배정된 직원 없음", "No agents assigned", "社員なし", "无分配员工")}
                  </span>
                </div>
              )}
            </RoomCard>
          );
        })}
      </div>

      {/* Break Room / Coffee Bar */}
      <RoomCard
        title={tr("휴게실 · 카페", "Break Room · Coffee Bar", "休憩室 · カフェ", "休息室 · 咖啡吧")}
        icon="☕"
        badge={breakAgents.length > 0 ? `${breakAgents.length} ${tr("명 휴식중", "on break", "名休憩中", "人休息中")}` : undefined}
        accentColor="#f97316"
      >
        {breakAgents.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {breakAgents.map((a) => (
              <AgentCircle
                key={a.id}
                agent={a}
                spriteMap={spriteMap}
                onClick={() => onSelectAgent(a)}
                size={40}
                showName
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-3 rounded-xl" style={{ background: "var(--th-bg-surface)" }}>
            <span className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
              {tr("모두 근무 중!", "Everyone is working!", "全員稼働中!", "所有人都在工作!")}
            </span>
          </div>
        )}
      </RoomCard>
    </div>
  );
}
