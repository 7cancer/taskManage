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

function serializeTasksToCsv(tasks: Task[]): string {
  const header = CSV_COLUMNS.join(',');
  const lines = tasks.map((task) =>
    CSV_COLUMNS.map((column) => {
      const rawValue = task[column];
      return escapeCsvValue(rawValue == null ? '' : String(rawValue));
    }).join(','),
  );

  return [header, ...lines].join('\n');
}

self.onmessage = (event: MessageEvent<CsvSerializeRequest>) => {
  const { id, tasks } = event.data;
  const response: CsvSerializeSuccess = {
    id,
    csvText: serializeTasksToCsv(tasks),
  };

  self.postMessage(response);
};
