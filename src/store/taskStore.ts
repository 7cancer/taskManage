import { create } from 'zustand';
import { createDefaultTaskMeta, TaskMeta } from '../domain/task/meta';
import { Task } from '../domain/task/types';

interface TaskStoreState {
  tasks: Task[];
  meta: TaskMeta;
  taskIndexById: Record<string, number>;
  setTasks: (tasks: Task[]) => void;
  setSnapshot: (tasks: Task[], meta: TaskMeta) => void;
  upsertTasks: (tasks: Task[]) => void;
  removeTasksById: (taskIds: string[]) => void;
  setHolidays: (holidays: string[]) => void;
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
  meta: createDefaultTaskMeta(),
  taskIndexById: {},
  setTasks: (tasks) =>
    set((state) => ({
      tasks,
      meta: state.meta,
      taskIndexById: buildTaskIndex(tasks),
    })),
  setSnapshot: (tasks, meta) =>
    set({
      tasks,
      meta,
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
        meta: state.meta,
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
        meta: state.meta,
        taskIndexById: buildTaskIndex(nextTasks),
      };
    }),
  setHolidays: (holidays) =>
    set((state) => ({
      tasks: state.tasks,
      meta: {
        ...state.meta,
        holidays,
      },
      taskIndexById: state.taskIndexById,
    })),
}));
