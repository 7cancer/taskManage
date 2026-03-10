import { buildTaskTree, TaskTreeNode } from '../../../domain/task/hierarchy';
import { Task } from '../../../domain/task/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface GanttRowItem {
  task: Task;
  depth: number;
  start: Date;
  end: Date;
}

export interface GanttLayout {
  rows: GanttRowItem[];
  minStart: Date;
  maxEnd: Date;
  totalDays: number;
}

function parseDate(dateText: string): Date | null {
  const timestamp = Date.parse(dateText);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp);
}

function dateDiffInDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

function flatten(nodes: TaskTreeNode[], depth: number, result: GanttRowItem[]) {
  for (const node of nodes) {
    const start = parseDate(node.task.startDate);
    const end = parseDate(node.task.endDate);

    if (start && end && end.getTime() >= start.getTime()) {
      result.push({ task: node.task, depth, start, end });
    }

    flatten(node.children, depth + 1, result);
  }
}

export function calculateGanttLayout(tasks: Task[]): GanttLayout | null {
  const rows: GanttRowItem[] = [];
  flatten(buildTaskTree(tasks), 0, rows);

  if (rows.length === 0) {
    return null;
  }

  const minStart = rows.reduce((min, row) => (row.start < min ? row.start : min), rows[0].start);
  const maxEnd = rows.reduce((max, row) => (row.end > max ? row.end : max), rows[0].end);
  const totalDays = Math.max(dateDiffInDays(minStart, maxEnd) + 1, 1);

  return {
    rows,
    minStart,
    maxEnd,
    totalDays,
  };
}

export function getDateOffsetDays(baseDate: Date, targetDate: Date): number {
  return dateDiffInDays(baseDate, targetDate);
}
