import { PropsWithChildren, useEffect } from 'react';
import { saveTasksToCsvStorage, saveTasksToLocalStorage } from '../../store/actions/taskPersistence';
import { useTaskStore } from '../../store/taskStore';

export function StoreProvider({ children }: PropsWithChildren) {
  const tasks = useTaskStore((state) => state.tasks);

  useEffect(() => {
    saveTasksToLocalStorage(tasks);
    saveTasksToCsvStorage(tasks);
  }, [tasks]);

  return <>{children}</>;
}
