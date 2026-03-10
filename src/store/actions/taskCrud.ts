import { Task } from '../../domain/task/types';
import { saveTasksToCsvStorage } from './taskPersistence';
import { useTaskStore } from '../taskStore';

function commitTasks(nextTasks: Task[]) {
  useTaskStore.getState().setTasks(nextTasks);
  saveTasksToCsvStorage(nextTasks);
}

export function addTask(task: Task) {
  // TODO: 重複IDチェックを追加する。
  const current = useTaskStore.getState().tasks;
  commitTasks([...current, task]);
}

export function updateTask(task: Task) {
  const current = useTaskStore.getState().tasks;
  commitTasks(current.map((item) => (item.taskId === task.taskId ? task : item)));
}

export function updateTasks(tasks: Task[]) {
  const updateMap = new Map(tasks.map((task) => [task.taskId, task]));
  const current = useTaskStore.getState().tasks;
  commitTasks(current.map((item) => updateMap.get(item.taskId) ?? item));
}

export function removeTask(taskId: string) {
  const current = useTaskStore.getState().tasks;
  commitTasks(current.filter((item) => item.taskId !== taskId));
}

export function removeTasks(taskIds: string[]) {
  const removeIdSet = new Set(taskIds);
  const current = useTaskStore.getState().tasks;
  commitTasks(current.filter((item) => !removeIdSet.has(item.taskId)));
}
