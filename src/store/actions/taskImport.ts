import { Task, TaskValidationError } from '../../domain/task/types';

export interface TaskImportResult {
  validTasks: Task[];
  errors: TaskValidationError[];
}

export function importTasksFromCsvText(_csvText: string): TaskImportResult {
  // TODO: CSV parser を実装し、マッピングとバリデーションを適用する。
  return { validTasks: [], errors: [] };
}
