import { ChangeEvent, MouseEvent, UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../../../domain/task/constants';
import { Task, TaskStatus } from '../../../domain/task/types';
import { TaskFormValues, TaskModal } from '../../task-editor/components/TaskModal';
import { generateTaskId } from '../../../shared/lib/id';
import { addTask, removeTasks, replaceTasks, updateTask, updateTasks } from '../../../store/actions/taskCrud';
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

interface DragState {
  taskId: string;
  affectedTaskIds: string[];
  startClientX: number;
}

interface ResizeState {
  taskId: string;
  startClientX: number;
  originalEndDate: string;
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

const BAR_COLORS: Record<TaskStatus, string> = TASK_STATUS_COLORS;

const LEFT_COLUMN_WIDTH = 260;
const DAY_COLUMN_WIDTH = 28;
const VIEW_RANGE_OPTIONS: ViewRangeOption[] = [
  { id: '14d', label: '2週間', days: 14 },
  { id: '1m', label: '1ヶ月', days: 31 },
  { id: '2m', label: '2ヶ月', days: 62 },
  { id: '3m', label: '3ヶ月', days: 93 },
  { id: '6m', label: '6ヶ月', days: 186 },
];

const PARENT_BAR_HEIGHT = 34;
const CHILD_BAR_HEIGHT = 28;
const DESCENDANT_BAR_HEIGHT = 22;
const GANTT_ROW_HEIGHT = 46;
const GANTT_HEADER_HEIGHT = 50;

function getBarHeight(depth: number): number {
  if (depth <= 0) return PARENT_BAR_HEIGHT;
  if (depth === 1) return CHILD_BAR_HEIGHT;
  return DESCENDANT_BAR_HEIGHT;
}

function getBarOpacity(depth: number): number {
  if (depth <= 0) return 0.62;
  if (depth === 1) return 0.52;
  return 0.42;
}

function formatLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(baseDate: Date, offset: number): Date {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + offset);
  return next;
}

function shiftTaskDateText(dateText: string, offsetDays: number): string {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  return formatLabel(addDays(date, offsetDays));
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

function isJapaneseHoliday(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const fixedHolidays = new Set([
    '01-01',
    '02-11',
    '02-23',
    '04-29',
    '05-03',
    '05-04',
    '05-05',
    '08-11',
    '11-03',
    '11-23',
  ]);
  const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return fixedHolidays.has(mmdd);
}

function isHolidayCell(date: Date): boolean {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return true;
  return isJapaneseHoliday(date);
}

function getJstDateLabel(baseDate = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(baseDate);
}

function shiftDateLabel(dateLabel: string, offsetDays: number): string {
  const date = new Date(`${dateLabel}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateLabel;
  date.setDate(date.getDate() + offsetDays);
  return formatLabel(date);
}

function isTodayCell(date: Date): boolean {
  return formatLabel(date) === getJstDateLabel();
}

function clamp(number: number, min: number, max: number): number {
  return Math.min(Math.max(number, min), max);
}

function normalizeDateRange(startDate: string, endDate: string): { startDate: string; endDate: string } {
  if (!startDate || !endDate) {
    return { startDate, endDate };
  }

  return startDate <= endDate ? { startDate, endDate } : { startDate: endDate, endDate: startDate };
}

function buildInitialTaskForm(task?: Task): TaskFormValues {
  if (task) {
    return {
      taskId: task.taskId,
      parentTaskId: task.parentTaskId ?? '',
      taskName: task.taskName,
      status: task.status,
      startDate: task.startDate,
      endDate: task.endDate,
      project: task.project ?? '',
      category: task.category ?? '',
      description: task.description ?? '',
    };
  }

  const today = formatLabel(new Date());
  return {
    taskId: generateTaskId(),
    parentTaskId: '',
    taskName: '',
    status: '',
    startDate: today,
    endDate: today,
    project: '',
    category: '',
    description: '',
  };
}

function collectDescendantTaskIds(rootTaskId: string, childrenByParentId: Map<string, string[]>): string[] {
  const result: string[] = [];
  const queue = [...(childrenByParentId.get(rootTaskId) ?? [])];

  while (queue.length > 0) {
    const currentTaskId = queue.shift();
    if (!currentTaskId) continue;

    result.push(currentTaskId);
    const children = childrenByParentId.get(currentTaskId);
    if (children) {
      queue.push(...children);
    }
  }

  return result;
}

export function GanttChart({ tasks }: GanttChartProps) {
  const layout = useMemo(() => calculateGanttLayout(tasks), [tasks]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedRangeId, setSelectedRangeId] = useState<string>('3m');
  const [selectedStartDate, setSelectedStartDate] = useState<string>('');
  const [hideDoneTasks, setHideDoneTasks] = useState(false);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const [timelineScrollLeft, setTimelineScrollLeft] = useState(0);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  const ganttToolbarRef = useRef<HTMLDivElement | null>(null);
  const [ganttHeaderStickyTop, setGanttHeaderStickyTop] = useState(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState(0);
  const dragOffsetDaysRef = useRef(0);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [resizeOffsetDays, setResizeOffsetDays] = useState(0);
  const resizeOffsetDaysRef = useRef(0);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormValues>(() => buildInitialTaskForm());
  const suppressNextBarClickRef = useRef(false);

  const selectedOption = VIEW_RANGE_OPTIONS.find((item) => item.id === selectedRangeId) ?? VIEW_RANGE_OPTIONS[1];
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.taskId, task])), [tasks]);
  const parentTaskIdSet = useMemo(() => new Set(tasks.flatMap((task) => (task.parentTaskId ? [task.parentTaskId] : []))), [tasks]);
  const childrenByParentId = useMemo(() => {
    const map = new Map<string, string[]>();

    tasks.forEach((task) => {
      if (!task.parentTaskId) return;
      const children = map.get(task.parentTaskId) ?? [];
      children.push(task.taskId);
      map.set(task.parentTaskId, children);
    });

    return map;
  }, [tasks]);
  const dragShiftByTaskId = useMemo(() => {
    if (!dragState || dragOffsetDays === 0) {
      return new Map<string, number>();
    }

    return new Map(dragState.affectedTaskIds.map((taskId) => [taskId, dragOffsetDays]));
  }, [dragOffsetDays, dragState]);

  const hiddenTaskIdSet = useMemo(() => {
    if (!hideDoneTasks) {
      return new Set<string>();
    }

    const hiddenTaskIds = new Set<string>();
    tasks.forEach((task) => {
      if (task.status !== 'done') return;

      hiddenTaskIds.add(task.taskId);
      collectDescendantTaskIds(task.taskId, childrenByParentId).forEach((descendantTaskId) => {
        hiddenTaskIds.add(descendantTaskId);
      });
    });

    return hiddenTaskIds;
  }, [childrenByParentId, hideDoneTasks, tasks]);

  useEffect(() => {
    if (!layout) return;
    if (!selectedStartDate) {
      setSelectedStartDate(shiftDateLabel(getJstDateLabel(), -5));
    }
  }, [layout, selectedStartDate]);

  useEffect(() => {
    const toolbarElement = ganttToolbarRef.current;
    if (!toolbarElement) return;

    const updateStickyTop = () => {
      setGanttHeaderStickyTop(Math.ceil(toolbarElement.getBoundingClientRect().height));
    };

    updateStickyTop();
    window.addEventListener('resize', updateStickyTop);

    const resizeObserver = new ResizeObserver(updateStickyTop);
    resizeObserver.observe(toolbarElement);

    return () => {
      window.removeEventListener('resize', updateStickyTop);
      resizeObserver.disconnect();
    };
  }, []);


  useEffect(() => {
    const element = timelineScrollRef.current;
    if (!element) return;

    const updateViewport = () => {
      setTimelineViewportWidth(element.clientWidth);
      setTimelineScrollLeft(element.scrollLeft);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
    };
  }, [layout]);

  function handleTimelineScroll(event: UIEvent<HTMLDivElement>) {
    setTimelineScrollLeft(event.currentTarget.scrollLeft);
    setTimelineViewportWidth(event.currentTarget.clientWidth);
  }

  function handleBarMouseDown(event: MouseEvent<HTMLDivElement>, task: Task) {
    event.preventDefault();

    const descendantTaskIds = collectDescendantTaskIds(task.taskId, childrenByParentId);
    setDragState({
      taskId: task.taskId,
      affectedTaskIds: [task.taskId, ...descendantTaskIds],
      startClientX: event.clientX,
    });
    setDragOffsetDays(0);
    dragOffsetDaysRef.current = 0;
  }

  function handleResizeHandleMouseDown(event: MouseEvent<HTMLDivElement>, task: Task) {
    event.preventDefault();
    event.stopPropagation();
    suppressNextBarClickRef.current = true;

    setResizeState({
      taskId: task.taskId,
      startClientX: event.clientX,
      originalEndDate: task.endDate,
    });
    setResizeOffsetDays(0);
    resizeOffsetDaysRef.current = 0;
  }

  function openEditModal(task: Task) {
    if (suppressNextBarClickRef.current) {
      suppressNextBarClickRef.current = false;
      return;
    }

    setTaskForm(buildInitialTaskForm(task));
    setEditingTaskId(task.taskId);
    setIsCreateModalOpen(false);
  }

  function openCreateModal() {
    setTaskForm(buildInitialTaskForm());
    setEditingTaskId(null);
    setIsCreateModalOpen(true);
  }

  function closeTaskModal() {
    setEditingTaskId(null);
    setIsCreateModalOpen(false);
  }

  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (event: globalThis.MouseEvent) => {
      const diffX = event.clientX - dragState.startClientX;
      const nextOffsetDays = Math.round(diffX / DAY_COLUMN_WIDTH);
      setDragOffsetDays(nextOffsetDays);
      dragOffsetDaysRef.current = nextOffsetDays;
    };

    const onMouseUp = () => {
      const finalOffsetDays = dragOffsetDaysRef.current;

      if (finalOffsetDays !== 0) {
        suppressNextBarClickRef.current = true;
        const nextTasks = dragState.affectedTaskIds
          .map((taskId) => taskById.get(taskId))
          .filter((task): task is Task => Boolean(task))
          .map((task) => ({
            ...task,
            startDate: shiftTaskDateText(task.startDate, finalOffsetDays),
            endDate: shiftTaskDateText(task.endDate, finalOffsetDays),
          }));

        if (nextTasks.length > 0) {
          updateTasks(nextTasks);
        }
      }

      setTimeout(() => {
        suppressNextBarClickRef.current = false;
      }, 0);

      setDragState(null);
      setDragOffsetDays(0);
      dragOffsetDaysRef.current = 0;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, taskById]);

  useEffect(() => {
    if (!resizeState) return;

    const onMouseMove = (event: globalThis.MouseEvent) => {
      const diffX = event.clientX - resizeState.startClientX;
      const nextOffsetDays = Math.round(diffX / DAY_COLUMN_WIDTH);
      setResizeOffsetDays(nextOffsetDays);
      resizeOffsetDaysRef.current = nextOffsetDays;
    };

    const onMouseUp = () => {
      const task = taskById.get(resizeState.taskId);
      if (task) {
        const shiftedEndDate = shiftTaskDateText(resizeState.originalEndDate, resizeOffsetDaysRef.current);
        const normalized = normalizeDateRange(task.startDate, shiftedEndDate);
        if (normalized.endDate !== task.endDate || normalized.startDate !== task.startDate) {
          updateTask({
            ...task,
            startDate: normalized.startDate,
            endDate: normalized.endDate,
          });
        }
      }

      setTimeout(() => {
        suppressNextBarClickRef.current = false;
      }, 0);

      setResizeState(null);
      setResizeOffsetDays(0);
      resizeOffsetDaysRef.current = 0;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizeState, taskById]);

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
  const monthBoundaryIndexSet = new Set(monthSpans.filter((month) => month.startIndex > 0).map((month) => month.startIndex));
  const visibleRows = currentLayout.rows.filter((row) => !hiddenTaskIdSet.has(row.task.taskId));

  function handleRangeChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedRangeId(event.target.value);
  }

  function handleStartDateChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedStartDate(event.target.value);
  }

  function handleHideDoneChange(event: ChangeEvent<HTMLInputElement>) {
    setHideDoneTasks(event.target.checked);
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

  function handleTaskFormChange<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setTaskForm((current) => ({ ...current, [key]: value }));
  }

  function handleSaveTask() {
    const normalizedTaskId = taskForm.taskId.trim();
    const normalizedParentTaskId = taskForm.parentTaskId.trim() || undefined;

    if (!normalizedTaskId || !taskForm.taskName.trim() || taskForm.status === '') {
      return;
    }

    if (!editingTaskId && taskById.has(normalizedTaskId)) {
      return;
    }

    if (normalizedParentTaskId && !taskById.has(normalizedParentTaskId)) {
      return;
    }

    if (normalizedParentTaskId && normalizedParentTaskId === normalizedTaskId) {
      return;
    }

    const normalized = normalizeDateRange(taskForm.startDate, taskForm.endDate);

    if (editingTaskId) {
      const existingTask = taskById.get(editingTaskId);
      if (!existingTask) return;

      updateTask({
        ...existingTask,
        parentTaskId: normalizedParentTaskId,
        taskName: taskForm.taskName.trim(),
        status: taskForm.status as TaskStatus,
        startDate: normalized.startDate,
        endDate: normalized.endDate,
        project: taskForm.project.trim() || undefined,
        category: taskForm.category.trim() || undefined,
        description: taskForm.description.trim() || undefined,
      });
    } else {
      const displayOrder = tasks.reduce((max, task) => Math.max(max, task.displayOrder), 0) + 1;
      addTask({
        taskId: normalizedTaskId,
        taskName: taskForm.taskName.trim(),
        parentTaskId: normalizedParentTaskId,
        status: taskForm.status as TaskStatus,
        startDate: normalized.startDate,
        endDate: normalized.endDate,
        assignee: undefined,
        priority: undefined,
        project: taskForm.project.trim() || undefined,
        category: taskForm.category.trim() || undefined,
        description: taskForm.description.trim() || undefined,
        displayOrder,
      });
    }

    closeTaskModal();
  }


  function handleDeleteTask() {
    if (!editingTaskId) return;

    const descendantIds = collectDescendantTaskIds(editingTaskId, childrenByParentId);
    removeTasks([editingTaskId, ...descendantIds]);
    closeTaskModal();
  }

  function handleSortByStartDate() {
    const sorted = [...tasks].sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      if (a.endDate !== b.endDate) return a.endDate.localeCompare(b.endDate);
      return a.taskId.localeCompare(b.taskId);
    });

    replaceTasks(sorted.map((task, index) => ({ ...task, displayOrder: index + 1 })));
  }

  return (
    <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
      <div
        ref={ganttToolbarRef}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: '#fff',
          paddingBottom: 8,
          borderBottom: '1px solid #e2e8f0',
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: '0 0 8px' }}>ガントチャート</h2>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ background: BAR_COLORS.todo, opacity: 0.62, color: '#0f172a', fontWeight: 600, padding: '4px 8px', borderRadius: 2, minWidth: 90, textAlign: 'center', boxSizing: 'border-box' }}>{TASK_STATUS_LABELS.todo}</span>
          <span style={{ background: BAR_COLORS.inProgress, opacity: 0.62, color: '#0f172a', fontWeight: 600, padding: '4px 8px', borderRadius: 2, minWidth: 90, textAlign: 'center', boxSizing: 'border-box' }}>{TASK_STATUS_LABELS.inProgress}</span>
          <span style={{ background: BAR_COLORS.review, opacity: 0.62, color: '#0f172a', fontWeight: 600, padding: '4px 8px', borderRadius: 2, minWidth: 90, textAlign: 'center', boxSizing: 'border-box' }}>{TASK_STATUS_LABELS.review}</span>
          <span style={{ background: BAR_COLORS.done, opacity: 0.62, color: '#0f172a', fontWeight: 600, padding: '4px 8px', borderRadius: 2, minWidth: 90, textAlign: 'center', boxSizing: 'border-box' }}>{TASK_STATUS_LABELS.done}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={openCreateModal}>タスク新規登録</button>
            <button type="button" onClick={handleSortByStartDate}>開始日でソート</button>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              表示開始日:
              <input type="date" value={selectedStartDate} onChange={handleStartDateChange} />
            </label>
            <p style={{ margin: 0, color: '#475569' }}>
              表示期間: {formatLabel(viewStart)} 〜 {formatLabel(viewEnd)}
            </p>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
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
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={hideDoneTasks} onChange={handleHideDoneChange} />
              完了タスクを非表示
            </label>
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `${LEFT_COLUMN_WIDTH}px minmax(0, 1fr)`,
            position: 'sticky',
            top: ganttHeaderStickyTop,
            zIndex: 35,
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ padding: '8px 10px', fontWeight: 600, height: GANTT_HEADER_HEIGHT, boxSizing: 'border-box', display: 'flex', alignItems: 'center' }}>
            タスク
          </div>
          <div style={{ height: GANTT_HEADER_HEIGHT, boxSizing: 'border-box', overflow: 'hidden' }}>
            <div style={{ width: timelineWidth, transform: `translateX(-${timelineScrollLeft}px)` }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleDays}, ${DAY_COLUMN_WIDTH}px)`, background: '#f8fafc' }}>
                {monthSpans.map((month) => (
                  <div
                    key={month.key}
                    style={{
                      gridColumn: `${month.startIndex + 1} / span ${month.span}`,
                      textAlign: 'center',
                      fontWeight: 600,
                      padding: '4px 0 2px',
                      borderLeft: month.startIndex === 0 ? 'none' : '2px solid #94a3b8',
                    }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleDays}, ${DAY_COLUMN_WIDTH}px)`, borderTop: '1px solid #e2e8f0' }}>
                {dayDates.map((date, index) => (
                  <div key={index} style={{ textAlign: 'center', padding: '2px 0', borderLeft: index === 0 ? 'none' : `${monthBoundaryIndexSet.has(index) ? 2 : 1}px solid ${monthBoundaryIndexSet.has(index) ? '#94a3b8' : '#e2e8f0'}`, background: isTodayCell(date) ? '#fed7aa' : isHolidayCell(date) ? '#e5e7eb' : '#f8fafc', fontSize: 12 }}>
                    {date.getDate()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `${LEFT_COLUMN_WIDTH}px minmax(0, 1fr)` }}>
          <div>
            {visibleRows.map(({ task, depth }) => (
              <div
                key={`${task.taskId}-left`}
                onContextMenu={(event) => handleRowContextMenu(event, task.taskId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: GANTT_ROW_HEIGHT,
                  boxSizing: 'border-box',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <GanttRowTree taskName={task.taskName} depth={depth} />
              </div>
            ))}
          </div>

          <div ref={timelineScrollRef} onScroll={handleTimelineScroll} style={{ overflowX: 'auto' }}>
            <div style={{ width: timelineWidth }}>
              {visibleRows.map(({ task, start, depth }) => {
                const currentDragShift = dragShiftByTaskId.get(task.taskId) ?? 0;
                const isDraggingThisTask = dragState?.affectedTaskIds.includes(task.taskId) ?? false;
                const isResizingThisTask = resizeState?.taskId === task.taskId;
                const effectiveStart = currentDragShift !== 0 ? new Date(shiftTaskDateText(task.startDate, currentDragShift)) : start;
                const effectiveEndDateText = isResizingThisTask
                  ? shiftTaskDateText(task.endDate, resizeOffsetDays)
                  : currentDragShift !== 0
                    ? shiftTaskDateText(task.endDate, currentDragShift)
                    : task.endDate;
                const effectiveEnd = new Date(effectiveEndDateText);

                const startOffsetDays = getDateOffsetDays(viewStart, effectiveStart);
                const endOffsetDays = getDateOffsetDays(viewStart, effectiveEnd);

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

                  const parentDragShift = dragShiftByTaskId.get(parentTask.taskId) ?? 0;
                  const parentStart = new Date(shiftTaskDateText(parentTask.startDate, parentDragShift));
                  const parentEnd = new Date(shiftTaskDateText(parentTask.endDate, parentDragShift));
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
                      height: GANTT_ROW_HEIGHT,
                      boxSizing: 'border-box',
                      borderTop: '1px solid #f1f5f9',
                                          }}
                  >
                    {dayDates.map((date, index) => (
                      <div
                        key={`${task.taskId}-day-bg-${index}`}
                        style={{
                          position: 'absolute',
                          left: index * DAY_COLUMN_WIDTH,
                          width: DAY_COLUMN_WIDTH,
                          top: 0,
                          bottom: 0,
                          background: isTodayCell(date) ? '#ffedd5' : isHolidayCell(date) ? '#f3f4f6' : 'transparent',
                          borderLeft: index === 0 ? 'none' : `${monthBoundaryIndexSet.has(index) ? 2 : 1}px solid ${monthBoundaryIndexSet.has(index) ? '#94a3b8' : '#e2e8f0'}`,
                          pointerEvents: 'none',
                        }}
                      />
                    ))}
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
                        title={`taskId: ${task.taskId} | ${isDraggingThisTask ? shiftTaskDateText(task.startDate, currentDragShift) : task.startDate} - ${isDraggingThisTask ? shiftTaskDateText(task.endDate, currentDragShift) : task.endDate}`}
                        style={{
                          position: 'absolute',
                          left: visibleStartDay * DAY_COLUMN_WIDTH,
                          width: visibleDurationDays * DAY_COLUMN_WIDTH,
                          minWidth: 8,
                          height: getBarHeight(depth),
                          top: GANTT_ROW_HEIGHT / 2 - getBarHeight(depth) / 2,
                          borderRadius: 2,
                          background: BAR_COLORS[task.status],
                          opacity: getBarOpacity(depth),
                          cursor: isDraggingThisTask ? 'grabbing' : 'grab',
                        }}
                        onClick={() => openEditModal(task)}
                        onMouseDown={(event) => handleBarMouseDown(event, task)}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            width: 8,
                            height: '100%',
                            background: 'rgba(15, 23, 42, 0.4)',
                            cursor: 'ew-resize',
                          }}
                          onMouseDown={(event) => handleResizeHandleMouseDown(event, task)}
                        />
                      </div>
                    )}
                    {(() => {
                      const barStartDay = startOffsetDays;
                      const barEndDayExclusive = endOffsetDays + 1;
                      const barLeft = barStartDay * DAY_COLUMN_WIDTH;
                      const barRight = barEndDayExclusive * DAY_COLUMN_WIDTH;
                      const viewLeft = timelineScrollLeft;
                      const viewRight = timelineScrollLeft + timelineViewportWidth;

                      const edgePadding = 8;
                      const top = GANTT_ROW_HEIGHT / 2 - 8;

                      if (barRight <= viewLeft) {
                        const labelLeft = viewLeft + edgePadding;
                        const labelWidth = Math.max(timelineViewportWidth - edgePadding * 2, 20);

                        return (
                          <div
                            style={{
                              position: 'absolute',
                              left: labelLeft,
                              width: labelWidth,
                              top,
                              fontSize: 12,
                              lineHeight: '16px',
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              pointerEvents: 'none',
                            }}
                            title={task.taskName}
                          >
                            {task.taskName}
                          </div>
                        );
                      }

                      if (barLeft >= viewRight) {
                        const labelWidth = Math.max(timelineViewportWidth - edgePadding * 2, 20);
                        const labelLeft = Math.max(viewRight - labelWidth - edgePadding, viewLeft + edgePadding);

                        return (
                          <div
                            style={{
                              position: 'absolute',
                              left: labelLeft,
                              width: labelWidth,
                              top,
                              fontSize: 12,
                              lineHeight: '16px',
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              textAlign: 'right',
                              pointerEvents: 'none',
                            }}
                            title={task.taskName}
                          >
                            {task.taskName}
                          </div>
                        );
                      }

                      const visibleBarLeft = Math.max(barLeft, viewLeft);
                      const labelLeft = Math.max(visibleBarLeft + edgePadding, viewLeft + edgePadding);
                      const labelMaxRight = viewRight - 6;
                      const labelWidth = labelMaxRight - labelLeft;

                      if (labelWidth <= 12) {
                        return null;
                      }

                      return (
                        <div
                          style={{
                            position: 'absolute',
                            left: labelLeft,
                            width: labelWidth,
                            top,
                            fontSize: 12,
                            lineHeight: '16px',
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                          }}
                          title={task.taskName}
                        >
                          {task.taskName}
                        </div>
                      );
                    })()}
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

      {(editingTaskId || isCreateModalOpen) && (
        <TaskModal
          mode={editingTaskId ? 'edit' : 'create'}
          values={taskForm}
          editingTask={editingTaskId ? taskById.get(editingTaskId) : undefined}
          onChange={handleTaskFormChange}
          onSave={handleSaveTask}
          onDelete={editingTaskId ? handleDeleteTask : undefined}
          onClose={closeTaskModal}
        />
      )}
    </section>
  );
}
