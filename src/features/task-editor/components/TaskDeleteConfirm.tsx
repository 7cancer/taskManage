import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { Button } from '../../../shared/ui/Button';

interface TaskDeleteConfirmProps {
  taskName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TaskDeleteConfirm({ taskName, onConfirm, onCancel }: TaskDeleteConfirmProps) {
  return (
    <Alert severity="error" variant="outlined">
      「{taskName}」を削除します。子タスクも一緒に削除されます。
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>キャンセル</Button>
        <Button variant="danger" size="sm" onClick={onConfirm}>削除を実行</Button>
      </Box>
    </Alert>
  );
}
