import { useMemo } from 'react';
import { CsvImportDialog } from '../../features/csv-import/components/CsvImportDialog';
import { GanttChart } from '../../features/gantt/components/GanttChart';
import { useTaskStore } from '../../store/taskStore';
import { MainLayout } from '../layout/MainLayout';

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }

    return a.taskId.localeCompare(b.taskId);
  });
}

function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  return {
    todo: sortTasks(tasks.filter((task) => task.status === 'todo')),
    inProgress: sortTasks(tasks.filter((task) => task.status === 'inProgress')),
    review: sortTasks(tasks.filter((task) => task.status === 'review')),
    done: sortTasks(tasks.filter((task) => task.status === 'done')),
  };
}

export function MainRoute() {
  const tasks = useTaskStore((state) => state.tasks);

  return (
    <MainLayout>
      <CsvImportDialog />
      <GanttChart tasks={tasks} />

      <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>読込済みタスク（簡易一覧）</h2>
        <p>件数: {tasks.length}</p>

        {TASK_STATUS_ORDER.map((status) => (
          <div key={status} style={{ marginTop: 12 }}>
            <h3 style={{ marginBottom: 8 }}>{TASK_STATUS_LABELS[status]}</h3>
            {groupedTasks[status].length === 0 ? (
              <p style={{ margin: 0, opacity: 0.7 }}>タスクなし</p>
            ) : (
              <ul style={{ marginTop: 0 }}>
                {groupedTasks[status].map((task) => (
                  <li key={task.taskId}>
                    [{task.displayOrder}] {task.taskId} | {task.taskName} | {task.startDate} - {task.endDate}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </MainLayout>
  );
}
