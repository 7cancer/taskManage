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
  const isParentTask = hasChildren && depth === 0;
  const isChildTask = depth > 0;

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
        borderRadius: 6,
        background: isParentTask ? '#f8fafc' : 'transparent',
      }}
      title={taskName}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? '子タスクを展開' : '子タスクを折りたたむ'}
          style={{
            border: '1px solid #cbd5e1',
            background: isParentTask ? '#ffffff' : '#f8fafc',
            cursor: 'pointer',
            color: '#334155',
            fontSize: 10,
            padding: 0,
            width: 18,
            height: 18,
            borderRadius: 999,
            flexShrink: 0,
            lineHeight: 1,
            fontWeight: 700,
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
          background: isChildTask ? '#f1f5f9' : isParentTask ? '#e2e8f0' : 'transparent',
          borderRadius: 4,
          padding: isChildTask ? '2px 6px' : isParentTask ? '3px 8px' : 0,
          border: 'none',
          textAlign: 'left',
          font: 'inherit',
          color: '#2563eb',
          textDecoration: isParentTask ? 'none' : 'underline',
          cursor: 'pointer',
          fontWeight: isParentTask ? 700 : 500,
        }}
      >
        {isChildTask ? '\u2514 ' : ''}
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
