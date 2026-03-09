import { useMemo } from "react";
import type { Agent, Department, Task, MeetingPresence, SubAgent, CrossDeptDelivery, CeoOfficeCall } from "../types";
import { useI18n, localeName } from "../i18n";
import AgentAvatar, { useSpriteMap } from "./AgentAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

/* ── Agent avatar button ── */
function AgentChip({
  agent,
  spriteMap,
  onClick,
  size = 34,
  unread,
}: {
  agent: Agent;
  spriteMap: Map<string, number>;
  onClick: () => void;
  size?: number;
  unread?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 h-auto p-1 hover:bg-accent/50"
      title={agent.name}
    >
      <div className="relative">
        <AgentAvatar agent={agent} spriteMap={spriteMap} size={size} rounded="full" />
        <span
          className={cn(
            "absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full border-2",
            DOT[agent.status ?? "idle"],
          )}
          style={{ borderColor: "var(--card)" }}
        />
        {unread && (
          <span
            className="absolute -top-px -right-px w-2.5 h-2.5 rounded-full bg-red-500 border-2 animate-pulse"
            style={{ borderColor: "var(--card)" }}
          />
        )}
      </div>
      <span className="text-[9px] truncate max-w-[48px] leading-none text-muted-foreground font-normal">
        {agent.name}
      </span>
    </Button>
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
      {/* Status summary */}
      <div className="flex items-center gap-4 px-1">
        <Badge variant="outline" className="gap-1.5 font-normal text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          {working} {tr("작업중", "working")}
        </Badge>
        <Badge variant="outline" className="gap-1.5 font-normal text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {idle} {tr("대기", "idle")}
        </Badge>
        <Badge variant="outline" className="gap-1.5 font-normal text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          {onBreak} {tr("휴식", "break")}
        </Badge>
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {agents.length} {tr("명", "total")}
        </span>
      </div>

      <Separator />

      {/* CEO + Meeting */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <img src="/sprites/ceo-lobster.png" alt="CEO" className="w-7 h-7 object-contain" style={{ imageRendering: "pixelated" }} />
              </div>
              <span className="text-xs font-semibold text-foreground">👑 CEO</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs">🎯 {tr("회의실", "Meeting")}</CardTitle>
              {meetingAgents.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{meetingAgents.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {meetingAgents.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {meetingAgents.map((a) => (
                  <AgentChip key={a.id} agent={{ ...a, status: "working" as const }} spriteMap={spriteMap} onClick={() => onSelectAgent(a)} size={32} unread={unreadAgentIds?.has(a.id)} />
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Departments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sortedDepts.map((dept) => {
          const da = deptAgents.get(dept.id) ?? [];
          const wc = da.filter((a) => a.status === "working").length;
          return (
            <Card key={dept.id}>
              <CardHeader className="p-3 pb-1.5">
                <Button
                  variant="ghost"
                  onClick={() => onSelectDepartment(dept)}
                  className="flex items-center gap-1.5 h-auto p-0 hover:bg-transparent hover:opacity-80 w-full justify-start"
                >
                  <span className="text-sm">{dept.icon}</span>
                  <CardTitle className="text-xs">{localeName(locale, dept)}</CardTitle>
                  <Badge variant="outline" className="ml-auto text-[10px] h-4 px-1.5 tabular-nums font-normal">
                    {wc}/{da.length}
                  </Badge>
                </Button>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {da.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {da.map((a) => (
                      <AgentChip key={a.id} agent={a} spriteMap={spriteMap} onClick={() => onSelectAgent(a)} size={34} unread={unreadAgentIds?.has(a.id)} />
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Break room — only when occupied */}
      {breakAgents.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs">☕ {tr("휴게실", "Break Room")}</CardTitle>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{breakAgents.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex flex-wrap gap-1">
              {breakAgents.map((a) => (
                <AgentChip key={a.id} agent={a} spriteMap={spriteMap} onClick={() => onSelectAgent(a)} size={34} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
