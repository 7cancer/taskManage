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
    holidays: [],
    projects: [],
    categories: [],
  };
}
