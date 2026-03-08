import { create } from 'zustand';
import { Task } from '../domain/task/types';

interface TaskStoreState {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
}

export const useTaskStore = create<TaskStoreState>((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
}));
