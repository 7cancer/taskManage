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

export async function serializeTasksToCsvAsync(tasks: Task[]): Promise<string> {
  const worker = getCsvWorker();
  if (!worker) {
    return serializeTasksToCsv(tasks);
  }

  const id = ++csvWorkerRequestId;

  return new Promise<string>((resolve) => {
    csvWorkerResolvers.set(id, {
      resolve,
      reject: () => resolve(serializeTasksToCsv(tasks)),
    });
    worker.postMessage({ id, tasks });
  });
}

export function setCsvExportFileHandle(fileHandle: CsvFileHandle | null) {
  csvExportFileHandle = fileHandle;
}

export async function persistTasksToCsvFile(tasks: Task[]): Promise<boolean> {
  if (!csvExportFileHandle) {
    return false;
  }

  const writeId = ++latestCsvFileWriteId;
  const hasPermission = await ensureWritePermission(csvExportFileHandle);
  if (!hasPermission || writeId !== latestCsvFileWriteId) {
    return false;
  }

  const csvText = await serializeTasksToCsvAsync(tasks);
  if (writeId !== latestCsvFileWriteId) {
    return false;
  }

  const writable = await csvExportFileHandle.createWritable();
  await writable.write(csvText);
  await writable.close();
  return true;
}

export function saveTasksToCsvStorage(tasks: Task[]) {
  const writeId = ++latestCsvStorageWriteId;

  void serializeTasksToCsvAsync(tasks)
    .then((csvText) => {
      if (writeId !== latestCsvStorageWriteId) return;
      localStorage.setItem(CSV_STORAGE_KEY, csvText);
    })
    .catch(() => {
      if (writeId !== latestCsvStorageWriteId) return;
      localStorage.setItem(CSV_STORAGE_KEY, serializeTasksToCsv(tasks));
    });
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
