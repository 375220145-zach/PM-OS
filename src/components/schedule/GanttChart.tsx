'use client';

import { useRef, useState, useMemo } from 'react';
import type { Task, Milestone } from '@/types';
import { STATUS_COLORS } from '@/lib/utils';
import Button from '../shared/Button';

interface Props {
  tasks: Task[];
  milestones: Milestone[];
  onEdit?: (task: Task) => void;
}

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 40;
const LEFT_PANEL_WIDTH = 260;
const MILESTONE_SIZE = 10;

export default function GanttChart({ tasks, milestones, onEdit }: Props) {
  const [dayWidth, setDayWidth] = useState(20);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; task: Task } | null>(null);
  const [dateLineX, setDateLineX] = useState<number | null>(null);
  const [dateLineDate, setDateLineDate] = useState<string>('');
  const timelineRef = useRef<HTMLDivElement>(null);

  const { minDate, maxDate, totalDays, totalWidth } = useMemo(() => {
    if (tasks.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 30, totalWidth: 600 };

    const allDates = [...tasks.map(t => t.startDate), ...tasks.map(t => t.endDate), Date.now()];
    const min = new Date(Math.min(...allDates));
    const max = new Date(Math.max(...allDates));
    // Start from exactly the earliest task date
    min.setHours(0, 0, 0, 0);
    max.setDate(max.getDate() + 5);
    return {
      minDate: min,
      maxDate: max,
      totalDays: Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)),
      totalWidth: Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth,
    };
  }, [tasks, dayWidth]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        暂无任务数据，请先创建任务
      </div>
    );
  }

  function dateToX(date: number): number {
    return ((date - minDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;
  }

  function todayX(): number {
    return dateToX(Date.now());
  }

  function xToDate(x: number): Date {
    const d = new Date(minDate);
    d.setDate(d.getDate() + Math.round(x / dayWidth));
    return d;
  }

  function handleTimelineMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Snap: find nearest task bar edge
    let snapX: number | null = null;
    for (const t of sortedTasks) {
      for (const edge of [t.startDate, t.endDate]) {
        const ex = dateToX(edge);
        if (Math.abs(ex - x) < 6) { snapX = ex; break; }
      }
      if (snapX !== null) break;
    }
    const finalX = snapX ?? x;
    setDateLineX(finalX + LEFT_PANEL_WIDTH);
    const d = snapX !== null ? xToDate(snapX) : xToDate(x);
    setDateLineDate(`${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleDateString('zh-CN', { weekday: 'short' })}`);
  }
  function handleTimelineMouseLeave() { setDateLineX(null); setDateLineDate(''); }

  const actualTotalWidth = totalDays * dayWidth;
  const totalHeight = tasks.length * ROW_HEIGHT + HEADER_HEIGHT;
  const sortedTasks = [...tasks].sort((a, b) => a.startDate - b.startDate);

  // Build task row index map for dependency lines
  const taskRowMap = new Map<string, number>();
  sortedTasks.forEach((t, i) => taskRowMap.set(t.id, i));

  // Detect dependency conflicts: dependent task starts before predecessor ends
  const conflicts = useMemo(() => {
    const map = new Map<string, string[]>();
    sortedTasks.forEach(t => {
      if (!t.dependencies?.length) return;
      const bad = t.dependencies.filter(depId => {
        const dep = tasks.find(tt => tt.id === depId);
        return dep && t.startDate < dep.endDate;
      });
      if (bad.length) map.set(t.id, bad);
    });
    return map;
  }, [tasks, sortedTasks]);

  // Date marks every 7 days
  const dateMarks: { x: number; label: string }[] = [];
  const d = new Date(minDate);
  while (d <= maxDate) {
    dateMarks.push({ x: dateToX(d.getTime()), label: `${d.getMonth() + 1}/${d.getDate()}` });
    d.setDate(d.getDate() + 7);
  }

  const visibleMilestones = milestones.filter(m =>
    m.plannedDate >= minDate.getTime() && m.plannedDate <= maxDate.getTime()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">
          时间范围: {minDate.toLocaleDateString('zh-CN')} — {maxDate.toLocaleDateString('zh-CN')}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">视图:</span>
          <button
            onClick={() => setDayWidth(Math.max(8, dayWidth - 4))}
            className="px-2 py-0.5 text-xs bg-gray-100 rounded hover:bg-gray-200 text-gray-400"
          >-</button>
          <span className="text-xs text-gray-500 w-8 text-center">{dayWidth}px</span>
          <button
            onClick={() => setDayWidth(Math.min(60, dayWidth + 4))}
            className="px-2 py-0.5 text-xs bg-gray-100 rounded hover:bg-gray-200 text-gray-400"
          >+</button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-auto max-h-[600px]">
          <div style={{ width: actualTotalWidth + LEFT_PANEL_WIDTH, minWidth: '100%' }}>
            {/* Header */}
            <div className="flex border-b border-gray-200 sticky top-0 z-20 bg-white">
              <div className="sticky left-0 z-20 bg-white px-4 py-2 border-r border-gray-200" style={{ width: LEFT_PANEL_WIDTH }}>
                <span className="text-xs font-semibold text-gray-400">任务</span>
              </div>
              <div style={{ width: actualTotalWidth }} className="relative">
                {dateMarks.map((m, i) => (
                  <div key={i} className="absolute text-[10px] text-gray-500" style={{ left: m.x, top: 4 }}>
                    {m.label}
                  </div>
                ))}
                {/* Floating date label */}
                {dateLineX !== null && (
                  <div className="absolute z-20 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap"
                    style={{ left: dateLineX - LEFT_PANEL_WIDTH - 30, top: 20 }}>
                    {dateLineDate}
                  </div>
                )}
              </div>
            </div>

            {/* Task rows */}
            <div className="relative" style={{ minHeight: totalHeight }}>
              {sortedTasks.map((t, i) => (
                <div key={t.id} className="flex border-b border-gray-200" style={{ height: ROW_HEIGHT }}>
                  <div className="sticky left-0 z-10 bg-white px-4 py-1 border-r border-gray-200 flex items-center gap-2 overflow-hidden" style={{ width: LEFT_PANEL_WIDTH }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[t.status] }} />
                    <span className="text-xs text-gray-700 truncate cursor-pointer hover:text-gray-900" title={t.name}
                      onClick={() => onEdit?.(t)}>{t.name}</span>
                  </div>
                  <div ref={timelineRef} style={{ width: actualTotalWidth }} className="relative"
                    onMouseMove={handleTimelineMouseMove} onMouseLeave={handleTimelineMouseLeave}>
                    {/* Today line */}
                    <div className="absolute top-0 bottom-0 w-px bg-red-500/60 z-10" style={{ left: todayX() }} />

                    {/* Hover date line */}
                    {dateLineX !== null && (
                      <div className="absolute top-0 bottom-0 w-px bg-blue-400/60 z-10 pointer-events-none" style={{ left: dateLineX - LEFT_PANEL_WIDTH }} />
                    )}

                    {/* Task bar — click opens edit */}
                    <div
                      className={`absolute rounded-sm hover:brightness-125 transition-all cursor-pointer ${conflicts?.has(t.id) ? 'ring-2 ring-red-500/60' : ''}`}
                      style={{
                        left: dateToX(t.startDate),
                        width: Math.max(dateToX(t.endDate) - dateToX(t.startDate), 4),
                        top: 6,
                        height: ROW_HEIGHT - 12,
                        backgroundColor: STATUS_COLORS[t.status],
                        opacity: 0.85,
                      }}
                      onClick={() => onEdit?.(t)}
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTooltip({ x: rect.left, y: rect.top - 70, task: t });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] text-gray-900 truncate gap-1">
                        {conflicts?.has(t.id) && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"/></svg>}
                        {t.name} · {t.assignee} {t.priority !== 'P1' ? t.priority : ''}
                      </span>
                      {/* Start date label */}
                      <span className="absolute -left-20 top-0 text-[9px] text-gray-500 whitespace-nowrap">
                        {new Date(t.startDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                      </span>
                      {/* End date label */}
                      <span className="absolute -right-16 top-0 text-[9px] text-gray-500 whitespace-nowrap">
                        {new Date(t.endDate).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Milestones — aligned with nearest task row */}
              {visibleMilestones.map(m => {
                let bestRow = 0; let bestDist = Infinity;
                sortedTasks.forEach((t, i) => {
                  const dist = Math.abs(t.startDate - m.plannedDate);
                  if (dist < bestDist) { bestDist = dist; bestRow = i; }
                });
                const y = HEADER_HEIGHT + bestRow * ROW_HEIGHT + ROW_HEIGHT / 2 - MILESTONE_SIZE / 2;
                return (
                  <div key={m.id} className="absolute z-10" style={{
                    left: LEFT_PANEL_WIDTH + dateToX(m.plannedDate) - MILESTONE_SIZE / 2,
                    top: y,
                  }} title={`${m.name}\n${new Date(m.plannedDate).toLocaleDateString('zh-CN')}`}>
                    <svg width={MILESTONE_SIZE} height={MILESTONE_SIZE}>
                      <polygon
                        points={`${MILESTONE_SIZE / 2},0 ${MILESTONE_SIZE},${MILESTONE_SIZE / 2} ${MILESTONE_SIZE / 2},${MILESTONE_SIZE} 0,${MILESTONE_SIZE / 2}`}
                        fill={m.status === 'completed' ? '#22c55e' : m.status === 'delayed' ? '#ef4444' : '#6b7280'}
                      />
                    </svg>
                    <span className="absolute left-3 top-0 text-[9px] text-gray-500 whitespace-nowrap">{m.name}</span>
                  </div>
                );
              })}

              {/* Dependency lines SVG overlay */}
              <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: actualTotalWidth + LEFT_PANEL_WIDTH, height: totalHeight }} xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#6b7280" />
                  </marker>
                  <marker id="arrowhead-red" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="#ef4444" />
                  </marker>
                </defs>
                {sortedTasks.map(t => {
                  if (!t.dependencies || t.dependencies.length === 0) return null;
                  const targetRow = taskRowMap.get(t.id);
                  const tConflicts = conflicts?.get(t.id) || [];
                  return t.dependencies.map(depId => {
                    const sourceRow = taskRowMap.get(depId);
                    const sourceTask = tasks.find(st => st.id === depId);
                    if (sourceRow === undefined || targetRow === undefined || !sourceTask) return null;
                    const x1 = LEFT_PANEL_WIDTH + dateToX(sourceTask.endDate);
                    const y1 = HEADER_HEIGHT + sourceRow * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const x2 = LEFT_PANEL_WIDTH + dateToX(t.startDate);
                    const y2 = HEADER_HEIGHT + targetRow * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const midX = Math.max(x1, x2) + 10;
                    const isConflict = tConflicts.includes(depId);
                    return (
                      <path
                        key={`${depId}-${t.id}`}
                        d={`M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2 - 4},${y2}`}
                        stroke={isConflict ? '#ef4444' : '#6b7280'}
                        strokeWidth={isConflict ? 1.5 : 1}
                        strokeDasharray={isConflict ? '4 2' : 'none'}
                        fill="none"
                        markerEnd={isConflict ? 'url(#arrowhead-red)' : 'url(#arrowhead)'}
                      />
                    );
                  });
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 shadow-xl pointer-events-none" style={{ left: Math.min(tooltip.x, window.innerWidth - 220), top: tooltip.y }}>
          <div className="text-sm font-semibold text-gray-900">{tooltip.task.name}</div>
          <div className="text-xs text-gray-500 mt-1">
            {tooltip.task.assignee} · {tooltip.task.priority}
            {tooltip.task.risk !== 'none' && ` · 风险: ${tooltip.task.risk}`}
          </div>
          {conflicts?.has(tooltip.task.id) && (
            <div className="text-xs text-red-600 mt-1.5">前置任务未完成，已标记冲突</div>
          )}
        </div>
      )}
    </div>
  );
}
