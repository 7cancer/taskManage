import { Task } from '../../domain/task/types';

const STORAGE_KEY = 'taskManage.tasks';
const CSV_STORAGE_KEY = 'taskManage.tasks.csv';

interface CsvWritable {
  write: (data: Blob | string) => Promise<void>;
  close: () => Promise<void>;
}

export interface CsvFileHandle {
  createWritable: () => Promise<CsvWritable>;
  queryPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
}

let csvExportFileHandle: CsvFileHandle | null = null;

const CSV_COLUMNS: Array<keyof Task> = [
  'taskId',
  'taskName',
  'parentTaskId',
  'status',
  'startDate',
  'endDate',
  'assignee',
  'priority',
  'project',
  'category',
  'description',
  'displayOrder',
];

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

async function ensureWritePermission(fileHandle: CsvFileHandle): Promise<boolean> {
  if (!fileHandle.queryPermission || !fileHandle.requestPermission) {
    return true;
  }

  const current = await fileHandle.queryPermission({ mode: 'readwrite' });
  if (current === 'granted') {
    return true;
  }

  const requested = await fileHandle.requestPermission({ mode: 'readwrite' });
  return requested === 'granted';
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

export function setCsvExportFileHandle(fileHandle: CsvFileHandle | null) {
  csvExportFileHandle = fileHandle;
}

export async function persistTasksToCsvFile(tasks: Task[]): Promise<boolean> {
  if (!csvExportFileHandle) {
    return false;
  }

  const hasPermission = await ensureWritePermission(csvExportFileHandle);
  if (!hasPermission) {
    return false;
  }

  const csvText = serializeTasksToCsv(tasks);
  const writable = await csvExportFileHandle.createWritable();
  await writable.write(csvText);
  await writable.close();
  return true;
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
