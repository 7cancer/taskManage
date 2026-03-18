import { ChangeEvent, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '../../../domain/task/constants';
import { Task, TaskStatus } from '../../../domain/task/types';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { TaskDeleteConfirm } from './TaskDeleteConfirm';

export interface TaskFormValues {
  taskId: string;
  parentTaskId: string;
  taskName: string;
  status: TaskStatus | '';
  startDate: string;
  endDate: string;
  project: string;
  category: string;
  description: string;
}

const STATUS_ICONS: Record<TaskStatus, string> = {
  todo: '🔴',
  inProgress: '🔵',
  review: '🟢',
  done: '🟡',
};

const SYSTEM_RESERVED_CHARS_NOTICE = '使用禁止文字（ID系）: 「,」「"」「改行」';
const SYSTEM_RESERVED_CHAR_PATTERN = /[,"\n\r]/;

interface TaskModalProps {
  mode: 'create' | 'edit';
  values: TaskFormValues;
  editingTask?: Task;
  projects: string[];
  categories: string[];
  lockProjectAndCategory?: boolean;
  onChange: <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => void;
  onSave: () => void;
  onClose: () => void;
  onDelete?: () => void;
}

export function TaskModal({
  mode,
  values,
  editingTask,
  projects,
  categories,
  lockProjectAndCategory = false,
  onChange,
  onSave,
  onClose,
  onDelete,
}: TaskModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasInvalidIdChar = useMemo(
    () => SYSTEM_RESERVED_CHAR_PATTERN.test(values.taskId) || SYSTEM_RESERVED_CHAR_PATTERN.test(values.parentTaskId),
    [values.parentTaskId, values.taskId],
  );
  const canSave = useMemo(
    () => values.taskId.trim().length > 0
      && values.taskName.trim().length > 0
      && values.status !== ''
      && values.startDate !== ''
      && values.endDate !== ''
      && !hasInvalidIdChar,
    [hasInvalidIdChar, values.endDate, values.startDate, values.status, values.taskId, values.taskName],
  );

  function handleChange<K extends keyof TaskFormValues>(key: K) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      onChange(key, event.target.value as TaskFormValues[K]);
    };
  }

  const title = mode === 'edit' ? 'タスク編集' : 'タスク新規登録';

  const actions = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
      <Box>
        {mode === 'edit' && onDelete && !confirmDelete && (
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            タスク削除
          </Button>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="secondary" onClick={onClose} sx={{ minWidth: 120 }}>キャンセル</Button>
        <Button variant="primary" onClick={onSave} disabled={!canSave} sx={{ minWidth: 120 }}>
          保存
        </Button>
      </Box>
    </Box>
  );

  return (
    <Modal open onClose={onClose} title={title} actions={actions}>
      <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
        {mode === 'edit' && (
          <TextField size="small" label="taskId" value={values.taskId} slotProps={{ input: { readOnly: true } }} />
        )}
        {mode === 'create' && (
          <TextField size="small" label="タスクID" value={values.taskId} onChange={handleChange('taskId')} required />
        )}
        <TextField size="small" label="親タスクID" value={values.parentTaskId} onChange={handleChange('parentTaskId')} placeholder="未設定の場合は空欄" />
        <TextField
          size="small"
          select
          label="プロジェクト"
          value={values.project}
          onChange={handleChange('project')}
          disabled={lockProjectAndCategory}
        >
          <MenuItem value="">（未設定）</MenuItem>
          {projects.map((p) => (
            <MenuItem key={p} value={p}>{p}</MenuItem>
          ))}
        </TextField>
        <TextField size="small" label="タスク名" value={values.taskName} onChange={handleChange('taskName')} required />
        <TextField
          size="small"
          select
          label="ステータス"
          value={values.status}
          onChange={handleChange('status')}
          required
          sx={{
            '& .MuiSelect-select': {
              bgcolor: values.status ? `${TASK_STATUS_COLORS[values.status]}22` : undefined,
              fontWeight: 600,
            },
          }}
        >
          <MenuItem value="">-</MenuItem>
          {TASK_STATUS_ORDER.map((status) => (
            <MenuItem key={status} value={status}>
              {STATUS_ICONS[status]} {TASK_STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <TextField size="small" type="date" label="開始日" value={values.startDate} onChange={handleChange('startDate')} slotProps={{ inputLabel: { shrink: true } }} required />
          <TextField size="small" type="date" label="終了日" value={values.endDate} onChange={handleChange('endDate')} slotProps={{ inputLabel: { shrink: true } }} required />
        </Box>
        <TextField
          size="small"
          select
          label="カテゴリ"
          value={values.category}
          onChange={handleChange('category')}
          disabled={lockProjectAndCategory}
        >
          <MenuItem value="">（未設定）</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </TextField>
        <TextField size="small" label="説明" value={values.description} onChange={handleChange('description')} multiline minRows={4} />
        <Typography variant="caption" color="text.secondary">説明文は改行を保持して保存されます。</Typography>
        <Typography variant="caption" color={hasInvalidIdChar ? 'warning.main' : 'text.secondary'}>
          {SYSTEM_RESERVED_CHARS_NOTICE}
        </Typography>
      </Box>
      {mode === 'edit' && onDelete && confirmDelete && editingTask && (
        <Box sx={{ mt: 1 }}>
          <TaskDeleteConfirm
            taskName={editingTask.taskName}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={onDelete}
          />
        </Box>
      )}
    </Modal>
  );
}
