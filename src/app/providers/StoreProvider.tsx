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

export function StoreProvider({ children }: PropsWithChildren) {
  const tasks = useTaskStore((state) => state.tasks);
  const meta = useTaskStore((state) => state.meta);
  const setSnapshot = useTaskStore((state) => state.setSnapshot);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const snapshot = loadSnapshotFromLocalStorage();
    if (snapshot.tasks.length > 0 || snapshot.meta.holidays.length > 0) {
      setSnapshot(snapshot.tasks, snapshot.meta);
      setIsHydrated(true);
      return;
    }

    const csvText = loadTasksCsvFromLocalStorage();
    if (csvText) {
      const fallbackSnapshot = parseTaskSnapshotFromCsvText(csvText);
      setSnapshot(fallbackSnapshot.tasks, fallbackSnapshot.meta);
    }

    setIsHydrated(true);
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
