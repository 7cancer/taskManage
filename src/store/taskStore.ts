import { create } from 'zustand';
import { Task } from '../domain/task/types';

interface TaskStoreState {
  tasks: Task[];
  taskIndexById: Record<string, number>;
  setTasks: (tasks: Task[]) => void;
  upsertTasks: (tasks: Task[]) => void;
  removeTasksById: (taskIds: string[]) => void;
}

function buildTaskIndex(tasks: Task[]): Record<string, number> {
  const index: Record<string, number> = {};

  tasks.forEach((task, position) => {
    index[task.taskId] = position;
  });

  return index;
}

export const useTaskStore = create<TaskStoreState>((set) => ({
  tasks: [],
  taskIndexById: {},
  setTasks: (tasks) =>
    set({
      tasks,
      taskIndexById: buildTaskIndex(tasks),
    }),
  upsertTasks: (incomingTasks) =>
    set((state) => {
      if (incomingTasks.length === 0) return state;

      const nextTasks = [...state.tasks];
      const nextIndexById = { ...state.taskIndexById };

      incomingTasks.forEach((task) => {
        const existingIndex = nextIndexById[task.taskId];

        if (existingIndex == null) {
          nextIndexById[task.taskId] = nextTasks.length;
          nextTasks.push(task);
          return;
        }

        nextTasks[existingIndex] = task;
      });

      return {
        tasks: nextTasks,
        taskIndexById: nextIndexById,
      };
    }),
  removeTasksById: (taskIds) =>
    set((state) => {
      if (taskIds.length === 0) return state;

      const removeIdSet = new Set(taskIds);
      const nextTasks = state.tasks.filter((task) => !removeIdSet.has(task.taskId));

      if (nextTasks.length === state.tasks.length) {
        return state;
      }

      return {
        tasks: nextTasks,
        taskIndexById: buildTaskIndex(nextTasks),
      };
    }),
}));
