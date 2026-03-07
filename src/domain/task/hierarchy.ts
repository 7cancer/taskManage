import { Task } from './types';

export interface TaskTreeNode {
  task: Task;
  children: TaskTreeNode[];
}

export function buildTaskTree(tasks: Task[]): TaskTreeNode[] {
  // TODO: parentTaskId に基づいて階層化し、循環検知も追加する。
  const roots = tasks.filter((task) => !task.parentTaskId);
  return roots.map((task) => ({ task, children: [] }));
}
