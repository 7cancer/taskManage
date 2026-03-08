import { CsvImportDialog } from '../../features/csv-import/components/CsvImportDialog';
import { useTaskStore } from '../../store/taskStore';
import { MainLayout } from '../layout/MainLayout';

export function MainRoute() {
  // TODO: 画面タブ切り替え（カンバン/ガント）を実装する。
  const tasks = useTaskStore((state) => state.tasks);
  return (
    <MainLayout>
      <p>TODO: Main view (Kanban / Gantt)</p>
      <CsvImportDialog />

      <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>読込済みタスク（簡易一覧）</h2>
        <p>件数: {tasks.length}</p>
        <ul>
          {tasks.slice(0, 10).map((task) => (
            <li key={task.taskId}>
              {task.taskId} | {task.taskName} | {task.status} | {task.startDate} - {task.endDate}
            </li>
          ))}
        </ul>
      </section>
    </MainLayout>
  );
}
