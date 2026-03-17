import { ChangeEvent, MouseEvent, UIEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../../../domain/task/constants';
import { Task, TaskStatus } from '../../../domain/task/types';
import { TaskFormValues, TaskModal } from '../../task-editor/components/TaskModal';
import { generateTaskId } from '../../../shared/lib/id';
import { addTask, removeTasks, replaceTasks, updateTask, updateTasks } from '../../../store/actions/taskCrud';
import { GanttContextMenu } from './GanttContextMenu';
import { GanttRowTree } from './GanttRowTree';
import { GanttGridBackground } from './GanttGridBackground';
import { GanttTimelineRow } from './GanttTimelineRow';
import { createTaskFromRightClick } from '../interactions/rightClickCreate';
import { calculateGanttLayout, calculateGroupedGanttLayout, GanttGroupBy, getDateOffsetDays } from '../lib/ganttLayout';
import { Button } from '../../../shared/ui/Button';

const SYSTEM_RESERVED_CHAR_PATTERN = /[,"\n\r]/;

interface GanttChartProps {
  tasks: Task[];
  holidays: string[];
  projects: string[];
  categories: string[];
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
  { id: '1y', label: '1年', days: 372 },
  { id: '15m', label: '1年3か月', days: 465 },
  { id: '18m', label: '1年6か月', days: 558 },
  { id: '2y', label: '2年', days: 744 },
];

const GANTT_ROW_HEIGHT = 46;
const GANTT_HEADER_HEIGHT = 50;
const VIRTUALIZATION_OVERSCAN = 5;

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



function resolveInheritedProjectAndCategory(
  parentTaskId: string | undefined,
  fallback: { project: string; category: string },
  taskById: Map<string, Task>,
): { project: string; category: string } {
  if (!parentTaskId) {
    return fallback;
  }

  const parentTask = taskById.get(parentTaskId);
  if (!parentTask) {
    return fallback;
  }

  return {
    project: parentTask.project ?? '',
    category: parentTask.category ?? '',
  };
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

const GROUP_BY_OPTIONS: { id: GanttGroupBy; label: string }[] = [
  { id: 'none', label: 'なし' },
  { id: 'project', label: 'プロジェクト' },
  { id: 'category', label: 'カテゴリ' },
];

const GROUP_HEADER_HEIGHT = 38;

export function GanttChart({ tasks, holidays, projects, categories }: GanttChartProps) {
  const layout = useMemo(() => calculateGanttLayout(tasks), [tasks]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedRangeId, setSelectedRangeId] = useState<string>('6m');
  const [selectedStartDate, setSelectedStartDate] = useState<string>('');
  const [hideDoneTasks, setHideDoneTasks] = useState(false);
  const [groupBy, setGroupBy] = useState<GanttGroupBy>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const groupedSections = useMemo(
    () => calculateGroupedGanttLayout(tasks, groupBy),
    [tasks, groupBy],
  );
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const headerContentRef = useRef<HTMLDivElement | null>(null);
  const [timelineScrollLeft, setTimelineScrollLeft] = useState(0);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const ganttToolbarRef = useRef<HTMLDivElement | null>(null);
  const [ganttHeaderStickyTop, setGanttHeaderStickyTop] = useState(0);
  const holidaySet = useMemo(() => new Set(holidays), [holidays]);
  const isHolidayCell = useCallback(
    (date: Date) => {
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return true;
      return holidaySet.has(formatLabel(date));
    },
    [holidaySet],
  );

  // Drag state: use ref for intermediate values, only setState on mouseup
  const dragStateRef = useRef<DragState | null>(null);
  const dragOffsetDaysRef = useRef(0);
  const [dragVersion, setDragVersion] = useState(0); // trigger re-render only when drag starts/ends
  const dragSnapshotRef = useRef<{ state: DragState | null; offsetDays: number }>({
    state: null,
    offsetDays: 0,
  });

  // Resize state: same ref-based approach
  const resizeStateRef = useRef<ResizeState | null>(null);
  const resizeOffsetDaysRef = useRef(0);
  const [resizeVersion, setResizeVersion] = useState(0);
  const resizeSnapshotRef = useRef<{ state: ResizeState | null; offsetDays: number }>({
    state: null,
    offsetDays: 0,
  });

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormValues>(() => buildInitialTaskForm());
  const suppressNextBarClickRef = useRef(false);

  // Vertical scroll for virtualization
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);
  const [verticalScrollTop, setVerticalScrollTop] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);

  const selectedOption = VIEW_RANGE_OPTIONS.find((item) => item.id === selectedRangeId) ?? VIEW_RANGE_OPTIONS[1];
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.taskId, task])), [tasks]);
  const editingParentTask = useMemo(
    () => (taskForm.parentTaskId ? taskById.get(taskForm.parentTaskId) : undefined),
    [taskById, taskForm.parentTaskId],
  );
  const isProjectAndCategoryLocked = Boolean(editingParentTask);
  const modalFormValues = useMemo(() => {
    if (!isProjectAndCategoryLocked) {
      return taskForm;
    }

    return {
      ...taskForm,
      ...resolveInheritedProjectAndCategory(
        taskForm.parentTaskId.trim() || undefined,
        { project: taskForm.project, category: taskForm.category },
        taskById,
      ),
    };
  }, [isProjectAndCategoryLocked, taskById, taskForm]);
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
      setSelectedStartDate(shiftDateLabel(getJstDateLabel(), -21));
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

    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [layout]);

  // Vertical scroll tracking for virtualization
  useEffect(() => {
    const element = bodyScrollRef.current;
    if (!element) return;

    const updateScroll = () => {
      setVerticalScrollTop(element.scrollTop);
      setBodyHeight(element.clientHeight);
    };

    updateScroll();

    const resizeObserver = new ResizeObserver(updateScroll);
    resizeObserver.observe(element);

    const handleScroll = () => {
      requestAnimationFrame(updateScroll);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [layout]);

  const handleTimelineScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;

    // Sync header transform immediately (no rAF delay) to eliminate visual lag
    if (headerContentRef.current) {
      headerContentRef.current.style.transform = `translateX(-${element.scrollLeft}px)`;
    }

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      setTimelineScrollLeft(element.scrollLeft);
      setTimelineViewportWidth(element.clientWidth);
      animationFrameRef.current = null;
    });
  }, []);

  // Drag: ref-based with requestAnimationFrame for visual updates
  const handleBarMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>, task: Task) => {
      event.preventDefault();

      const descendantTaskIds = collectDescendantTaskIds(task.taskId, childrenByParentId);
      const newDragState: DragState = {
        taskId: task.taskId,
        affectedTaskIds: [task.taskId, ...descendantTaskIds],
        startClientX: event.clientX,
      };
      dragStateRef.current = newDragState;
      dragOffsetDaysRef.current = 0;
      dragSnapshotRef.current = { state: newDragState, offsetDays: 0 };
      setDragVersion((v) => v + 1);
    },
    [childrenByParentId],
  );

  const handleResizeHandleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>, task: Task) => {
      event.preventDefault();
      event.stopPropagation();
      suppressNextBarClickRef.current = true;

      const newResizeState: ResizeState = {
        taskId: task.taskId,
        startClientX: event.clientX,
        originalEndDate: task.endDate,
      };
      resizeStateRef.current = newResizeState;
      resizeOffsetDaysRef.current = 0;
      resizeSnapshotRef.current = { state: newResizeState, offsetDays: 0 };
      setResizeVersion((v) => v + 1);
    },
    [],
  );

  // Drag mousemove/mouseup: use refs and rAF to avoid per-frame re-renders
  useEffect(() => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    let rafId: number | null = null;

    const onMouseMove = (event: globalThis.MouseEvent) => {
      const diffX = event.clientX - dragState.startClientX;
      const nextOffsetDays = Math.round(diffX / DAY_COLUMN_WIDTH);
      if (nextOffsetDays !== dragOffsetDaysRef.current) {
        dragOffsetDaysRef.current = nextOffsetDays;
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          dragSnapshotRef.current = { state: dragState, offsetDays: nextOffsetDays };
          setDragVersion((v) => v + 1);
          rafId = null;
        });
      }
    };

    const onMouseUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
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

      dragStateRef.current = null;
      dragOffsetDaysRef.current = 0;
      dragSnapshotRef.current = { state: null, offsetDays: 0 };
      setDragVersion((v) => v + 1);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [dragVersion, taskById]);

  // Resize mousemove/mouseup: same ref-based approach
  useEffect(() => {
    const resizeState = resizeStateRef.current;
    if (!resizeState) return;

    let rafId: number | null = null;

    const onMouseMove = (event: globalThis.MouseEvent) => {
      const diffX = event.clientX - resizeState.startClientX;
      const nextOffsetDays = Math.round(diffX / DAY_COLUMN_WIDTH);
      if (nextOffsetDays !== resizeOffsetDaysRef.current) {
        resizeOffsetDaysRef.current = nextOffsetDays;
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          resizeSnapshotRef.current = { state: resizeState, offsetDays: nextOffsetDays };
          setResizeVersion((v) => v + 1);
          rafId = null;
        });
      }
    };

    const onMouseUp = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
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

      resizeStateRef.current = null;
      resizeOffsetDaysRef.current = 0;
      resizeSnapshotRef.current = { state: null, offsetDays: 0 };
      setResizeVersion((v) => v + 1);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [resizeVersion, taskById]);

  const openEditModal = useCallback(
    (task: Task) => {
      if (suppressNextBarClickRef.current) {
        suppressNextBarClickRef.current = false;
        return;
      }

      setTaskForm(buildInitialTaskForm(task));
      setEditingTaskId(task.taskId);
      setIsCreateModalOpen(false);
    },
    [],
  );

  const openCreateModal = useCallback(() => {
    setTaskForm(buildInitialTaskForm());
    setEditingTaskId(null);
    setIsCreateModalOpen(true);
  }, []);

  const closeTaskModal = useCallback(() => {
    setEditingTaskId(null);
    setIsCreateModalOpen(false);
  }, []);

  // Read drag/resize snapshots (these are updated via rAF)
  // Use dragVersion/resizeVersion to ensure we read latest snapshot
  void dragVersion;
  void resizeVersion;
  const currentDragSnapshot = dragSnapshotRef.current;
  const currentResizeSnapshot = resizeSnapshotRef.current;

  const dragShiftByTaskId = useMemo(() => {
    if (!currentDragSnapshot.state || currentDragSnapshot.offsetDays === 0) {
      return new Map<string, number>();
    }
    return new Map(currentDragSnapshot.state.affectedTaskIds.map((taskId) => [taskId, currentDragSnapshot.offsetDays]));
  }, [currentDragSnapshot.state, currentDragSnapshot.offsetDays]);

  // Derive layout-dependent values (safe even when layout is null)
  const currentLayout = layout;
  const selectedStartTimestamp = Date.parse(selectedStartDate);
  const viewStart = useMemo(() => {
    if (!currentLayout) return new Date();
    return Number.isNaN(selectedStartTimestamp) ? currentLayout.minStart : new Date(selectedStartTimestamp);
  }, [currentLayout, selectedStartTimestamp]);
  const visibleDays = currentLayout ? Math.min(selectedOption.days, currentLayout.totalDays) : 0;

  const handleTimelineRowContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>, parentTaskId: string) => {
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
    },
    [visibleDays, viewStart],
  );

  if (!currentLayout) {
    return (
      <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
        <h2 style={{ margin: '0 0 8px' }}>ガントチャート</h2>
        <p style={{ margin: 0, color: '#64748b' }}>表示可能なタスクがありません。startDate/endDate を確認してください。</p>
      </section>
    );
  }

  const viewEnd = addDays(viewStart, visibleDays - 1);
  const timelineWidth = visibleDays * DAY_COLUMN_WIDTH;
  const dayDates = Array.from({ length: visibleDays }, (_, index) => addDays(viewStart, index));
  const monthSpans = buildMonthSpans(viewStart, visibleDays);
  const monthBoundaryIndexSet = new Set(monthSpans.filter((month) => month.startIndex > 0).map((month) => month.startIndex));
  const visibleRows = currentLayout.rows.filter((row) => !hiddenTaskIdSet.has(row.task.taskId));
  const effectiveTimelineViewportWidth = timelineViewportWidth || timelineScrollRef.current?.clientWidth || 0;

  // Virtualization: compute visible row range
  const totalContentHeight = visibleRows.length * GANTT_ROW_HEIGHT;
  const firstVisibleRow = Math.max(0, Math.floor(verticalScrollTop / GANTT_ROW_HEIGHT) - VIRTUALIZATION_OVERSCAN);
  const lastVisibleRow = Math.min(
    visibleRows.length - 1,
    Math.ceil((verticalScrollTop + bodyHeight) / GANTT_ROW_HEIGHT) + VIRTUALIZATION_OVERSCAN,
  );

  // Pre-compute ancestor highlights for visible rows
  const computeAncestorHighlights = (task: Task): Array<{ left: number; width: number; color: string }> => {
    const highlights: Array<{ left: number; width: number; color: string }> = [];

    if (parentTaskIdSet.has(task.taskId)) {
      const dragShift = dragShiftByTaskId.get(task.taskId) ?? 0;
      const isResizingThis = currentResizeSnapshot.state?.taskId === task.taskId;
      const effectiveStart = dragShift !== 0 ? new Date(shiftTaskDateText(task.startDate, dragShift)) : new Date(task.startDate);
      const effectiveEndText = isResizingThis
        ? shiftTaskDateText(task.endDate, currentResizeSnapshot.offsetDays)
        : dragShift !== 0
          ? shiftTaskDateText(task.endDate, dragShift)
          : task.endDate;
      const effectiveEnd = new Date(effectiveEndText);

      const startDay = clamp(getDateOffsetDays(viewStart, effectiveStart), 0, visibleDays);
      const endDay = clamp(getDateOffsetDays(viewStart, effectiveEnd) + 1, 0, visibleDays);
      const dur = Math.max(endDay - startDay, 0);
      if (dur > 0) {
        highlights.push({
          left: startDay * DAY_COLUMN_WIDTH,
          width: dur * DAY_COLUMN_WIDTH,
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
          highlights.push({
            left: parentStartDay * DAY_COLUMN_WIDTH,
            width: parentDuration * DAY_COLUMN_WIDTH,
            color: BAR_COLORS[parentTask.status],
          });
        }
      }

      currentParentId = parentTask.parentTaskId;
    }

    return highlights;
  };


  function handleRangeChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedRangeId(event.target.value);
  }

  function handleStartDateChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedStartDate(event.target.value);
  }

  function handleHideDoneChange(event: ChangeEvent<HTMLInputElement>) {
    setHideDoneTasks(event.target.checked);
  }

  function handleGroupByChange(event: ChangeEvent<HTMLSelectElement>) {
    setGroupBy(event.target.value as GanttGroupBy);
    setCollapsedGroups(new Set());
  }

  function toggleGroupCollapse(groupLabel: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupLabel)) {
        next.delete(groupLabel);
      } else {
        next.add(groupLabel);
      }
      return next;
    });
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

    const createdTask = createTaskFromRightClick({
      clickedDate: contextMenu.clickedDate,
      parentTaskId: contextMenu.parentTaskId,
      tasks,
    });

    addTask(createdTask);
    setTaskForm(buildInitialTaskForm(createdTask));
    setEditingTaskId(createdTask.taskId);
    setIsCreateModalOpen(false);
    setContextMenu(null);
  }

  function handleTaskFormChange<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setTaskForm((current) => ({ ...current, [key]: value }));
  }

  function handleSaveTask() {
    const normalizedTaskId = taskForm.taskId.trim();
    const normalizedParentTaskId = taskForm.parentTaskId.trim() || undefined;
    const inheritedParentTask = normalizedParentTaskId ? taskById.get(normalizedParentTaskId) : undefined;

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

    if (SYSTEM_RESERVED_CHAR_PATTERN.test(normalizedTaskId) || (normalizedParentTaskId ? SYSTEM_RESERVED_CHAR_PATTERN.test(normalizedParentTaskId) : false)) {
      return;
    }

    const normalizedDescription = taskForm.description.replace(/\r\n/g, '\n');
    const description = normalizedDescription.trim().length > 0 ? normalizedDescription : undefined;

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
        project: inheritedParentTask ? inheritedParentTask.project : (taskForm.project.trim() || undefined),
        category: inheritedParentTask ? inheritedParentTask.category : (taskForm.category.trim() || undefined),
        description,
      });

      if (!normalizedParentTaskId) {
        const affectedTaskIds = collectDescendantTaskIds(existingTask.taskId, childrenByParentId);
        const updatedProject = taskForm.project.trim() || undefined;
        const updatedCategory = taskForm.category.trim() || undefined;

        if (affectedTaskIds.length > 0) {
          const affectedTaskIdSet = new Set(affectedTaskIds);
          updateTasks(
            tasks
              .filter((task) => affectedTaskIdSet.has(task.taskId))
              .map((task) => ({
                ...task,
                project: updatedProject,
                category: updatedCategory,
              })),
          );
        }
      }
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
        project: inheritedParentTask ? inheritedParentTask.project : (taskForm.project.trim() || undefined),
        category: inheritedParentTask ? inheritedParentTask.category : (taskForm.category.trim() || undefined),
        description,
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

  // Build visible rows for a given row list and vertical offset
  function buildVirtualizedRows(
    rows: typeof visibleRows,
    verticalOffset: number,
    firstRow: number,
    lastRow: number,
  ): { left: React.ReactNode[]; right: React.ReactNode[] } {
    const left: React.ReactNode[] = [];
    const right: React.ReactNode[] = [];

    for (let i = firstRow; i <= lastRow && i < rows.length; i++) {
      const { task, depth, start } = rows[i];
      const dragShift = dragShiftByTaskId.get(task.taskId) ?? 0;
      const isDragging = currentDragSnapshot.state?.affectedTaskIds.includes(task.taskId) ?? false;
      const isResizing = currentResizeSnapshot.state?.taskId === task.taskId;
      const resizeOffset = isResizing ? currentResizeSnapshot.offsetDays : 0;

      left.push(
        <div
          key={task.taskId}
          onContextMenu={(event) => handleRowContextMenu(event, task.taskId)}
          style={{
            position: 'absolute',
            top: verticalOffset + i * GANTT_ROW_HEIGHT,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            height: GANTT_ROW_HEIGHT,
            boxSizing: 'border-box',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <GanttRowTree taskName={task.taskName} depth={depth} status={task.status} onTaskNameClick={() => openEditModal(task)} />
        </div>,
      );

      right.push(
        <GanttTimelineRow
          key={task.taskId}
          task={task}
          depth={depth}
          start={start}
          viewStart={viewStart}
          visibleDays={visibleDays}
          dragShift={dragShift}
          isDragging={isDragging}
          resizeOffsetDays={resizeOffset}
          isResizing={isResizing}
          isParentTask={parentTaskIdSet.has(task.taskId)}
          ancestorHighlights={computeAncestorHighlights(task)}
          rowIndex={verticalOffset / GANTT_ROW_HEIGHT + i}
          timelineScrollLeft={timelineScrollLeft}
          timelineViewportWidth={effectiveTimelineViewportWidth}
          onBarMouseDown={handleBarMouseDown}
          onResizeMouseDown={handleResizeHandleMouseDown}
          onBarClick={openEditModal}
          onContextMenu={handleTimelineRowContextMenu}
        />,
      );
    }

    return { left, right };
  }

  // Build the visible rows slice for virtualization
  const virtualizedRowsLeft: React.ReactNode[] = [];
  const virtualizedRowsRight: React.ReactNode[] = [];

  // Grouped sections rendering
  const isGrouped = groupBy !== 'none' && groupedSections !== null;

  if (!isGrouped) {
    const result = buildVirtualizedRows(visibleRows, 0, firstVisibleRow, lastVisibleRow);
    virtualizedRowsLeft.push(...result.left);
    virtualizedRowsRight.push(...result.right);
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
            <Button variant="primary" size="sm" onClick={openCreateModal}>タスク新規登録</Button>
            <Button variant="secondary" size="sm" onClick={handleSortByStartDate}>開始日でソート</Button>
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
              グループ化:
              <select value={groupBy} onChange={handleGroupByChange}>
                {GROUP_BY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
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
            <div ref={headerContentRef} style={{ width: timelineWidth, transform: `translateX(-${timelineScrollLeft}px)` }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleDays}, ${DAY_COLUMN_WIDTH}px)`, background: '#f8fafc' }}>
                {monthSpans.map((month) => (
                  <div
                    key={month.key}
                    style={{
                      gridColumn: `${month.startIndex + 1} / span ${month.span}`,
                      textAlign: 'center',
                      fontWeight: 600,
                      padding: '4px 0 2px',
                      borderLeft: month.startIndex === 0 ? 'none' : '1px solid #cbd5e1',
                    }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${visibleDays}, ${DAY_COLUMN_WIDTH}px)`, borderTop: '1px solid #e2e8f0' }}>
                {dayDates.map((date, index) => (
                  <div key={index} style={{ textAlign: 'center', padding: '2px 0', borderLeft: index === 0 ? 'none' : `1px solid ${monthBoundaryIndexSet.has(index) ? '#cbd5e1' : '#e2e8f0'}`, background: isTodayCell(date) ? '#fed7aa' : isHolidayCell(date) ? '#e5e7eb' : '#f8fafc', fontSize: 12 }}>
                    {date.getDate()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isGrouped ? (
          <div
            ref={bodyScrollRef}
            style={{
              display: 'grid',
              gridTemplateColumns: `${LEFT_COLUMN_WIDTH}px minmax(0, 1fr)`,
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
            onScroll={(event) => {
              setVerticalScrollTop(event.currentTarget.scrollTop);
            }}
          >
            {/* Left column: task names (fixed, no horizontal scroll) */}
            <div>
              {groupedSections!.map((section) => {
                const isCollapsed = collapsedGroups.has(section.groupLabel);
                const sectionRows = isCollapsed
                  ? []
                  : section.layout.rows.filter((row) => !hiddenTaskIdSet.has(row.task.taskId));
                const sectionContentHeight = sectionRows.length * GANTT_ROW_HEIGHT;

                return (
                  <div key={section.groupLabel} style={{ borderTop: '2px solid #cbd5e1' }}>
                    <div
                      onClick={() => toggleGroupCollapse(section.groupLabel)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        height: GROUP_HEADER_HEIGHT,
                        padding: '0 12px',
                        background: '#e2e8f0',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        userSelect: 'none',
                      }}
                    >
                      <span style={{
                        display: 'inline-block',
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s',
                        fontSize: 12,
                      }}>
                        ▼
                      </span>
                      <span>{groupBy === 'project' ? 'PJ' : 'Cat'}: {section.groupLabel}</span>
                      <span style={{ fontWeight: 400, fontSize: 12, color: '#64748b' }}>
                        ({section.layout.rows.length}件)
                      </span>
                    </div>
                    {!isCollapsed && (
                      <div style={{ position: 'relative', height: sectionContentHeight }}>
                        {sectionRows.map((row, i) => (
                          <div
                            key={row.task.taskId}
                            onContextMenu={(event) => handleRowContextMenu(event, row.task.taskId)}
                            style={{
                              position: 'absolute',
                              top: i * GANTT_ROW_HEIGHT,
                              left: 0,
                              right: 0,
                              display: 'flex',
                              alignItems: 'center',
                              height: GANTT_ROW_HEIGHT,
                              boxSizing: 'border-box',
                              borderTop: '1px solid #f1f5f9',
                            }}
                          >
                            <GanttRowTree taskName={row.task.taskName} depth={row.depth} status={row.task.status} onTaskNameClick={() => openEditModal(row.task)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right column: timeline (single horizontal scroll for all groups) */}
            <div ref={timelineScrollRef} onScroll={handleTimelineScroll} style={{ overflowX: 'auto' }}>
              <div style={{ width: timelineWidth }}>
                {groupedSections!.map((section) => {
                  const isCollapsed = collapsedGroups.has(section.groupLabel);
                  const sectionRows = isCollapsed
                    ? []
                    : section.layout.rows.filter((row) => !hiddenTaskIdSet.has(row.task.taskId));
                  const sectionContentHeight = sectionRows.length * GANTT_ROW_HEIGHT;

                  return (
                    <div key={section.groupLabel} style={{ borderTop: '2px solid #cbd5e1' }}>
                      {/* Group header placeholder to match left column height */}
                      <div style={{ height: GROUP_HEADER_HEIGHT, background: '#e2e8f0' }} />
                      {!isCollapsed && (
                        <div style={{ position: 'relative', height: sectionContentHeight }}>
                          <GanttGridBackground
                            visibleDays={visibleDays}
                            dayColumnWidth={DAY_COLUMN_WIDTH}
                            rowCount={sectionRows.length}
                            rowHeight={GANTT_ROW_HEIGHT}
                            dayDates={dayDates}
                            monthBoundaryIndexSet={monthBoundaryIndexSet}
                            isTodayCell={isTodayCell}
                            isHolidayCell={isHolidayCell}
                          />
                          {sectionRows.map((row, i) => {
                            const dragShift = dragShiftByTaskId.get(row.task.taskId) ?? 0;
                            const isDragging = currentDragSnapshot.state?.affectedTaskIds.includes(row.task.taskId) ?? false;
                            const isResizingRow = currentResizeSnapshot.state?.taskId === row.task.taskId;
                            const resizeOffset = isResizingRow ? currentResizeSnapshot.offsetDays : 0;

                            return (
                              <GanttTimelineRow
                                key={row.task.taskId}
                                task={row.task}
                                depth={row.depth}
                                start={row.start}
                                viewStart={viewStart}
                                visibleDays={visibleDays}
                                dragShift={dragShift}
                                isDragging={isDragging}
                                resizeOffsetDays={resizeOffset}
                                isResizing={isResizingRow}
                                isParentTask={parentTaskIdSet.has(row.task.taskId)}
                                ancestorHighlights={computeAncestorHighlights(row.task)}
                                rowIndex={i}
                                timelineScrollLeft={timelineScrollLeft}
                                timelineViewportWidth={effectiveTimelineViewportWidth}
                                onBarMouseDown={handleBarMouseDown}
                                onResizeMouseDown={handleResizeHandleMouseDown}
                                onBarClick={openEditModal}
                                onContextMenu={handleTimelineRowContextMenu}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={bodyScrollRef}
            style={{
              display: 'grid',
              gridTemplateColumns: `${LEFT_COLUMN_WIDTH}px minmax(0, 1fr)`,
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
            onScroll={(event) => {
              setVerticalScrollTop(event.currentTarget.scrollTop);
            }}
          >
            <div style={{ position: 'relative', height: totalContentHeight }}>
              {virtualizedRowsLeft}
            </div>

            <div ref={timelineScrollRef} onScroll={handleTimelineScroll} style={{ overflowX: 'auto' }}>
              <div style={{ width: timelineWidth, position: 'relative', height: totalContentHeight }}>
                <GanttGridBackground
                  visibleDays={visibleDays}
                  dayColumnWidth={DAY_COLUMN_WIDTH}
                  rowCount={visibleRows.length}
                  rowHeight={GANTT_ROW_HEIGHT}
                  dayDates={dayDates}
                  monthBoundaryIndexSet={monthBoundaryIndexSet}
                  isTodayCell={isTodayCell}
                  isHolidayCell={isHolidayCell}
                />
                {virtualizedRowsRight}
              </div>
            </div>
          </div>
        )}
      </div>


      {contextMenu && (
        <GanttContextMenu x={contextMenu.x} y={contextMenu.y} onCreateTask={handleCreateTask} onClose={() => setContextMenu(null)} />
      )}

      {(editingTaskId || isCreateModalOpen) && (
        <TaskModal
          mode={editingTaskId ? 'edit' : 'create'}
          values={modalFormValues}
          editingTask={editingTaskId ? taskById.get(editingTaskId) : undefined}
          projects={projects}
          categories={categories}
          lockProjectAndCategory={isProjectAndCategoryLocked}
          onChange={handleTaskFormChange}
          onSave={handleSaveTask}
          onDelete={editingTaskId ? handleDeleteTask : undefined}
          onClose={closeTaskModal}
        />
      )}
    </section>
  );
}
