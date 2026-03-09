import { useState, useCallback } from "react";
import type { Department, Agent, Task, CompanySettings } from "../types";
import { useI18n, localeName } from "../i18n";

type View = "office" | "agents" | "dashboard" | "tasks" | "skills" | "settings";

interface SidebarProps {
  currentView: View;
  onChangeView: (v: View) => void;
  departments: Department[];
  agents: Agent[];
  tasks: Task[];
  settings: CompanySettings;
  connected: boolean;
}

const NAV_ITEMS: { view: View; icon: string; sprite?: string }[] = [
  { view: "office", icon: "🏢" },
  { view: "agents", icon: "👥", sprite: "/sprites/3-D-1.png" },
  { view: "skills", icon: "📚" },
  { view: "dashboard", icon: "📊" },
  { view: "tasks", icon: "📋" },
  { view: "settings", icon: "⚙️" },
];

/* ── Department Status with dropdown per department ── */
function DepartmentStatus({
  departments,
  agents,
  locale,
  tr,
}: {
  departments: Department[];
  agents: Agent[];
  locale: string;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
}) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="px-3 py-2" style={{ borderTop: "1px solid var(--th-border)" }}>
      <div
        className="text-[10px] uppercase font-semibold mb-1.5 tracking-wider"
        style={{ color: "var(--th-text-muted)" }}
      >
        {tr("부서 현황", "Department Status", "部門状況", "部门状态")}
      </div>
      {departments.map((d) => {
        const deptAgents = agents.filter((a) => a.department_id === d.id);
        const working = deptAgents.filter((a) => a.status === "working").length;
        const expanded = expandedDepts.has(d.id);
        return (
          <div key={d.id}>
            <button
              type="button"
              onClick={() => toggle(d.id)}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs w-full hover:bg-[var(--th-bg-surface-hover)] transition-colors"
              style={{ color: "var(--th-text-secondary)" }}
            >
              <span className={`text-[8px] transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
              <span>{d.icon}</span>
              <span className="flex-1 truncate text-left">{localeName(locale, d)}</span>
              <span className={working > 0 ? "text-blue-400 font-medium" : ""}>{working}/{deptAgents.length}</span>
            </button>
            {expanded && deptAgents.length > 0 && (
              <div className="ml-5 mb-1">
                {deptAgents.map((a) => {
                  const isOnline = a.status === "working" || a.status === "meeting";
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-1.5 px-1.5 py-0.5 text-[11px] rounded"
                      style={{ color: "var(--th-text-secondary)" }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? "bg-green-500" : "bg-red-400"}`} />
                      <span className="truncate">{localeName(locale, a)}</span>
                      <span className="ml-auto text-[9px] opacity-60">{a.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Sidebar({ currentView, onChangeView, departments, agents, tasks, settings, connected }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { t, locale } = useI18n();
  const workingCount = agents.filter((a) => a.status === "working").length;
  const totalAgents = agents.length;
  const inProgress = tasks.filter((tk) => tk.status === "in_progress").length;
  const doneCount = tasks.filter((tk) => tk.status === "done").length;

  const tr = (ko: string, en: string, ja = en, zh = en) => t({ ko, en, ja, zh });

  const navLabels: Record<View, string> = {
    office: tr("오피스", "Office", "オフィス", "办公室"),
    agents: tr("직원관리", "Agents", "社員管理", "员工管理"),
    skills: tr("문서고", "Library", "ライブラリ", "文档库"),
    dashboard: tr("대시보드", "Dashboard", "ダッシュボード", "仪表盘"),
    tasks: tr("업무 관리", "Tasks", "タスク管理", "任务管理"),
    settings: tr("설정", "Settings", "設定", "设置"),
  };

  return (
    <aside
      className={`flex h-full flex-col backdrop-blur-sm transition-all duration-300 ${collapsed ? "w-16" : "w-48"}`}
      style={{ background: "var(--th-bg-sidebar)", borderRight: "1px solid var(--th-border)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-3 py-4"
        style={{ borderBottom: "1px solid var(--th-border)", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.06)" }}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 relative overflow-visible">
            <img
              src="/sprites/ceo-lobster.png"
              alt={tr("CEO", "CEO")}
              className="w-8 h-8 object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[10px] leading-none drop-shadow">👑</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold truncate" style={{ color: "var(--th-text-heading)" }}>
                {settings.companyName}
              </div>
              <div className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>
                👑 {settings.ceoName}
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            onClick={() => onChangeView(item.view)}
            className={`sidebar-nav-item ${
              currentView === item.view ? "active font-semibold shadow-sm shadow-blue-500/10" : ""
            }`}
          >
            <span className="text-base shrink-0">
              {item.sprite ? (
                <img
                  src={item.sprite}
                  alt=""
                  className="w-5 h-5 object-cover rounded-full"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                item.icon
              )}
            </span>
            {!collapsed && <span>{navLabels[item.view]}</span>}
          </button>
        ))}
      </nav>

      {/* Quick stats */}
      {!collapsed && (
        <div className="px-3 py-2 grid grid-cols-2 gap-1.5" style={{ borderTop: "1px solid var(--th-border)" }}>
          {([
            { icon: "🤖", label: tr("직원", "Staff", "社員", "员工"), val: `${totalAgents}` },
            { icon: "⚡", label: tr("작업중", "Working", "稼働中", "工作中"), val: `${workingCount}`, highlight: workingCount > 0 },
            { icon: "📋", label: tr("진행", "In Progress", "進行中", "进行中"), val: `${inProgress}`, highlight: inProgress > 0 },
            { icon: "✅", label: tr("완료", "Done", "完了", "完成"), val: `${doneCount}/${tasks.length}` },
          ] as const).map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1"
              style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}
            >
              <span className="text-xs">{s.icon}</span>
              <div className="min-w-0">
                <div className="text-[8px] leading-tight truncate" style={{ color: "var(--th-text-muted)" }}>{s.label}</div>
                <div
                  className={`text-xs font-bold leading-tight ${s.highlight ? "text-blue-400" : ""}`}
                  style={s.highlight ? undefined : { color: "var(--th-text-secondary)" }}
                >
                  {s.val}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Department status */}
      {!collapsed && (
        <DepartmentStatus departments={departments} agents={agents} locale={locale} tr={tr} />
      )}

      {/* Status bar */}
      <div className="px-3 py-2.5" style={{ borderTop: "1px solid var(--th-border)" }}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          {!collapsed && (
            <div className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>
              {connected
                ? tr("연결됨", "Connected", "接続中", "已连接")
                : tr("연결 끊김", "Disconnected", "接続なし", "已断开")}{" "}
              · {workingCount}/{totalAgents} {tr("근무중", "working", "稼働中", "工作中")}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
