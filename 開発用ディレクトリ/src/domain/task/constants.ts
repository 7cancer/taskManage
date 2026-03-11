import { TaskStatus } from './types';

export const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'inProgress', 'review', 'done'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '未対応',
  inProgress: '処理中',
  review: '処理済み',
  done: '完了',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#E97B93',
  inProgress: '#0794B8',
  review: '#67B56A',
  done: '#B8C73D',
};
