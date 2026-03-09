import { Task, TaskStatus } from '../../../domain/task/types';

interface GanttChartProps {
  tasks: Task[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const BAR_COLORS: Record<TaskStatus, string> = {
  todo: '#94a3b8',
  inProgress: '#3b82f6',
  review: '#f59e0b',
  done: '#22c55e',
};

function parseDate(dateText: string): Date | null {
  const timestamp = Date.parse(dateText);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp);
}

function dateDiffInDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

function formatLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function GanttChart({ tasks }: GanttChartProps) {
  const sortedTasks = [...tasks].sort((a, b) => a.displayOrder - b.displayOrder);

  const parsedRanges = sortedTasks
    .map((task) => ({
      task,
      start: parseDate(task.startDate),
      end: parseDate(task.endDate),
    }))
    .filter((item) => item.start && item.end)
    .map((item) => ({
      task: item.task,
      start: item.start as Date,
      end: item.end as Date,
    }))
    .filter((item) => item.end.getTime() >= item.start.getTime());

  if (parsedRanges.length === 0) {
    return (
      <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
        <h2 style={{ margin: '0 0 8px' }}>ガントチャート</h2>
        <p style={{ margin: 0, color: '#64748b' }}>表示可能なタスクがありません。startDate/endDate を確認してください。</p>
      </section>
    );
  }

  const minStart = parsedRanges.reduce((min, item) => (item.start < min ? item.start : min), parsedRanges[0].start);
  const maxEnd = parsedRanges.reduce((max, item) => (item.end > max ? item.end : max), parsedRanges[0].end);
  const totalDays = Math.max(dateDiffInDays(minStart, maxEnd) + 1, 1);

  return (
    <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
      <h2 style={{ margin: '0 0 8px' }}>ガントチャート</h2>
      <p style={{ margin: '0 0 12px', color: '#475569' }}>
        期間: {formatLabel(minStart)} 〜 {formatLabel(maxEnd)}
      </p>

      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
        <div style={{ minWidth: 960 }}>
          {parsedRanges.map(({ task, start, end }) => {
            const offsetDays = dateDiffInDays(minStart, start);
            const durationDays = Math.max(dateDiffInDays(start, end) + 1, 1);
            const leftPercent = (offsetDays / totalDays) * 100;
            const widthPercent = (durationDays / totalDays) * 100;

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
                <div style={{ padding: '0 10px', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.taskName}
                </div>
                <div style={{ position: 'relative', height: 16, margin: '0 10px', background: '#f8fafc', borderRadius: 999 }}>
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
    </section>
  );
}
