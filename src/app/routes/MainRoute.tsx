import { useMemo, useState } from 'react';
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '../../domain/task/constants';
import { Task, TaskStatus } from '../../domain/task/types';
import { CsvImportDialog } from '../../features/csv-import/components/CsvImportDialog';
import { GanttChart } from '../../features/gantt/components/GanttChart';
import { saveTasksToCsvStorage, saveTasksToLocalStorage, serializeTasksToCsv } from '../../store/actions/taskPersistence';
import { useTaskStore } from '../../store/taskStore';
import { TabItem, Tabs } from '../../shared/ui/Tabs';
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

const VIEW_TABS: TabItem[] = [
  { id: 'gantt', label: 'ガント' },
  { id: 'list', label: '一覧' },
];

type ViewTab = 'gantt' | 'list';

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateText(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createDummyProjectTasks(): Task[] {
  const base = new Date();

  return [
    {
      taskId: 'P-001',
      taskName: 'プロジェクト準備',
      status: 'todo',
      startDate: toDateText(addDays(base, 0)),
      endDate: toDateText(addDays(base, 2)),
      project: '新規プロジェクトA',
      category: '計画',
      displayOrder: 1,
    },
    {
      taskId: 'P-002',
      taskName: '要件定義',
      parentTaskId: 'P-001',
      status: 'inProgress',
      startDate: toDateText(addDays(base, 3)),
      endDate: toDateText(addDays(base, 7)),
      project: '新規プロジェクトA',
      category: '要件',
      displayOrder: 2,
    },
    {
      taskId: 'P-003',
      taskName: '設計',
      status: 'review',
      startDate: toDateText(addDays(base, 8)),
      endDate: toDateText(addDays(base, 12)),
      project: '新規プロジェクトA',
      category: '設計',
      displayOrder: 3,
    },
    {
      taskId: 'P-004',
      taskName: '実装',
      status: 'todo',
      startDate: toDateText(addDays(base, 13)),
      endDate: toDateText(addDays(base, 20)),
      project: '新規プロジェクトA',
      category: '実装',
      displayOrder: 4,
    },
    {
      taskId: 'P-005',
      taskName: 'リリース',
      status: 'done',
      startDate: toDateText(addDays(base, 21)),
      endDate: toDateText(addDays(base, 22)),
      project: '新規プロジェクトA',
      category: 'リリース',
      displayOrder: 5,
    },
  ];
}

function downloadCsv(csvText: string, fileName: string) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function MainRoute() {
  const tasks = useTaskStore((state) => state.tasks);
  const groupedTasks = useMemo(() => groupTasksByStatus(tasks), [tasks]);
  const setTasks = useTaskStore((state) => state.setTasks);
  const [activeView, setActiveView] = useState<ViewTab>('gantt');

  function handleCreateProject() {
    const dummyTasks = createDummyProjectTasks();
    setTasks(dummyTasks);
    saveTasksToLocalStorage(dummyTasks);
    saveTasksToCsvStorage(dummyTasks);
    downloadCsv(serializeTasksToCsv(dummyTasks), 'project-template.csv');
  }

  return (
    <MainLayout>
      <CsvImportDialog />
      <section style={{ marginTop: 8, padding: 12, background: '#fff', borderRadius: 8 }}>
        <button type="button" onClick={handleCreateProject}>プロジェクト作成</button>
      </section>
      <Tabs items={VIEW_TABS} activeId={activeView} onChange={(id) => setActiveView(id as ViewTab)} />

      {activeView === 'gantt' ? (
        <GanttChart tasks={tasks} />
      ) : (
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
                      [{task.displayOrder}] {task.taskId} | {task.taskName} | {task.startDate} - {task.endDate} | PJ:{task.project ?? '-'} | Cat:{task.category ?? '-'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}
    </MainLayout>
  );
}
