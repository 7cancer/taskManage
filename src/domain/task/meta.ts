import { DEFAULT_HOLIDAYS } from './defaultHolidays';

export interface TaskMeta {
  holidays: string[];
  projects: string[];
  categories: string[];
}

export interface TaskSnapshot {
  tasks: import('./types').Task[];
  meta: TaskMeta;
}

export function createDefaultTaskMeta(): TaskMeta {
  return {
    holidays: [...DEFAULT_HOLIDAYS],
    projects: [],
    categories: [],
  };
}
