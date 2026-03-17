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
import { ListManager } from '../../shared/ui/ListManager';

const LIST_STYLE: CSSProperties = { padding: 12, background: '#fff', borderRadius: 8, marginTop: 12 };
const CONTROL_BAR_STYLE: CSSProperties = {
  marginTop: 12,
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr 1fr',
  gap: 8,
  alignItems: 'center',
};
const TABLE_STYLE: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const TH_STYLE: CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid #cbd5e1',
  background: '#f8fafc',
  position: 'sticky',
  top: 0,
  zIndex: 1,
};
const TD_STYLE: CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' };

const STATUS_BADGE_STYLES: Record<TaskStatus, CSSProperties> = {
  todo: { background: '#e2e8f0', color: '#1e293b' },
  inProgress: { background: '#dbeafe', color: '#1d4ed8' },
  review: { background: '#fef3c7', color: '#b45309' },
  done: { background: '#dcfce7', color: '#166534' },
};

const VIEW_TABS: TabItem[] = [
  { id: 'gantt', label: 'ガント' },
  { id: 'list', label: '一覧' },
];

type ViewTab = 'gantt' | 'list';
type SortKey = 'displayOrder' | 'startDate' | 'endDate';

function sortTasks(tasks: Task[], sortKey: SortKey = 'displayOrder'): Task[] {
  return [...tasks].sort((a, b) => {
    if (sortKey === 'startDate') {
      const byStartDate = a.startDate.localeCompare(b.startDate);
      if (byStartDate !== 0) return byStartDate;
    }

    if (sortKey === 'endDate') {
      const byEndDate = a.endDate.localeCompare(b.endDate);
      if (byEndDate !== 0) return byEndDate;
    }

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

export function MainRoute() {
  const tasks = useTaskStore((state) => state.tasks);
  const setTasks = useTaskStore((state) => state.setTasks);
  const holidays = useTaskStore((state) => state.meta.holidays);
  const projects = useTaskStore((state) => state.meta.projects);
  const categories = useTaskStore((state) => state.meta.categories);
  const setProjects = useTaskStore((state) => state.setProjects);
  const setCategories = useTaskStore((state) => state.setCategories);
  const [activeView, setActiveView] = useState<ViewTab>('gantt');
  const [query, setQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('displayOrder');
  const [openSections, setOpenSections] = useState<Record<TaskStatus, boolean>>({
    todo: false,
    inProgress: true,
    review: true,
    done: true,
  });

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        task.taskName.toLowerCase().includes(normalizedQuery) ||
        task.taskId.toLowerCase().includes(normalizedQuery) ||
        task.description?.toLowerCase().includes(normalizedQuery);

      const matchesProject = selectedProject === 'all' || (task.project ?? '') === selectedProject;
      const matchesCategory = selectedCategory === 'all' || (task.category ?? '') === selectedCategory;

      return matchesQuery && matchesProject && matchesCategory;
    });
  }, [query, selectedProject, selectedCategory, tasks]);

  const groupedTasks = useMemo(() => {
    const grouped = groupTasksByStatus(sortTasks(filteredTasks, sortKey));
    for (const status of TASK_STATUS_ORDER) {
      grouped[status] = sortTasks(grouped[status], sortKey);
    }
    return grouped;
  }, [filteredTasks, sortKey]);

  function handleUpdateProjects(nextProjects: string[]) {
    setProjects(nextProjects);
    const { tasks: currentTasks, meta } = useTaskStore.getState();
    saveSnapshotToLocalStorage(currentTasks, meta);
    saveTasksToCsvStorage(currentTasks, meta);
  }

  function handleUpdateCategories(nextCategories: string[]) {
    setCategories(nextCategories);
    const { tasks: currentTasks, meta } = useTaskStore.getState();
    saveSnapshotToLocalStorage(currentTasks, meta);
    saveTasksToCsvStorage(currentTasks, meta);
  }

  function handleCreateProject() {
    const dummyTasks = createDummyProjectTasks();
    setTasks(dummyTasks);
    const meta = createDefaultTaskMeta();
    saveSnapshotToLocalStorage(dummyTasks, meta);
    saveTasksToCsvStorage(dummyTasks, meta);
    downloadCsv(serializeTasksToCsv(dummyTasks, meta), 'project-template.csv');
  }

  function handleToggleSection(status: TaskStatus) {
    setOpenSections((prev) => ({ ...prev, [status]: !prev[status] }));
  }

  const sidebarContent = (
    <Sidebar>
      <SidebarSection title="CSV取込・保存" defaultOpen>
        <CsvImportDialog />
      </SidebarSection>
      <SidebarSection title="休日管理">
        <HolidayManager />
      </SidebarSection>
      <SidebarSection title="プロジェクト管理">
        <ListManager title="プロジェクト" items={projects} onUpdate={handleUpdateProjects} />
      </SidebarSection>
      <SidebarSection title="カテゴリ管理">
        <ListManager title="カテゴリ" items={categories} onUpdate={handleUpdateCategories} />
      </SidebarSection>
      <SidebarSection title="サンプルデータ">
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
        <GanttChart tasks={tasks} holidays={holidays} projects={projects} categories={categories} />
      ) : (
        <>
          <section style={CONTROL_BAR_STYLE}>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ID・タスク名・説明で検索"
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
            <select
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              <option value="all">全プロジェクト</option>
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              <option value="all">全カテゴリ</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            >
              <option value="displayOrder">並び順（CSV順）</option>
              <option value="startDate">開始日順</option>
              <option value="endDate">終了日順</option>
            </select>
          </section>

          <section style={LIST_STYLE}>
            <h2 style={{ marginTop: 0 }}>読込済みタスク（一覧）</h2>
            <p style={{ marginTop: 4, color: '#475569' }}>
              表示件数: {filteredTasks.length} / 全件: {tasks.length}
            </p>

            {TASK_STATUS_ORDER.map((status) => {
              const statusTasks = groupedTasks[status];
              const isOpen = openSections[status];

              return (
                <div key={status} style={{ marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => handleToggleSection(status)}
                    aria-expanded={isOpen}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: '#f8fafc',
                      padding: '10px 12px',
                      fontSize: 14,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {isOpen ? '▼' : '▶'} {TASK_STATUS_LABELS[status]} ({statusTasks.length})
                  </button>

                  {isOpen && (statusTasks.length === 0 ? (
                    <p style={{ margin: 0, padding: 12, opacity: 0.7 }}>タスクなし</p>
                  ) : (
                    <div style={{ maxHeight: 360, overflow: 'auto' }}>
                      <table style={TABLE_STYLE}>
                        <thead>
                          <tr>
                            <th style={TH_STYLE}>ID</th>
                            <th style={TH_STYLE}>タスク名</th>
                            <th style={TH_STYLE}>ステータス</th>
                            <th style={TH_STYLE}>開始</th>
                            <th style={TH_STYLE}>終了</th>
                            <th style={TH_STYLE}>PJ</th>
                            <th style={TH_STYLE}>カテゴリ</th>
                            <th style={TH_STYLE}>詳細</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statusTasks.map((task) => (
                            <tr key={task.taskId}>
                              <td style={TD_STYLE}>{task.taskId}</td>
                              <td style={TD_STYLE}>{task.taskName}</td>
                              <td style={TD_STYLE}>
                                <span
                                  style={{
                                    ...STATUS_BADGE_STYLES[task.status],
                                    borderRadius: 999,
                                    padding: '2px 8px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  {TASK_STATUS_LABELS[task.status]}
                                </span>
                              </td>
                              <td style={TD_STYLE}>{task.startDate}</td>
                              <td style={TD_STYLE}>{task.endDate}</td>
                              <td style={TD_STYLE}>{task.project ?? '-'}</td>
                              <td style={TD_STYLE}>{task.category ?? '-'}</td>
                              <td style={TD_STYLE}>
                                {task.description ? (
                                  <details>
                                    <summary style={{ cursor: 'pointer' }}>表示</summary>
                                    <p style={{ marginBottom: 0, whiteSpace: 'pre-wrap', color: '#475569' }}>{task.description}</p>
                                  </details>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              );
            })}
          </section>
        </>
      )}
    </MainLayout>
  );
}
