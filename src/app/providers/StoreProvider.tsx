import { PropsWithChildren, useEffect } from 'react';
import { persistTasksToCsvFile, saveTasksToCsvStorage, saveTasksToLocalStorage } from '../../store/actions/taskPersistence';
import { useTaskStore } from '../../store/taskStore';

export function StoreProvider({ children }: PropsWithChildren) {
  const tasks = useTaskStore((state) => state.tasks);

  useEffect(() => {
    saveTasksToLocalStorage(tasks);
    saveTasksToCsvStorage(tasks);

    void persistTasksToCsvFile(tasks).catch((error) => {
      console.warn('[CSV File Sync] ファイルへの保存に失敗しました', error);
    });
  }, [tasks]);

  return <>{children}</>;
}
