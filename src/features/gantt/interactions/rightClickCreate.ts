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
  const parentTask = parentTaskId ? tasks.find((task) => task.taskId === parentTaskId) : undefined;

  return {
    taskId: generateTaskId('TASK'),
    taskName: '新規タスク',
    parentTaskId,
    status: 'todo',
    startDate: toIsoDateString(clickedDate),
    endDate: toIsoDateString(clickedDate),
    project: parentTask?.project,
    category: parentTask?.category,
    displayOrder: maxDisplayOrder + 1,
  };
}
