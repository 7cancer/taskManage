import { PropsWithChildren, useEffect, useState } from 'react';
import {
  loadSnapshotFromLocalStorage,
  loadTasksCsvFromLocalStorage,
  parseTaskSnapshotFromCsvText,
  persistTasksToCsvFile,
  saveSnapshotToLocalStorage,
  saveTasksToCsvStorage,
} from '../../store/actions/taskPersistence';
import { useTaskStore } from '../../store/taskStore';
import { createDefaultTaskMeta } from '../../domain/task/meta';

export function StoreProvider({ children }: PropsWithChildren) {
  const tasks = useTaskStore((state) => state.tasks);
  const meta = useTaskStore((state) => state.meta);
  const setSnapshot = useTaskStore((state) => state.setSnapshot);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let disposed = false;

    function hydrateStore() {
      const snapshot = loadSnapshotFromLocalStorage();
      if (snapshot.tasks.length > 0 || snapshot.meta.holidays.length > 0) {
        if (!disposed) {
          setSnapshot(snapshot.tasks, snapshot.meta);
          setIsHydrated(true);
        }
        return;
      }

      const csvText = loadTasksCsvFromLocalStorage();
      if (csvText) {
        const fallbackSnapshot = parseTaskSnapshotFromCsvText(csvText);
        if (!disposed) {
          setSnapshot(fallbackSnapshot.tasks, fallbackSnapshot.meta);
          setIsHydrated(true);
        }
        return;
      }

      if (!disposed) {
        setSnapshot([], createDefaultTaskMeta());
        setIsHydrated(true);
      }
    }

    hydrateStore();

    return () => {
      disposed = true;
    };
  }, [setSnapshot]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveSnapshotToLocalStorage(tasks, meta);
    saveTasksToCsvStorage(tasks, meta);

    void persistTasksToCsvFile(tasks, meta).catch((error) => {
      console.warn('[CSV File Sync] ファイルへの保存に失敗しました', error);
    });
  }, [isHydrated, meta, tasks]);

  return <>{children}</>;
}
