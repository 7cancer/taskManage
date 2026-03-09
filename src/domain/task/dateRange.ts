import { Task } from './types';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export function calculateParentDateRange(tasks: Task[]): DateRange | null {
  // TODO: 配下タスクの min(startDate) / max(endDate) を返す実装にする。
  if (tasks.length === 0) return null;
  return { startDate: tasks[0].startDate, endDate: tasks[0].endDate };
}
