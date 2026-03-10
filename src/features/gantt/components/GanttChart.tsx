import { ChangeEvent, MouseEvent, useEffect, useMemo, useState } from 'react';
import { Task, TaskStatus } from '../../../domain/task/types';
import { addTask } from '../../../store/actions/taskCrud';
import { GanttContextMenu } from './GanttContextMenu';
import { GanttRowTree } from './GanttRowTree';
import { createTaskFromRightClick } from '../interactions/rightClickCreate';
import { calculateGanttLayout, getDateOffsetDays } from '../lib/ganttLayout';

interface GanttChartProps {
  tasks: Task[];
}

interface ContextMenuState {
  x: number;
  y: number;
  clickedDate: Date;
  parentTaskId?: string;
}

interface MonthSpan {
  key: string;
  label: string;
  startIndex: number;
  span: number;
}

interface ViewRangeOption {
  id: string;
  label: string;
  days: number;
}

const BAR_COLORS: Record<TaskStatus, string> = {
  todo: '#94a3b8',
  inProgress: '#3b82f6',
  review: '#f59e0b',
  done: '#22c55e',
};

const LEFT_COLUMN_WIDTH = 260;
const DAY_COLUMN_WIDTH = 48;
const VIEW_RANGE_OPTIONS: ViewRangeOption[] = [
  { id: '14d', label: '2週間', days: 14 },
  { id: '1m', label: '1ヶ月', days: 31 },
  { id: '2m', label: '2ヶ月', days: 62 },
  { id: '3m', label: '3ヶ月', days: 93 },
];

const PARENT_BAR_HEIGHT = 34;
const CHILD_BAR_HEIGHT = 28;
const DESCENDANT_BAR_HEIGHT = 22;

function getBarHeight(depth: number): number {
  if (depth <= 0) return PARENT_BAR_HEIGHT;
  if (depth === 1) return CHILD_BAR_HEIGHT;
  return DESCENDANT_BAR_HEIGHT;
}

function getBarOpacity(depth: number): number {
  if (depth <= 0) return 0.95;
  if (depth === 1) return 0.85;
  return 0.75;
}

function formatLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(baseDate: Date, offset: number): Date {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + offset);
  return next;
}

function buildMonthSpans(startDate: Date, totalDays: number): MonthSpan[] {
  const spans: MonthSpan[] = [];

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const date = addDays(startDate, dayIndex);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const latest = spans[spans.length - 1];

    if (latest && latest.key === key) {
      latest.span += 1;
      continue;
    }

    spans.push({ key, label, startIndex: dayIndex, span: 1 });
  }

  return spans;
}

function clamp(number: number, min: number, max: number): number {
  return Math.min(Math.max(number, min), max);
}

export function GanttChart({ tasks }: GanttChartProps) {
  const layout = useMemo(() => calculateGanttLayout(tasks), [tasks]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedRangeId, setSelectedRangeId] = useState<string>('1m');
  const [selectedStartDate, setSelectedStartDate] = useState<string>('');

  const selectedOption = VIEW_RANGE_OPTIONS.find((item) => item.id === selectedRangeId) ?? VIEW_RANGE_OPTIONS[1];
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.taskId, task])), [tasks]);
  const parentTaskIdSet = useMemo(() => new Set(tasks.flatMap((task) => (task.parentTaskId ? [task.parentTaskId] : []))), [tasks]);

  useEffect(() => {
    if (!layout) return;

    if (!selectedStartDate) {
      setSelectedStartDate(formatLabel(layout.minStart));
    }
  }, [layout, selectedStartDate]);

  if (!layout) {
    return (
      <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
        <h2 style={{ margin: '0 0 8px' }}>ガントチャート</h2>
        <p style={{ margin: 0, color: '#64748b' }}>表示可能なタスクがありません。startDate/endDate を確認してください。</p>
      </section>
    );
  }

  const currentLayout = layout;
  const selectedStartTimestamp = Date.parse(selectedStartDate);
  const viewStart = Number.isNaN(selectedStartTimestamp) ? currentLayout.minStart : new Date(selectedStartTimestamp);
  const visibleDays = Math.min(selectedOption.days, currentLayout.totalDays);
  const viewEnd = addDays(viewStart, visibleDays - 1);
  const timelineWidth = visibleDays * DAY_COLUMN_WIDTH;
  const dayDates = Array.from({ length: visibleDays }, (_, index) => addDays(viewStart, index));
  const monthSpans = buildMonthSpans(viewStart, visibleDays);

  function handleRangeChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedRangeId(event.target.value);
  }

  function handleStartDateChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedStartDate(event.target.value);
  }

  function handleRowContextMenu(event: MouseEvent<HTMLDivElement>, parentTaskId?: string) {
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const safeWidth = rect.width || 1;
    const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), safeWidth);
    const clickedOffsetDays = Math.floor((relativeX / safeWidth) * visibleDays);
    const clickedDate = addDays(viewStart, clickedOffsetDays);

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      clickedDate,
      parentTaskId,
    });
  }

  function handleCreateTask() {
    if (!contextMenu) return;

    addTask(
      createTaskFromRightClick({
        clickedDate: contextMenu.clickedDate,
        parentTaskId: contextMenu.parentTaskId,
        tasks,
      }),
    );
    setContextMenu(null);
  }

  return (
    <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
      <h2 style={{ margin: '0 0 8px' }}>ガントチャート</h2>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            表示開始日:
            <input type="date" value={selectedStartDate} onChange={handleStartDateChange} />
          </label>
          <p style={{ margin: 0, color: '#475569' }}>
            表示期間: {formatLabel(viewStart)} 〜 {formatLabel(viewEnd)}
          </p>
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          期間:
          <select value={selectedRangeId} onChange={handleRangeChange}>
            {VIEW_RANGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `${LEFT_COLUMN_WIDTH}px minmax(0, 1fr)` }}>
          <div>
            <div style={{ padding: '8px 10px', fontWeight: 600, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>タスク</div>
            {currentLayout.rows.map(({ task, depth }) => (
              <div
                key={`${task.taskId}-left`}
                onContextMenu={(event) => handleRowContextMenu(event, task.taskId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 46,
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <GanttRowTree taskName={task.taskName} depth={depth} />
              </div>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ width: timelineWidth }}>
              <div style={{ borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleDays}, ${DAY_COLUMN_WIDTH}px)`, background: '#f8fafc' }}>
                  {monthSpans.map((month) => (
                    <div
                      key={month.key}
                      style={{
                        gridColumn: `${month.startIndex + 1} / span ${month.span}`,
                        textAlign: 'center',
                        fontWeight: 600,
                        padding: '8px 0 6px',
                        borderLeft: '1px solid #e2e8f0',
                      }}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleDays}, ${DAY_COLUMN_WIDTH}px)`, borderTop: '1px solid #e2e8f0' }}>
                  {dayDates.map((date, index) => (
                    <div key={index} style={{ textAlign: 'center', padding: '6px 0', borderLeft: '1px solid #e2e8f0', fontSize: 12 }}>
                      {date.getDate()}
                    </div>
                  ))}
                </div>
              </div>

              {currentLayout.rows.map(({ task, start, end, depth }) => {
                const startOffsetDays = getDateOffsetDays(viewStart, start);
                const endOffsetDays = getDateOffsetDays(viewStart, end);

                const visibleStartDay = clamp(startOffsetDays, 0, visibleDays);
                const visibleEndDay = clamp(endOffsetDays + 1, 0, visibleDays);
                const visibleDurationDays = Math.max(visibleEndDay - visibleStartDay, 0);

                const ancestorHighlights: Array<{ left: number; width: number; color: string }> = [];

                if (parentTaskIdSet.has(task.taskId)) {
                  if (visibleDurationDays > 0) {
                    ancestorHighlights.push({
                      left: visibleStartDay * DAY_COLUMN_WIDTH,
                      width: visibleDurationDays * DAY_COLUMN_WIDTH,
                      color: BAR_COLORS[task.status],
                    });
                  }
                }

                let currentParentId = task.parentTaskId;
                while (currentParentId) {
                  const parentTask = taskById.get(currentParentId);
                  if (!parentTask) break;

                  const parentStart = new Date(parentTask.startDate);
                  const parentEnd = new Date(parentTask.endDate);
                  if (!Number.isNaN(parentStart.getTime()) && !Number.isNaN(parentEnd.getTime()) && parentEnd >= parentStart) {
                    const parentStartDay = clamp(getDateOffsetDays(viewStart, parentStart), 0, visibleDays);
                    const parentEndDay = clamp(getDateOffsetDays(viewStart, parentEnd) + 1, 0, visibleDays);
                    const parentDuration = Math.max(parentEndDay - parentStartDay, 0);

                    if (parentDuration > 0) {
                      ancestorHighlights.push({
                        left: parentStartDay * DAY_COLUMN_WIDTH,
                        width: parentDuration * DAY_COLUMN_WIDTH,
                        color: BAR_COLORS[parentTask.status],
                      });
                    }
                  }

                  currentParentId = parentTask.parentTaskId;
                }

                return (
                  <div
                    key={`${task.taskId}-right`}
                    onContextMenu={(event) => handleRowContextMenu(event, task.taskId)}
                    style={{
                      position: 'relative',
                      height: 46,
                      borderTop: '1px solid #f1f5f9',
                      backgroundImage: `repeating-linear-gradient(to right, #e2e8f0, #e2e8f0 1px, transparent 1px, transparent ${DAY_COLUMN_WIDTH}px)`,
                    }}
                  >
                    {ancestorHighlights.map((highlight, index) => (
                      <div
                        key={`${task.taskId}-ancestor-${index}`}
                        style={{
                          position: 'absolute',
                          left: highlight.left,
                          width: highlight.width,
                          top: 0,
                          bottom: 0,
                          background: highlight.color,
                          opacity: 0.13,
                        }}
                      />
                    ))}
                    {visibleDurationDays > 0 && (
                      <div
                        title={`${task.startDate} - ${task.endDate}`}
                        style={{
                          position: 'absolute',
                          left: visibleStartDay * DAY_COLUMN_WIDTH,
                          width: visibleDurationDays * DAY_COLUMN_WIDTH,
                          minWidth: 8,
                          height: getBarHeight(depth),
                          top: 23 - getBarHeight(depth) / 2,
                          borderRadius: 2,
                          background: BAR_COLORS[task.status],
                          opacity: getBarOpacity(depth),
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <GanttContextMenu x={contextMenu.x} y={contextMenu.y} onCreateTask={handleCreateTask} onClose={() => setContextMenu(null)} />
      )}
    </section>
  );
}
