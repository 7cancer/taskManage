import { Task } from '../../domain/task/types';

const STORAGE_KEY = 'taskManage.tasks';
const CSV_STORAGE_KEY = 'taskManage.tasks.csv';

const CSV_COLUMNS: Array<keyof Task> = [
  'taskId',
  'taskName',
  'parentTaskId',
  'status',
  'startDate',
  'endDate',
  'assignee',
  'priority',
  'description',
  'displayOrder',
];

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function serializeTasksToCsv(tasks: Task[]): string {
  const header = CSV_COLUMNS.join(',');
  const lines = tasks.map((task) =>
    CSV_COLUMNS.map((column) => {
      const rawValue = task[column];
      return escapeCsvValue(rawValue == null ? '' : String(rawValue));
    }).join(','),
  );

  return [header, ...lines].join('\n');
}

export function saveTasksToCsvStorage(tasks: Task[]) {
  localStorage.setItem(CSV_STORAGE_KEY, serializeTasksToCsv(tasks));
}

export function loadTasksCsvFromLocalStorage(): string {
  return localStorage.getItem(CSV_STORAGE_KEY) ?? '';
}

export function saveTasksToLocalStorage(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function loadTasksFromLocalStorage(): Task[] {
  const value = localStorage.getItem(STORAGE_KEY);
  if (!value) return [];

  // TODO: パース後の型検証を追加する。
  return JSON.parse(value) as Task[];
}
