import { TaskStatus } from '../domain/task/types';
import { useTaskStore } from './taskStore';

export function useTasksByStatus(status: TaskStatus) {
  return useTaskStore((state) => state.tasks.filter((task) => task.status === status));
}
