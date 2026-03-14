import { memo, MouseEvent, useCallback } from 'react';
import { TASK_STATUS_COLORS } from '../../../domain/task/constants';
import { Task, TaskStatus } from '../../../domain/task/types';
import { getDateOffsetDays } from '../lib/ganttLayout';

const BAR_COLORS: Record<TaskStatus, string> = TASK_STATUS_COLORS;

const GANTT_ROW_HEIGHT = 46;
const DAY_COLUMN_WIDTH = 28;
const PARENT_BAR_HEIGHT = 34;
const CHILD_BAR_HEIGHT = 28;
const DESCENDANT_BAR_HEIGHT = 22;

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

function shiftTaskDateText(dateText: string, offsetDays: number): string {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  const next = new Date(date);
  next.setDate(next.getDate() + offsetDays);
  return formatLabel(next);
}

function clamp(number: number, min: number, max: number): number {
  return Math.min(Math.max(number, min), max);
}

interface AncestorHighlight {
  left: number;
  width: number;
  color: string;
}

export interface GanttTimelineRowProps {
  task: Task;
  depth: number;
  start: Date;
  viewStart: Date;
  visibleDays: number;
  dragShift: number;
  isDragging: boolean;
  resizeOffsetDays: number;
  isResizing: boolean;
  isParentTask: boolean;
  ancestorHighlights: AncestorHighlight[];
  rowIndex: number;
  timelineScrollLeft: number;
  timelineViewportWidth: number;
  onBarMouseDown: (event: MouseEvent<HTMLDivElement>, task: Task) => void;
  onResizeMouseDown: (event: MouseEvent<HTMLDivElement>, task: Task) => void;
  onBarClick: (task: Task) => void;
  onContextMenu: (event: MouseEvent<HTMLDivElement>, parentTaskId: string) => void;
}

export const GanttTimelineRow = memo(function GanttTimelineRow({
  task,
  depth,
  start,
  viewStart,
  visibleDays,
  dragShift,
  isDragging,
  resizeOffsetDays,
  isResizing,
  ancestorHighlights,
  rowIndex,
  timelineScrollLeft,
  timelineViewportWidth,
  onBarMouseDown,
  onResizeMouseDown,
  onBarClick,
  onContextMenu,
}: GanttTimelineRowProps) {
  const effectiveStart =
    dragShift !== 0 ? new Date(shiftTaskDateText(task.startDate, dragShift)) : start;
  const effectiveEndDateText = isResizing
    ? shiftTaskDateText(task.endDate, resizeOffsetDays)
    : dragShift !== 0
      ? shiftTaskDateText(task.endDate, dragShift)
      : task.endDate;
  const effectiveEnd = new Date(effectiveEndDateText);

  const startOffsetDays = getDateOffsetDays(viewStart, effectiveStart);
  const endOffsetDays = getDateOffsetDays(viewStart, effectiveEnd);

  const visibleStartDay = clamp(startOffsetDays, 0, visibleDays);
  const visibleEndDay = clamp(endOffsetDays + 1, 0, visibleDays);
  const visibleDurationDays = Math.max(visibleEndDay - visibleStartDay, 0);

  const handleContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      onContextMenu(event, task.taskId);
    },
    [onContextMenu, task.taskId],
  );

  const handleBarClick = useCallback(() => {
    onBarClick(task);
  }, [onBarClick, task]);

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      onBarMouseDown(event, task);
    },
    [onBarMouseDown, task],
  );

  const handleResizeDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      onResizeMouseDown(event, task);
    },
    [onResizeMouseDown, task],
  );

  // Task name label logic
  const barStartDay = startOffsetDays;
  const barEndDayExclusive = endOffsetDays + 1;
  const barLeft = barStartDay * DAY_COLUMN_WIDTH;
  const barRight = barEndDayExclusive * DAY_COLUMN_WIDTH;
  const viewLeft = timelineScrollLeft;
  const viewRight = timelineScrollLeft + timelineViewportWidth;
  const edgePadding = 8;
  const labelTop = GANTT_ROW_HEIGHT / 2 - 8;

  let taskLabel: React.ReactNode = null;

  if (barRight <= viewLeft) {
    const labelLeft = viewLeft + edgePadding;
    const labelWidth = Math.max(timelineViewportWidth - edgePadding * 2, 20);
    taskLabel = (
      <div
        style={{
          position: 'absolute',
          left: labelLeft,
          width: labelWidth,
          top: labelTop,
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
  } else if (barLeft >= viewRight) {
    const labelWidth = Math.max(timelineViewportWidth - edgePadding * 2, 20);
    const labelLeft = Math.max(viewRight - labelWidth - edgePadding, viewLeft + edgePadding);
    taskLabel = (
      <div
        style={{
          position: 'absolute',
          left: labelLeft,
          width: labelWidth,
          top: labelTop,
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
  } else {
    const visibleBarLeft = Math.max(barLeft, viewLeft);
    const labelLeft = Math.max(visibleBarLeft + edgePadding, viewLeft + edgePadding);
    const labelMaxRight = viewRight - 6;
    const labelWidth = labelMaxRight - labelLeft;

    if (labelWidth > 12) {
      taskLabel = (
        <div
          style={{
            position: 'absolute',
            left: labelLeft,
            width: labelWidth,
            top: labelTop,
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
  }

  return (
    <div
      onContextMenu={handleContextMenu}
      style={{
        position: 'absolute',
        top: rowIndex * GANTT_ROW_HEIGHT,
        left: 0,
        right: 0,
        height: GANTT_ROW_HEIGHT,
        boxSizing: 'border-box',
      }}
    >
      {ancestorHighlights.map((highlight, index) => (
        <div
          key={`ancestor-${index}`}
          style={{
            position: 'absolute',
            left: highlight.left,
            width: highlight.width,
            top: 0,
            bottom: 0,
            background: highlight.color,
            opacity: 0.08,
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
          }}
        />
      ))}
      {visibleDurationDays > 0 && (
        <div
          title={`taskId: ${task.taskId} | ${isDragging ? shiftTaskDateText(task.startDate, dragShift) : task.startDate} - ${isDragging ? shiftTaskDateText(task.endDate, dragShift) : task.endDate}`}
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
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onClick={handleBarClick}
          onMouseDown={handleMouseDown}
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
            onMouseDown={handleResizeDown}
          />
        </div>
      )}
      {taskLabel}
    </div>
  );
});
