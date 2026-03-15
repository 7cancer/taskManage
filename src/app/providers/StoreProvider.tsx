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


async function loadDefaultHolidayMeta() {
  try {
    const response = await fetch('/default-holidays.csv', { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    const csvText = await response.text();
    const parsed = parseTaskSnapshotFromCsvText(csvText);
    return parsed.meta;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: PropsWithChildren) {
  const tasks = useTaskStore((state) => state.tasks);
  const meta = useTaskStore((state) => state.meta);
  const setSnapshot = useTaskStore((state) => state.setSnapshot);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function hydrateStore() {
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

      const defaultMeta = await loadDefaultHolidayMeta();
      if (!disposed && defaultMeta) {
        setSnapshot([], defaultMeta);
      }

      if (!disposed) {
        setIsHydrated(true);
      }
    }

    void hydrateStore();

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
