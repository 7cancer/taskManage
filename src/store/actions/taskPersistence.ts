import { createDefaultTaskMeta, TaskMeta, TaskSnapshot } from '../../domain/task/meta';
import { importTasksFromCsvText } from './taskImport';
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

interface CsvSerializeSuccess {
  id: number;
  csvText: string;
}

let csvExportFileHandle: CsvFileHandle | null = null;
let csvWorker: Worker | null = null;
let csvWorkerRequestId = 0;
let latestCsvStorageWriteId = 0;
let latestCsvFileWriteId = 0;
const csvWorkerResolvers = new Map<number, { resolve: (csvText: string) => void; reject: () => void }>();

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

function normalizeHolidays(holidays: string[]): string[] {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  return [...new Set(holidays.filter((holiday) => isoDatePattern.test(holiday)).sort())];
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

function getCsvWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }

  if (csvWorker) {
    return csvWorker;
  }

  try {
    csvWorker = new Worker(new URL('../workers/csvSerializeWorker.ts', import.meta.url), { type: 'module' });

    csvWorker.onmessage = (event: MessageEvent<CsvSerializeSuccess>) => {
      const callbacks = csvWorkerResolvers.get(event.data.id);
      if (!callbacks) return;

      csvWorkerResolvers.delete(event.data.id);
      callbacks.resolve(event.data.csvText);
    };

    csvWorker.onerror = () => {
      csvWorkerResolvers.forEach(({ reject }) => reject());
      csvWorkerResolvers.clear();
      csvWorker?.terminate();
      csvWorker = null;
    };

    return csvWorker;
  } catch {
    return null;
  }
}

export function serializeTasksToCsv(tasks: Task[], meta: TaskMeta = createDefaultTaskMeta()): string {
  const header = CSV_COLUMNS.join(',');
  const lines = tasks.map((task) =>
    CSV_COLUMNS.map((column) => {
      const rawValue = task[column];
      return escapeCsvValue(rawValue == null ? '' : String(rawValue));
    }).join(','),
  );

  const normalizedMeta: TaskMeta = {
    holidays: normalizeHolidays(meta.holidays),
    projects: [...meta.projects],
    categories: [...meta.categories],
  };

  const metaLines = [
    '#meta,version,1',
    ['#meta', 'holidays', ...normalizedMeta.holidays].map(escapeCsvValue).join(','),
    ['#meta', 'projects', ...normalizedMeta.projects].map(escapeCsvValue).join(','),
    ['#meta', 'categories', ...normalizedMeta.categories].map(escapeCsvValue).join(','),
  ];
  return [...metaLines, header, ...lines].join('\n');
}

export async function serializeTasksToCsvAsync(tasks: Task[], meta: TaskMeta = createDefaultTaskMeta()): Promise<string> {
  const worker = getCsvWorker();
  if (!worker) {
    return serializeTasksToCsv(tasks, meta);
  }

  const id = ++csvWorkerRequestId;

  return new Promise<string>((resolve) => {
    csvWorkerResolvers.set(id, {
      resolve,
      reject: () => resolve(serializeTasksToCsv(tasks, meta)),
    });
    worker.postMessage({ id, tasks, meta });
  });
}

export function parseTaskSnapshotFromCsvText(csvText: string): TaskSnapshot {
  const importResult = importTasksFromCsvText(csvText);

  return {
    tasks: importResult.validTasks,
    meta: {
      holidays: normalizeHolidays(importResult.meta.holidays),
      projects: importResult.meta.projects,
      categories: importResult.meta.categories,
    },
  };
}

export function setCsvExportFileHandle(fileHandle: CsvFileHandle | null) {
  csvExportFileHandle = fileHandle;
}

export async function persistTasksToCsvFile(tasks: Task[], meta: TaskMeta = createDefaultTaskMeta()): Promise<boolean> {
  if (!csvExportFileHandle) {
    return false;
  }

  const writeId = ++latestCsvFileWriteId;
  const hasPermission = await ensureWritePermission(csvExportFileHandle);
  if (!hasPermission || writeId !== latestCsvFileWriteId) {
    return false;
  }

  const csvText = await serializeTasksToCsvAsync(tasks, meta);
  if (writeId !== latestCsvFileWriteId) {
    return false;
  }

  const writable = await csvExportFileHandle.createWritable();
  await writable.write(csvText);
  await writable.close();
  return true;
}

export function saveTasksToCsvStorage(tasks: Task[], meta: TaskMeta = createDefaultTaskMeta()) {
  const writeId = ++latestCsvStorageWriteId;

  void serializeTasksToCsvAsync(tasks, meta)
    .then((csvText) => {
      if (writeId !== latestCsvStorageWriteId) return;
      localStorage.setItem(CSV_STORAGE_KEY, csvText);
    })
    .catch(() => {
      if (writeId !== latestCsvStorageWriteId) return;
      localStorage.setItem(CSV_STORAGE_KEY, serializeTasksToCsv(tasks, meta));
    });
}

export function loadTasksCsvFromLocalStorage(): string {
  return localStorage.getItem(CSV_STORAGE_KEY) ?? '';
}

export function saveSnapshotToLocalStorage(tasks: Task[], meta: TaskMeta) {
  const snapshot: TaskSnapshot = {
    tasks,
    meta: {
      holidays: normalizeHolidays(meta.holidays),
      projects: meta.projects,
      categories: meta.categories,
    },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadSnapshotFromLocalStorage(): TaskSnapshot {
  const value = localStorage.getItem(STORAGE_KEY);
  if (!value) {
    return { tasks: [], meta: createDefaultTaskMeta() };
  }

  const parsed = JSON.parse(value) as Task[] | TaskSnapshot;
  if (Array.isArray(parsed)) {
    return { tasks: parsed, meta: createDefaultTaskMeta() };
  }

  return {
    tasks: parsed.tasks ?? [],
    meta: {
      holidays: normalizeHolidays(parsed.meta?.holidays ?? []),
      projects: parsed.meta?.projects ?? [],
      categories: parsed.meta?.categories ?? [],
    },
  };
}
