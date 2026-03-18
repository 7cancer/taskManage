import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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

const STATUS_CHIP_COLORS: Record<TaskStatus, 'default' | 'primary' | 'warning' | 'success' | 'info'> = {
  todo: 'default',
  inProgress: 'info',
  review: 'warning',
  done: 'success',
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
      taskId: 'A-001',
      taskName: 'キックオフ準備',
      status: 'todo',
      startDate: toDateText(addDays(base, 0)),
      endDate: toDateText(addDays(base, 2)),
      project: '新規プロジェクトA',
      category: '計画',
      description: '関係者のアサインとキックオフ資料を準備します。',
      displayOrder: 1,
    },
    {
      taskId: 'A-002',
      taskName: '要件定義',
      parentTaskId: 'A-001',
      status: 'inProgress',
      startDate: toDateText(addDays(base, 3)),
      endDate: toDateText(addDays(base, 8)),
      project: '新規プロジェクトA',
      category: '要件',
      description: '業務要件・システム要件を整理します。',
      displayOrder: 2,
    },
    {
      taskId: 'A-003',
      taskName: '基本設計レビュー',
      status: 'review',
      startDate: toDateText(addDays(base, 9)),
      endDate: toDateText(addDays(base, 12)),
      project: '新規プロジェクトA',
      category: '設計',
      description: '設計書のレビューと修正対応を行います。',
      displayOrder: 3,
    },
    {
      taskId: 'A-004',
      taskName: '初回リリース',
      status: 'done',
      startDate: toDateText(addDays(base, 13)),
      endDate: toDateText(addDays(base, 15)),
      project: '新規プロジェクトA',
      category: 'リリース',
      description: '本番反映と稼働確認を実施します。',
      displayOrder: 4,
    },
    {
      taskId: 'B-001',
      taskName: 'デザインラフ作成',
      status: 'inProgress',
      startDate: toDateText(addDays(base, 1)),
      endDate: toDateText(addDays(base, 5)),
      project: 'モバイルアプリ刷新B',
      category: 'デザイン',
      description: '主要画面のワイヤーフレームを作成します。',
      displayOrder: 5,
    },
    {
      taskId: 'B-002',
      taskName: 'API連携実装',
      parentTaskId: 'B-001',
      status: 'todo',
      startDate: toDateText(addDays(base, 6)),
      endDate: toDateText(addDays(base, 13)),
      project: 'モバイルアプリ刷新B',
      category: '実装',
      description: '認証・通知APIとの連携処理を実装します。',
      displayOrder: 6,
    },
    {
      taskId: 'B-003',
      taskName: '受け入れテスト',
      status: 'todo',
      startDate: toDateText(addDays(base, 14)),
      endDate: toDateText(addDays(base, 18)),
      project: 'モバイルアプリ刷新B',
      category: 'テスト',
      description: 'シナリオテストと不具合修正を進めます。',
      displayOrder: 7,
    },
    {
      taskId: 'B-004',
      taskName: 'ストア申請',
      status: 'review',
      startDate: toDateText(addDays(base, 19)),
      endDate: toDateText(addDays(base, 21)),
      project: 'モバイルアプリ刷新B',
      category: 'リリース',
      description: '配布申請のレビューと提出を行います。',
      displayOrder: 8,
    },
    {
      taskId: 'C-001',
      taskName: '運用現状調査',
      status: 'done',
      startDate: toDateText(addDays(base, -5)),
      endDate: toDateText(addDays(base, -1)),
      project: '運用改善C',
      category: '調査',
      description: '問い合わせ傾向と工数データを可視化します。',
      displayOrder: 9,
    },
    {
      taskId: 'C-002',
      taskName: '自動化候補洗い出し',
      status: 'inProgress',
      startDate: toDateText(addDays(base, 0)),
      endDate: toDateText(addDays(base, 4)),
      project: '運用改善C',
      category: '改善',
      description: '定型作業の自動化候補を優先度付けします。',
      displayOrder: 10,
    },
    {
      taskId: 'C-003',
      taskName: 'RPA試験導入',
      parentTaskId: 'C-002',
      status: 'todo',
      startDate: toDateText(addDays(base, 5)),
      endDate: toDateText(addDays(base, 11)),
      project: '運用改善C',
      category: '実装',
      description: '一部業務でRPAのPoCを実施します。',
      displayOrder: 11,
    },
    {
      taskId: 'C-004',
      taskName: '運用ルール更新',
      status: 'review',
      startDate: toDateText(addDays(base, 12)),
      endDate: toDateText(addDays(base, 14)),
      project: '運用改善C',
      category: '展開',
      description: '運用マニュアルと教育資料を更新します。',
      displayOrder: 12,
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
        <Button variant="secondary" size="sm" onClick={handleCreateProject} sx={{ width: '100%' }}>
          サンプル作成
        </Button>
        <Typography variant="caption" color="text.secondary">
          ダミーデータを作成しCSVテンプレートをダウンロードします。
        </Typography>
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
          <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ID・タスク名・説明で検索"
            />
            <TextField
              size="small"
              select
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
            >
              <MenuItem value="all">全プロジェクト</MenuItem>
              {projects.map((project) => (
                <MenuItem key={project} value={project}>
                  {project}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <MenuItem value="all">全カテゴリ</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
            >
              <MenuItem value="displayOrder">並び順（CSV順）</MenuItem>
              <MenuItem value="startDate">開始日順</MenuItem>
              <MenuItem value="endDate">終了日順</MenuItem>
            </TextField>
          </Box>

          <Paper sx={{ mt: 1.5, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              読込済みタスク（一覧）
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              表示件数: {filteredTasks.length} / 全件: {tasks.length}
            </Typography>

            {TASK_STATUS_ORDER.map((status) => {
              const statusTasks = groupedTasks[status];

              return (
                <Accordion key={status} defaultExpanded={status !== 'todo'} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      {TASK_STATUS_LABELS[status]} ({statusTasks.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    {statusTasks.length === 0 ? (
                      <Typography variant="body2" sx={{ p: 2, opacity: 0.7 }}>
                        タスクなし
                      </Typography>
                    ) : (
                      <TableContainer sx={{ maxHeight: 360 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>ID</TableCell>
                              <TableCell>タスク名</TableCell>
                              <TableCell>ステータス</TableCell>
                              <TableCell>開始</TableCell>
                              <TableCell>終了</TableCell>
                              <TableCell>PJ</TableCell>
                              <TableCell>カテゴリ</TableCell>
                              <TableCell>詳細</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {statusTasks.map((task) => (
                              <TableRow key={task.taskId} hover>
                                <TableCell>{task.taskId}</TableCell>
                                <TableCell>{task.taskName}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={TASK_STATUS_LABELS[task.status]}
                                    size="small"
                                    color={STATUS_CHIP_COLORS[task.status]}
                                    sx={{ fontWeight: 600, fontSize: 12 }}
                                  />
                                </TableCell>
                                <TableCell>{task.startDate}</TableCell>
                                <TableCell>{task.endDate}</TableCell>
                                <TableCell>{task.project ?? '-'}</TableCell>
                                <TableCell>{task.category ?? '-'}</TableCell>
                                <TableCell>
                                  {task.description ? (
                                    <details>
                                      <summary style={{ cursor: 'pointer' }}>表示</summary>
                                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                                        {task.description}
                                      </Typography>
                                    </details>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Paper>
        </>
      )}
    </MainLayout>
  );
}
