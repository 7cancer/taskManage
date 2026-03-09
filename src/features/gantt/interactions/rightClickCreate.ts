import { Task } from '../../../domain/task/types';
import { toIsoDateString } from '../../../shared/lib/date';
import { generateTaskId } from '../../../shared/lib/id';

interface CreateTaskOptions {
  clickedDate: Date;
  tasks: Task[];
  parentTaskId?: string;
}

export function createTaskFromRightClick({ clickedDate, tasks, parentTaskId }: CreateTaskOptions): Task {
  const maxDisplayOrder = tasks.reduce((max, task) => (task.displayOrder > max ? task.displayOrder : max), 0);

  return {
    taskId: generateTaskId('TASK'),
    taskName: '新規タスク',
    parentTaskId,
    status: 'todo',
    startDate: toIsoDateString(clickedDate),
    endDate: toIsoDateString(clickedDate),
    displayOrder: maxDisplayOrder + 1,
  };
}
