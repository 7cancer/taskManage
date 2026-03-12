import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../../../domain/task/constants';
import { TaskStatus } from '../../../domain/task/types';

interface GanttRowTreeProps {
  taskName: string;
  depth: number;
  status: TaskStatus;
}

export function GanttRowTree({ taskName, depth, status }: GanttRowTreeProps) {
  const statusLabel = TASK_STATUS_LABELS[status];
  const statusColor = TASK_STATUS_COLORS[status];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '0 10px',
        paddingLeft: 10 + depth * 20,
        fontSize: 13,
      }}
      title={taskName}
    >
      <span
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          flex: 1,
          background: depth > 0 ? '#f1f5f9' : 'transparent',
          borderRadius: 4,
          padding: depth > 0 ? '2px 6px' : 0,
        }}
      >
        {depth > 0 ? '└ ' : ''}
        {taskName}
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 11,
          lineHeight: '16px',
          color: '#ffffff',
          background: statusColor,
          borderRadius: 999,
          padding: '1px 8px',
        }}
      >
        {statusLabel}
      </span>
    </div>
  );
}
