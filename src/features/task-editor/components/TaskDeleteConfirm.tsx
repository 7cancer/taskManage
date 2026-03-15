import { Button } from '../../../shared/ui/Button';

interface TaskDeleteConfirmProps {
  taskName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TaskDeleteConfirm({ taskName, onConfirm, onCancel }: TaskDeleteConfirmProps) {
  return (
    <div style={{ border: '1px solid #fecaca', background: '#fff1f2', borderRadius: 6, padding: 10 }}>
      <p style={{ margin: '0 0 8px', color: '#9f1239', fontSize: 13 }}>
        「{taskName}」を削除します。子タスクも一緒に削除されます。
      </p>
      <div style={{ display: 'inline-flex', gap: 8 }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>キャンセル</Button>
        <Button variant="danger" size="sm" onClick={onConfirm}>削除を実行</Button>
      </div>
    </div>
  );
}
