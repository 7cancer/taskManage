import { TaskStatus } from './types';

export const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'inProgress', 'review', 'done'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '未着手',
  inProgress: '対応中',
  review: '確認中',
  done: '完了',
};
