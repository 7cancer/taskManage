import { Task } from '../../domain/task/types';

const STORAGE_KEY = 'taskManage.tasks';

export function saveTasksToLocalStorage(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function loadTasksFromLocalStorage(): Task[] {
  const value = localStorage.getItem(STORAGE_KEY);
  if (!value) return [];

  // TODO: パース後の型検証を追加する。
  return JSON.parse(value) as Task[];
}
