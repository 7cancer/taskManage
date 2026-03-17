import { memo } from 'react';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../../../domain/task/constants';
import { TaskStatus } from '../../../domain/task/types';

interface GanttRowTreeProps {
  taskName: string;
  depth: number;
  status: TaskStatus;
  hasChildren?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onTaskNameClick?: () => void;
}

export const GanttRowTree = memo(function GanttRowTree({
  taskName,
  depth,
  status,
  hasChildren = false,
  isCollapsed = false,
  onToggleCollapse,
  onTaskNameClick,
}: GanttRowTreeProps) {
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
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? '子タスクを展開' : '子タスクを折りたたむ'}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: '#334155',
            fontSize: 12,
            padding: 0,
            width: 16,
            height: 16,
            flexShrink: 0,
          }}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
      ) : (
        <span style={{ width: 16, flexShrink: 0 }} />
      )}
      <button
        type="button"
        onClick={onTaskNameClick}
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          flex: 1,
          background: depth > 0 ? '#f1f5f9' : 'transparent',
          borderRadius: 4,
          padding: depth > 0 ? '2px 6px' : 0,
          border: 'none',
          textAlign: 'left',
          font: 'inherit',
          color: '#2563eb',
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        {depth > 0 ? '\u2514 ' : ''}
        {taskName}
      </button>
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
});
