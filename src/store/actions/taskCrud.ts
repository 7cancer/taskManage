import { Task } from '../../domain/task/types';
import { useTaskStore } from '../taskStore';

export function addTask(task: Task) {
  // TODO: 重複IDチェックを追加する。
  const current = useTaskStore.getState().tasks;
  useTaskStore.getState().setTasks([...current, task]);
}

export function updateTask(task: Task) {
  const current = useTaskStore.getState().tasks;
  useTaskStore.getState().setTasks(current.map((item) => (item.taskId === task.taskId ? task : item)));
}

export function removeTask(taskId: string) {
  const current = useTaskStore.getState().tasks;
  useTaskStore.getState().setTasks(current.filter((item) => item.taskId !== taskId));
}
