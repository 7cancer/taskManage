import { Task } from './types';

export function sortTasksByDisplayOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.displayOrder - b.displayOrder);
}
