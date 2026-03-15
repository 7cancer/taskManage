import { CSSProperties, useMemo, useState } from 'react';
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '../../domain/task/constants';
import { Task, TaskStatus } from '../../domain/task/types';
import { CsvImportDialog } from '../../features/csv-import/components/CsvImportDialog';
import { GanttChart } from '../../features/gantt/components/GanttChart';
import { HolidayManager } from '../../features/gantt/components/HolidayManager';
import { createDefaultTaskMeta } from '../../domain/task/meta';
import { saveSnapshotToLocalStorage, saveTasksToCsvStorage, serializeTasksToCsv } from '../../store/actions/taskPersistence';
import { useTaskStore } from '../../store/taskStore';
import { TabItem, Tabs } from '../../shared/ui/Tabs';
import { MainLayout } from '../layout/MainLayout';
import { Sidebar, SidebarSection } from '../../shared/ui/Sidebar';
import { Button } from '../../shared/ui/Button';

const LIST_STYLE: CSSProperties = { padding: 12, background: '#fff', borderRadius: 8 };

const VIEW_TABS: TabItem[] = [
  { id: 'gantt', label: 'ガント' },
  { id: 'list', label: '一覧' },
];

type ViewTab = 'gantt' | 'list';

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }

    return a.taskId.localeCompare(b.taskId);
  });
}

function createEmptyTaskGroups(): Record<TaskStatus, Task[]> {
  return {
    todo: [],
    inProgress: [],
    review: [],
    done: [],
  };
}

function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const grouped = createEmptyTaskGroups();

  for (const task of tasks) {
    grouped[task.status].push(task);
  }

  for (const status of TASK_STATUS_ORDER) {
    grouped[status] = sortTasks(grouped[status]);
  }

  return grouped;
}

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
      description: '準備タスクです。\nスコープと体制を整理します。',
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
      description: '要件ヒアリングを実施。\n成果物はConfluenceに記録。',
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
      description: '基本設計レビューを実施し、\n懸念点を解消します。',
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
      description: '実装フェーズ。\n優先度順にチケット消化。',
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
      description: '本番反映と稼働確認。\n監視設定も最終確認。',
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

function formatTaskSummary(task: Task): string {
  return [
    `[${task.displayOrder}] ${task.taskId}`,
    task.taskName,
    `${task.startDate} - ${task.endDate}`,
    `PJ:${task.project ?? '-'}`,
    `Cat:${task.category ?? '-'}`,
  ].join(' | ');
}

export function MainRoute() {
  const tasks = useTaskStore((state) => state.tasks);
  const setTasks = useTaskStore((state) => state.setTasks);
  const holidays = useTaskStore((state) => state.meta.holidays);
  const groupedTasks = useMemo(() => groupTasksByStatus(tasks), [tasks]);
  const [activeView, setActiveView] = useState<ViewTab>('gantt');

  function handleCreateProject() {
    const dummyTasks = createDummyProjectTasks();
    setTasks(dummyTasks);
    const meta = createDefaultTaskMeta();
    saveSnapshotToLocalStorage(dummyTasks, meta);
    saveTasksToCsvStorage(dummyTasks, meta);
    downloadCsv(serializeTasksToCsv(dummyTasks, meta), 'project-template.csv');
  }

  const sidebarContent = (
    <Sidebar>
      <SidebarSection title="CSV取込・保存" defaultOpen>
        <CsvImportDialog />
      </SidebarSection>
      <SidebarSection title="休日管理">
        <HolidayManager />
      </SidebarSection>
      <SidebarSection title="プロジェクト">
        <Button variant="secondary" size="sm" onClick={handleCreateProject} style={{ width: '100%' }}>
          サンプル作成
        </Button>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
          ダミーデータを作成しCSVテンプレートをダウンロードします。
        </p>
      </SidebarSection>
    </Sidebar>
  );

  return (
    <MainLayout sidebar={sidebarContent}>
      <Tabs items={VIEW_TABS} activeId={activeView} onChange={(id) => setActiveView(id as ViewTab)} />

      {activeView === 'gantt' ? (
        <GanttChart tasks={tasks} holidays={holidays} />
      ) : (
        <section style={LIST_STYLE}>
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
                      <div>{formatTaskSummary(task)}</div>
                      {task.description && (
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#475569', marginTop: 2 }}>{task.description}</div>
                      )}
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
