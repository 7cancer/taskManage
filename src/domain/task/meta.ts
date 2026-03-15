export interface TaskMeta {
  holidays: string[];
}

export interface TaskSnapshot {
  tasks: import('./types').Task[];
  meta: TaskMeta;
}

export function createDefaultTaskMeta(): TaskMeta {
  return {
    holidays: [],
  };
}
