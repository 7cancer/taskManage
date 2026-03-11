export type TaskStatus = 'todo' | 'inProgress' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  taskId: string;
  taskName: string;
  parentTaskId?: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  assignee?: string;
  priority?: TaskPriority;
  project?: string;
  category?: string;
  description?: string;
  displayOrder: number;
}

export interface TaskDraft extends Omit<Task, 'taskId'> {
  taskId?: string;
}

export interface TaskValidationError {
  line?: number;
  column?: keyof Task | string;
  message: string;
}
