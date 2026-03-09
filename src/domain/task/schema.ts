import { Task, TaskValidationError } from './types';

export function validateTask(task: Task): TaskValidationError[] {
  const errors: TaskValidationError[] = [];

  // TODO: zod等のスキーマバリデーションに置き換える。
  if (!task.taskId.trim()) errors.push({ column: 'taskId', message: 'taskId は必須です。' });
  if (!task.taskName.trim()) errors.push({ column: 'taskName', message: 'taskName は必須です。' });
  if (task.startDate > task.endDate) {
    errors.push({ column: 'endDate', message: 'endDate は startDate 以降である必要があります。' });
  }

  return errors;
}
