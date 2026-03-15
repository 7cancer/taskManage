import { TaskMeta } from '../../domain/task/meta';
import { Task } from '../../domain/task/types';

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

interface CsvSerializeRequest {
  id: number;
  tasks: Task[];
  meta?: TaskMeta;
}

interface CsvSerializeSuccess {
  id: number;
  csvText: string;
}

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

function serializeTasksToCsv(tasks: Task[], meta?: TaskMeta): string {
  const header = CSV_COLUMNS.join(',');
  const lines = tasks.map((task) =>
    CSV_COLUMNS.map((column) => {
      const rawValue = task[column];
      return escapeCsvValue(rawValue == null ? '' : String(rawValue));
    }).join(','),
  );

  const holidays = normalizeHolidays(meta?.holidays ?? []);
  const metaLines = ['#meta,version,1', ['#meta', 'holidays', ...holidays].map(escapeCsvValue).join(',')];

  return [...metaLines, header, ...lines].join('\n');
}

self.onmessage = (event: MessageEvent<CsvSerializeRequest>) => {
  const { id, tasks, meta } = event.data;
  const response: CsvSerializeSuccess = {
    id,
    csvText: serializeTasksToCsv(tasks, meta),
  };

  self.postMessage(response);
};
