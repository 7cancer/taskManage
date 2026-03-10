import { ChangeEvent, useMemo, useState } from 'react';
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '../../../domain/task/constants';
import { Task, TaskStatus } from '../../../domain/task/types';
import { Modal } from '../../../shared/ui/Modal';
import { TaskDeleteConfirm } from './TaskDeleteConfirm';

export interface TaskFormValues {
  taskName: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  description: string;
}

interface TaskModalProps {
  mode: 'create' | 'edit';
  values: TaskFormValues;
  editingTask?: Task;
  onChange: <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => void;
  onSave: () => void;
  onClose: () => void;
  onDelete?: () => void;
}

export function TaskModal({ mode, values, editingTask, onChange, onSave, onClose, onDelete }: TaskModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canSave = useMemo(() => values.taskName.trim().length > 0, [values.taskName]);

  function handleChange<K extends keyof TaskFormValues>(key: K) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      onChange(key, event.target.value as TaskFormValues[K]);
    };
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.35)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div onClick={(event) => event.stopPropagation()}>
        <Modal>
          <div style={{ background: '#fff', width: 420, borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{mode === 'edit' ? 'タスク編集' : 'タスク新規登録'}</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <label>
                タスク名
                <input style={{ width: '100%' }} value={values.taskName} onChange={handleChange('taskName')} />
              </label>
              <label>
                ステータス
                <select style={{ width: '100%' }} value={values.status} onChange={handleChange('status')}>
                  {TASK_STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {TASK_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                開始日
                <input type="date" style={{ width: '100%' }} value={values.startDate} onChange={handleChange('startDate')} />
              </label>
              <label>
                終了日
                <input type="date" style={{ width: '100%' }} value={values.endDate} onChange={handleChange('endDate')} />
              </label>
              <label>
                説明
                <textarea style={{ width: '100%', minHeight: 80 }} value={values.description} onChange={handleChange('description')} />
              </label>
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div>
                {mode === 'edit' && onDelete && !confirmDelete && (
                  <button type="button" onClick={() => setConfirmDelete(true)} style={{ color: '#b91c1c' }}>
                    タスク削除
                  </button>
                )}
              </div>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                <button type="button" onClick={onClose}>キャンセル</button>
                <button type="button" onClick={onSave} disabled={!canSave}>保存</button>
              </div>
            </div>
            {mode === 'edit' && onDelete && confirmDelete && editingTask && (
              <div style={{ marginTop: 10 }}>
                <TaskDeleteConfirm
                  taskName={editingTask.taskName}
                  onCancel={() => setConfirmDelete(false)}
                  onConfirm={onDelete}
                />
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}
