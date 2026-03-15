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

export type GanttGroupBy = 'none' | 'project' | 'category';

export interface GanttGroupSection {
  groupLabel: string;
  layout: GanttLayout;
}

export function calculateGroupedGanttLayout(
  tasks: Task[],
  groupBy: GanttGroupBy,
): GanttGroupSection[] | null {
  if (groupBy === 'none') return null;

  const groups = new Map<string, Task[]>();
  const UNSET_LABEL = '(未設定)';

  for (const task of tasks) {
    const key = (groupBy === 'project' ? task.project : task.category) || UNSET_LABEL;
    const list = groups.get(key);
    if (list) {
      list.push(task);
    } else {
      groups.set(key, [task]);
    }
  }

  const sections: GanttGroupSection[] = [];
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === UNSET_LABEL) return 1;
    if (b === UNSET_LABEL) return -1;
    return a.localeCompare(b);
  });

  for (const key of sortedKeys) {
    const groupTasks = groups.get(key)!;
    const layout = calculateGanttLayout(groupTasks);
    if (layout) {
      sections.push({ groupLabel: key, layout });
    }
  }

  return sections.length > 0 ? sections : null;
}

export function getDateOffsetDays(baseDate: Date, targetDate: Date): number {
  return dateDiffInDays(baseDate, targetDate);
}
