import { Task, TaskPriority, TaskStatus, TaskValidationError } from '../../domain/task/types';
import { validateTask } from '../../domain/task/schema';

export interface TaskImportResult {
  validTasks: Task[];
  errors: TaskValidationError[];
}

const REQUIRED_COLUMNS = ['taskId', 'taskName', 'status', 'startDate', 'endDate', 'displayOrder'] as const;

function parseCsvLine(line: string): string[] {
  // NOTE: MVP実装。クォート対応は次ステップで追加する。
  return line.split(',').map((value) => value.trim());
}

function toTaskStatus(value: string): TaskStatus | null {
  if (value === 'todo' || value === 'inProgress' || value === 'review' || value === 'done') {
    return value;
  }
  return null;
}

function toTaskPriority(value: string): TaskPriority | undefined {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') {
    return value;
  }
  return undefined;
}

export function importTasksFromCsvText(csvText: string): TaskImportResult {
  const errors: TaskValidationError[] = [];
  const validTasks: Task[] = [];

  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { validTasks, errors: [{ message: 'CSVが空です。' }] };
  }

  const headers = parseCsvLine(lines[0]);

  for (const requiredColumn of REQUIRED_COLUMNS) {
    if (!headers.includes(requiredColumn)) {
      errors.push({ column: requiredColumn, message: `必須列 ${requiredColumn} がありません。` });
    }
  }

  if (errors.length > 0) {
    return { validTasks, errors };
  }

  const headerIndexMap = new Map(headers.map((header, index) => [header, index]));

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cols = parseCsvLine(lines[lineIndex]);
    const lineNo = lineIndex + 1;

    const statusRaw = cols[headerIndexMap.get('status') ?? -1] ?? '';
    const status = toTaskStatus(statusRaw);
    if (!status) {
      errors.push({ line: lineNo, column: 'status', message: `無効なstatusです: ${statusRaw}` });
      continue;
    }

    const displayOrderRaw = cols[headerIndexMap.get('displayOrder') ?? -1] ?? '';
    const displayOrder = Number.parseInt(displayOrderRaw, 10);
    if (Number.isNaN(displayOrder)) {
      errors.push({ line: lineNo, column: 'displayOrder', message: `displayOrderが数値ではありません: ${displayOrderRaw}` });
      continue;
    }

    const task: Task = {
      taskId: cols[headerIndexMap.get('taskId') ?? -1] ?? '',
      taskName: cols[headerIndexMap.get('taskName') ?? -1] ?? '',
      parentTaskId: cols[headerIndexMap.get('parentTaskId') ?? -1] || undefined,
      status,
      startDate: cols[headerIndexMap.get('startDate') ?? -1] ?? '',
      endDate: cols[headerIndexMap.get('endDate') ?? -1] ?? '',
      assignee: cols[headerIndexMap.get('assignee') ?? -1] || undefined,
      priority: toTaskPriority(cols[headerIndexMap.get('priority') ?? -1] ?? ''),
      project: cols[headerIndexMap.get('project') ?? -1] || undefined,
      category: cols[headerIndexMap.get('category') ?? -1] || undefined,
      description: cols[headerIndexMap.get('description') ?? -1] || undefined,
      displayOrder,
    };

    const validationErrors = validateTask(task).map((error) => ({
      ...error,
      line: lineNo,
    }));

    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
      continue;
    }

    validTasks.push(task);
  }

  return { validTasks, errors };
}
