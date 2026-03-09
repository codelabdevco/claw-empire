import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

type DeptTheme = { floor1: number; floor2: number; wall: number; accent: number };

export interface OfficeRoomManagerProps {
  departments: Array<{ id: string; name: string }>;
  customThemes: Record<string, DeptTheme>;
  onThemeChange: (themes: Record<string, DeptTheme>) => void;
  onActiveDeptChange?: (deptId: string | null) => void;
  onClose: () => void;
  language: "ko" | "en" | "ja" | "zh";
  agents?: Array<{ id: string; department_id: string; status: string }>;
}

/* ================================================================== */
/*  Constants                                                           */
/* ================================================================== */

const DEFAULT_THEMES: Record<string, DeptTheme> = {
  dev: { floor1: 0xd8e8f5, floor2: 0xcce1f2, wall: 0x6c96b7, accent: 0x5a9fd4 },
  design: { floor1: 0xe8def2, floor2: 0xe1d4ee, wall: 0x9378ad, accent: 0x9a6fc4 },
  planning: { floor1: 0xf0e1c5, floor2: 0xeddaba, wall: 0xae9871, accent: 0xd4a85a },
  operations: { floor1: 0xd0eede, floor2: 0xc4ead5, wall: 0x6eaa89, accent: 0x5ac48a },
  qa: { floor1: 0xf0cbcb, floor2: 0xedc0c0, wall: 0xae7979, accent: 0xd46a6a },
  devsecops: { floor1: 0xf0d5c5, floor2: 0xedcdba, wall: 0xae8871, accent: 0xd4885a },
  ceoOffice: { floor1: 0xe5d9b9, floor2: 0xdfd0a8, wall: 0x998243, accent: 0xa77d0c },
  meetingRoom: { floor1: 0xd4e6e8, floor2: 0xc8dfe2, wall: 0x6a9ca0, accent: 0x4a8a90 },
  breakRoom: { floor1: 0xf7e2b7, floor2: 0xf6dead, wall: 0xa99c83, accent: 0xf0c878 },
};

const DEFAULT_TONE = 50;

/** IDs that represent special rooms (not real departments). */
const SPECIAL_ROOM_IDS = new Set(["ceoOffice", "meetingRoom", "breakRoom"]);

/** Known department-slug → theme mapping. Only these are rendered as dept cards. */
const KNOWN_DEPT_SLUGS = new Set(["dev", "design", "planning", "operations", "qa", "devsecops"]);

const labels: Record<string, Record<string, string>> = {
  title: { ko: "사무실 관리", en: "Office Manager", ja: "オフィス管理", zh: "办公室管理" },
  accent: { ko: "메인 색상", en: "Main Color", ja: "メインカラー", zh: "主色调" },
  tone: { ko: "톤 (밝기)", en: "Tone (Brightness)", ja: "トーン（明るさ）", zh: "色调（亮度）" },
  reset: { ko: "초기화", en: "Reset", ja: "リセット", zh: "重置" },
  resetAll: { ko: "전체 초기화", en: "Reset All", ja: "全てリセット", zh: "全部重置" },
  close: { ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" },
  presets: { ko: "프리셋", en: "Presets", ja: "プリセット", zh: "预设" },
  specialRooms: { ko: "특별 공간", en: "Special Rooms", ja: "特別ルーム", zh: "特殊房间" },
  deptStatus: { ko: "부서 현황", en: "Department Status", ja: "部署状況", zh: "部门状态" },
};

/* ================================================================== */
/*  Color helpers                                                       */
/* ================================================================== */

function numToHex(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}

function hexToNum(h: string): number {
  return parseInt(h.replace("#", ""), 16);
}

function blendColor(from: number, to: number, t: number): number {
  const c = Math.max(0, Math.min(1, t));
  const fr = (from >> 16) & 0xff,
    fg = (from >> 8) & 0xff,
    fb = from & 0xff;
  const tr = (to >> 16) & 0xff,
    tg = (to >> 8) & 0xff,
    tb = to & 0xff;
  return (
    (Math.round(fr + (tr - fr) * c) << 16) | (Math.round(fg + (tg - fg) * c) << 8) | Math.round(fb + (tb - fb) * c)
  );
}

const TONE_PRESET_STEPS = [15, 25, 35, 45, 55, 65, 75, 85] as const;

function generateTonePresets(accent: number): Array<{ tone: number; swatch: number }> {
  return TONE_PRESET_STEPS.map((tone) => ({
    tone,
    swatch: deriveTheme(accent, tone).wall,
  }));
}

function deriveTheme(accent: number, tone: number): DeptTheme {
  const t = tone / 100;
  return {
    accent,
    floor1: blendColor(accent, 0xffffff, 0.85 - t * 0.004 * 100),
    floor2: blendColor(accent, 0xffffff, 0.78 - t * 0.004 * 100),
    wall: blendColor(accent, 0x888888, 0.3 + t * 0.004 * 100),
  };
}

/* Reverse-infer a tone value from an existing theme (best-effort, default 50) */
function inferTone(theme: DeptTheme): number {
  // We try to infer from floor1 blend ratio: floor1 = blend(accent, white, 0.85 - tone*0.4)
  // ratio r = (0.85 - tone*0.4) => tone = (0.85 - r) / 0.4
  const ar = (theme.accent >> 16) & 0xff;
  const af = (theme.floor1 >> 16) & 0xff;
  if (ar === 0xff) return DEFAULT_TONE; // avoid degenerate
  const r = (af - ar) / (0xff - ar);
  const tone = Math.round(((0.85 - r) / 0.4) * 100);
  return Math.max(0, Math.min(100, isNaN(tone) ? DEFAULT_TONE : tone));
}

/* ================================================================== */
/*  Per-department state                                                */
/* ================================================================== */

interface DeptState {
  accent: number;
  tone: number;
}

function initDeptState(deptId: string, customThemes: Record<string, DeptTheme>): DeptState {
  const theme = customThemes[deptId] ?? DEFAULT_THEMES[deptId];
  if (!theme) return { accent: 0x5a9fd4, tone: DEFAULT_TONE };
  return { accent: theme.accent, tone: inferTone(theme) };
}

/* ================================================================== */
/*  Sub-component: DeptCard                                             */
/* ================================================================== */

/* ── Chevron icon ── */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* ── Color preview bar (compact, reusable) ── */
function ColorBar({ theme, small }: { theme: DeptTheme; small?: boolean }) {
  const h = small ? "h-3" : "h-5";
  return (
    <div className={`flex gap-px ${h} rounded overflow-hidden`}>
      <div className="flex-1" style={{ backgroundColor: numToHex(theme.floor1) }} />
      <div className="flex-1" style={{ backgroundColor: numToHex(theme.floor2) }} />
      <div className="flex-1" style={{ backgroundColor: numToHex(theme.wall) }} />
      <div className="w-5 flex-none" style={{ backgroundColor: numToHex(theme.accent) }} />
    </div>
  );
}

interface DeptCardProps {
  deptId: string;
  deptName: string;
  state: DeptState;
  language: "ko" | "en" | "ja" | "zh";
  expanded: boolean;
  onToggle: () => void;
  onActivate: () => void;
  onAccentChange: (accent: number) => void;
  onToneChange: (tone: number) => void;
  onReset: () => void;
  /** Optional status badge shown in collapsed row */
  statusBadge?: ReactNode;
}

function DeptCard({
  deptName,
  state,
  language,
  expanded,
  onToggle,
  onActivate,
  onAccentChange,
  onToneChange,
  onReset,
  statusBadge,
}: DeptCardProps) {
  const theme = deriveTheme(state.accent, state.tone);
  const presets = generateTonePresets(state.accent);

  return (
    <div className="bg-slate-800/70 border border-slate-700/60 rounded-lg overflow-hidden">
      {/* ── Collapsed header row (always visible) ── */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-700/40 transition-colors"
      >
        <ChevronIcon open={expanded} />
        <span className="text-sm font-medium text-slate-100 flex-1 text-left truncate">{deptName}</span>
        {statusBadge}
        <div className="w-20 shrink-0">
          <ColorBar theme={theme} small />
        </div>
      </button>

      {/* ── Expanded editor panel ── */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-slate-700/40">
          {/* Full color preview */}
          <ColorBar theme={theme} />

          {/* Presets row */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0">
              {labels.presets[language]}
            </span>
            <div className="flex gap-1 flex-wrap">
              {presets.map((preset) => (
                <button
                  key={preset.tone}
                  onClick={() => {
                    onActivate();
                    onToneChange(preset.tone);
                  }}
                  title={`Tone ${preset.tone}`}
                  className="w-4 h-4 rounded-full border-[1.5px] transition-transform hover:scale-125 focus:outline-none"
                  style={{
                    backgroundColor: numToHex(preset.swatch),
                    borderColor: Math.abs(state.tone - preset.tone) <= 2 ? "#fff" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Accent picker + Tone slider (compact row) */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={numToHex(state.accent)}
              onChange={(e) => {
                onActivate();
                onAccentChange(hexToNum(e.target.value));
              }}
              onInput={(e) => {
                onActivate();
                onAccentChange(hexToNum((e.target as HTMLInputElement).value));
              }}
              className="w-7 h-7 rounded cursor-pointer border border-slate-600 bg-transparent p-0 shrink-0"
            />
            <span className="text-[10px] text-slate-500 font-mono shrink-0">{numToHex(state.accent)}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={state.tone}
              onChange={(e) => {
                onActivate();
                onToneChange(Number(e.target.value));
              }}
              onInput={(e) => {
                onActivate();
                onToneChange(Number((e.target as HTMLInputElement).value));
              }}
              className="flex-1 accent-slate-400 h-1 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 tabular-nums w-5 text-right">{state.tone}</span>
          </div>

          {/* Reset button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                onActivate();
                onReset();
              }}
              className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded border border-slate-700 hover:border-slate-500 transition-colors"
            >
              {labels.reset[language]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main component                                                      */
/* ================================================================== */

export default function OfficeRoomManager({
  departments,
  customThemes,
  onThemeChange,
  onActiveDeptChange,
  onClose,
  language,
  agents,
}: OfficeRoomManagerProps) {
  const [deptStates, setDeptStates] = useState<Record<string, DeptState>>(() => {
    const result: Record<string, DeptState> = {};
    for (const dept of departments) {
      result[dept.id] = initDeptState(dept.id, customThemes);
    }
    return result;
  });

  /** Track which card is expanded (accordion – only one at a time) */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleCard = useCallback((id: string) => setExpandedId((prev) => (prev === id ? null : id)), []);

  /* Stable ref for onThemeChange to avoid infinite effect loops */
  const onThemeChangeRef = useRef(onThemeChange);
  onThemeChangeRef.current = onThemeChange;
  const isFirstRender = useRef(true);

  /* Emit derived themes to parent whenever deptStates changes (skip initial mount) */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const themes: Record<string, DeptTheme> = {};
    for (const [id, s] of Object.entries(deptStates)) {
      themes[id] = deriveTheme(s.accent, s.tone);
    }
    onThemeChangeRef.current(themes);
  }, [deptStates]);

  const updateDept = useCallback(
    (deptId: string, patch: Partial<DeptState>) => {
      setDeptStates((prev) => ({ ...prev, [deptId]: { ...prev[deptId], ...patch } }));
    },
    [],
  );

  const resetDept = useCallback((deptId: string) => {
    const def = DEFAULT_THEMES[deptId];
    if (!def) return;
    setDeptStates((prev) => ({ ...prev, [deptId]: { accent: def.accent, tone: inferTone(def) } }));
  }, []);

  const resetAll = useCallback(() => {
    setDeptStates((prev) => {
      const next: Record<string, DeptState> = {};
      for (const key of Object.keys(prev)) {
        const def = DEFAULT_THEMES[key];
        next[key] = def ? { accent: def.accent, tone: inferTone(def) } : { accent: 0x5a9fd4, tone: DEFAULT_TONE };
      }
      return next;
    });
  }, []);

  const activateDept = useCallback(
    (deptId: string) => {
      onActiveDeptChange?.(deptId);
    },
    [onActiveDeptChange],
  );

  useEffect(() => () => onActiveDeptChange?.(null), [onActiveDeptChange]);

  /* Split departments into real office depts vs special rooms */
  const officeDepts = useMemo(
    () => departments.filter((d) => KNOWN_DEPT_SLUGS.has(d.id)),
    [departments],
  );
  const specialRooms = useMemo(
    () => departments.filter((d) => SPECIAL_ROOM_IDS.has(d.id)),
    [departments],
  );

  /* Department status: compute working / total per department */
  const deptStatusMap = useMemo(() => {
    if (!agents || agents.length === 0) return null;
    const map: Record<string, { total: number; working: number }> = {};
    for (const agent of agents) {
      const deptId = agent.department_id;
      if (!deptId) continue;
      if (!map[deptId]) map[deptId] = { total: 0, working: 0 };
      map[deptId].total += 1;
      if (agent.status === "working") map[deptId].working += 1;
    }
    return map;
  }, [agents]);

  /** Small inline status badge for collapsed card rows */
  const statusBadge = useCallback(
    (deptId: string) => {
      if (!deptStatusMap) return undefined;
      const stat = deptStatusMap[deptId];
      if (!stat) return undefined;
      return (
        <span className="text-[10px] font-mono tabular-nums shrink-0 text-slate-500">
          <span className={stat.working > 0 ? "text-emerald-400" : ""}>{stat.working}</span>/{stat.total}
        </span>
      );
    },
    [deptStatusMap],
  );

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      style={{ backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div className="w-full md:max-w-sm bg-slate-900 flex flex-col h-full shadow-2xl border-l border-slate-700/80">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80 shrink-0">
          <h2 className="text-sm font-semibold text-slate-100">{labels.title[language]}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors w-7 h-7 flex items-center justify-center rounded hover:bg-slate-700"
            aria-label={labels.close[language]}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {/* ── Department Cards (accordion) ── */}
          {officeDepts.map((dept) => {
            const state = deptStates[dept.id] ?? { accent: 0x5a9fd4, tone: DEFAULT_TONE };
            return (
              <DeptCard
                key={dept.id}
                deptId={dept.id}
                deptName={dept.name}
                state={state}
                language={language}
                expanded={expandedId === dept.id}
                onToggle={() => toggleCard(dept.id)}
                onActivate={() => activateDept(dept.id)}
                onAccentChange={(accent) => updateDept(dept.id, { accent })}
                onToneChange={(tone) => updateDept(dept.id, { tone })}
                onReset={() => resetDept(dept.id)}
                statusBadge={statusBadge(dept.id)}
              />
            );
          })}

          {/* ── Special Rooms ── */}
          {specialRooms.length > 0 && (
            <>
              <div className="pt-1.5">
                <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 pb-1 border-t border-slate-700/50 pt-2">
                  {labels.specialRooms[language]}
                </h3>
              </div>
              {specialRooms.map((room) => {
                const state = deptStates[room.id] ?? { accent: 0x5a9fd4, tone: DEFAULT_TONE };
                return (
                  <DeptCard
                    key={room.id}
                    deptId={room.id}
                    deptName={room.name}
                    state={state}
                    language={language}
                    expanded={expandedId === room.id}
                    onToggle={() => toggleCard(room.id)}
                    onActivate={() => activateDept(room.id)}
                    onAccentChange={(accent) => updateDept(room.id, { accent })}
                    onToneChange={(tone) => updateDept(room.id, { tone })}
                    onReset={() => resetDept(room.id)}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2.5 border-t border-slate-700/80 shrink-0 flex gap-2">
          <button
            onClick={resetAll}
            className="flex-1 py-1.5 rounded-md text-xs font-medium bg-slate-700/80 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            {labels.resetAll[language]}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-1.5 rounded-md text-xs font-medium bg-slate-600/80 text-slate-200 hover:bg-slate-500 transition-colors"
          >
            {labels.close[language]}
          </button>
        </div>
      </div>
    </div>
  );
}
