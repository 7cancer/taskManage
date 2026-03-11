interface GanttContextMenuProps {
  x: number;
  y: number;
  onCreateTask: () => void;
  onClose: () => void;
}

export function GanttContextMenu({ x, y, onCreateTask, onClose }: GanttContextMenuProps) {
  return (
    <>
      <button
        type="button"
        aria-label="メニューを閉じる"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          border: 'none',
          background: 'transparent',
          padding: 0,
          margin: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: y,
          left: x,
          background: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.2)',
          zIndex: 1000,
          padding: 4,
        }}
      >
        <button
          type="button"
          onClick={onCreateTask}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            border: 'none',
            background: '#fff',
            padding: '8px 10px',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          子タスクを追加
        </button>
      </div>
    </>
  );
}
