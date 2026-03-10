import { Task } from './types';

export interface TaskTreeNode {
  task: Task;
  children: TaskTreeNode[];
}

function sortByOrder(a: Task, b: Task): number {
  if (a.displayOrder !== b.displayOrder) {
    return a.displayOrder - b.displayOrder;
  }

  return a.taskId.localeCompare(b.taskId);
}

export function buildTaskTree(tasks: Task[]): TaskTreeNode[] {
  const taskMap = new Map(tasks.map((task) => [task.taskId, task]));
  const nodeMap = new Map(tasks.map((task) => [task.taskId, { task, children: [] as TaskTreeNode[] }]));
  const roots: TaskTreeNode[] = [];

  for (const task of [...tasks].sort(sortByOrder)) {
    const node = nodeMap.get(task.taskId);
    if (!node) continue;

    const parentId = task.parentTaskId;
    if (!parentId || !taskMap.has(parentId) || parentId === task.taskId) {
      roots.push(node);
      continue;
    }

    const parentNode = nodeMap.get(parentId);
    if (!parentNode) {
      roots.push(node);
      continue;
    }

    parentNode.children.push(node);
  }

  const sortNodes = (nodes: TaskTreeNode[]) => {
    nodes.sort((a, b) => sortByOrder(a.task, b.task));
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
}
