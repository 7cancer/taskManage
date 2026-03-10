interface GanttRowTreeProps {
  taskName: string;
  depth: number;
}

export function GanttRowTree({ taskName, depth }: GanttRowTreeProps) {
  return (
    <div
      style={{
        padding: '0 10px',
        paddingLeft: 10 + depth * 20,
        fontSize: 13,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      title={taskName}
    >
      {depth > 0 ? '└ ' : ''}
      {taskName}
    </div>
  );
}
