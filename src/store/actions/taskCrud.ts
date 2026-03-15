import { Task } from '../../domain/task/types';
import { saveTasksToCsvStorage } from './taskPersistence';
import { useTaskStore } from '../taskStore';

function commitFromStoreSnapshot() {
  const { tasks, meta } = useTaskStore.getState();
  saveTasksToCsvStorage(tasks, meta);
}

export function addTask(task: Task) {
  // TODO: 重複IDチェックを追加する。
  useTaskStore.getState().upsertTasks([task]);
  commitFromStoreSnapshot();
}

export function updateTask(task: Task) {
  useTaskStore.getState().upsertTasks([task]);
  commitFromStoreSnapshot();
}

export function updateTasks(tasks: Task[]) {
  useTaskStore.getState().upsertTasks(tasks);
  commitFromStoreSnapshot();
}

export function removeTask(taskId: string) {
  useTaskStore.getState().removeTasksById([taskId]);
  commitFromStoreSnapshot();
}

export function removeTasks(taskIds: string[]) {
  useTaskStore.getState().removeTasksById(taskIds);
  commitFromStoreSnapshot();
}

export function replaceTasks(tasks: Task[]) {
  useTaskStore.getState().setTasks(tasks);
  const { meta } = useTaskStore.getState();
  saveTasksToCsvStorage(tasks, meta);
}
