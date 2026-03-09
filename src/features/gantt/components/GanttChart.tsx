import { MouseEvent, useMemo, useState } from 'react';
import { Task, TaskStatus } from '../../../domain/task/types';
import { addTask } from '../../../store/actions/taskCrud';
import { GanttContextMenu } from './GanttContextMenu';
import { GanttRowTree } from './GanttRowTree';
import { createTaskFromRightClick } from '../interactions/rightClickCreate';
import { calculateGanttLayout, getDateOffsetDays } from '../lib/ganttLayout';

interface GanttChartProps {
  tasks: Task[];
}

interface ContextMenuState {
  x: number;
  y: number;
  clickedDate: Date;
  parentTaskId?: string;
}

const BAR_COLORS: Record<TaskStatus, string> = {
  todo: '#94a3b8',
  inProgress: '#3b82f6',
  review: '#f59e0b',
  done: '#22c55e',
};

function formatLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function GanttChart({ tasks }: GanttChartProps) {
  const layout = useMemo(() => calculateGanttLayout(tasks), [tasks]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  if (!layout) {
    return (
      <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
        <h2 style={{ margin: '0 0 8px' }}>ガントチャート</h2>
        <p style={{ margin: 0, color: '#64748b' }}>表示可能なタスクがありません。startDate/endDate を確認してください。</p>
      </section>
    );
  }

  const currentLayout = layout;

  function handleRowContextMenu(event: MouseEvent<HTMLDivElement>, parentTaskId?: string) {
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const safeWidth = rect.width || 1;
    const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), safeWidth);
    const clickedOffsetDays = Math.floor((relativeX / safeWidth) * currentLayout.totalDays);
    const clickedDate = new Date(currentLayout.minStart);
    clickedDate.setDate(clickedDate.getDate() + clickedOffsetDays);

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      clickedDate,
      parentTaskId,
    });
  }

  function handleCreateTask() {
    if (!contextMenu) return;

    addTask(
      createTaskFromRightClick({
        clickedDate: contextMenu.clickedDate,
        parentTaskId: contextMenu.parentTaskId,
        tasks,
      }),
    );
    setContextMenu(null);
  }

  return (
    <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
      <h2 style={{ margin: '0 0 8px' }}>ガントチャート</h2>
      <p style={{ margin: '0 0 12px', color: '#475569' }}>
        期間: {formatLabel(currentLayout.minStart)} 〜 {formatLabel(currentLayout.maxEnd)}
      </p>

      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
        <div style={{ minWidth: 960 }}>
          {currentLayout.rows.map(({ task, start, end, depth }) => {
            const offsetDays = getDateOffsetDays(currentLayout.minStart, start);
            const durationDays = Math.max(getDateOffsetDays(start, end) + 1, 1);
            const leftPercent = (offsetDays / currentLayout.totalDays) * 100;
            const widthPercent = (durationDays / currentLayout.totalDays) * 100;

            return (
              <div
                key={task.taskId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '260px 1fr',
                  alignItems: 'center',
                  minHeight: 40,
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <div onContextMenu={(event) => handleRowContextMenu(event, task.taskId)}>
                  <GanttRowTree taskName={task.taskName} depth={depth} />
                </div>
                <div
                  onContextMenu={(event) => handleRowContextMenu(event, task.taskId)}
                  style={{ position: 'relative', height: 16, margin: '0 10px', background: '#f8fafc', borderRadius: 999 }}
                >
                  <div
                    title={`${task.startDate} - ${task.endDate}`}
                    style={{
                      position: 'absolute',
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      minWidth: 6,
                      top: 0,
                      bottom: 0,
                      borderRadius: 999,
                      background: BAR_COLORS[task.status],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {contextMenu && (
        <GanttContextMenu x={contextMenu.x} y={contextMenu.y} onCreateTask={handleCreateTask} onClose={() => setContextMenu(null)} />
      )}
    </section>
  );
}
