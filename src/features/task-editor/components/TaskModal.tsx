import { ChangeEvent, useMemo, useState } from 'react';
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

function RequiredDot() {
  return <span style={{ color: '#dc2626', marginLeft: 4, fontSize: 8, lineHeight: 1, verticalAlign: 'top' }}>●</span>;
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
  const canSave = useMemo(
    () => values.taskId.trim().length > 0 && values.taskName.trim().length > 0 && values.status !== '' && values.startDate !== '' && values.endDate !== '',
    [values.endDate, values.startDate, values.status, values.taskId, values.taskName],
  );

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
          <div style={{ background: '#fff', width: 560, borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{mode === 'edit' ? 'タスク編集' : 'タスク新規登録'}</h3>
              {mode === 'edit' && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>taskId</span>
                  <input style={{ width: 180, background: '#f1f5f9', color: '#334155' }} value={values.taskId} readOnly />
                </label>
              )}
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <label>
                <span>親タスクID</span>
                <input style={{ width: '100%' }} value={values.parentTaskId} onChange={handleChange('parentTaskId')} placeholder="未設定の場合は空欄" />
              </label>
              <label>
                <span>プロジェクト</span>
                <input style={{ width: '100%' }} value={values.project} onChange={handleChange('project')} />
              </label>
              <label>
                <span>タスク名<RequiredDot /></span>
                <input style={{ width: '100%' }} value={values.taskName} onChange={handleChange('taskName')} />
              </label>
              <label>
                <span>ステータス<RequiredDot /></span>
                <select
                  style={{
                    width: '100%',
                    background: values.status ? `${TASK_STATUS_COLORS[values.status]}22` : '#fff',
                    color: '#0f172a',
                    fontWeight: 600,
                  }}
                  value={values.status}
                  onChange={handleChange('status')}
                >
                  <option value="" style={{ background: '#fff', color: '#0f172a' }}>-</option>
                  {TASK_STATUS_ORDER.map((status) => (
                    <option key={status} value={status} style={{ background: '#fff', color: '#0f172a' }}>
                      {STATUS_ICONS[status]} {TASK_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label>
                  <span>開始日<RequiredDot /></span>
                  <input type="date" style={{ width: '100%', padding: '6px 8px' }} value={values.startDate} onChange={handleChange('startDate')} />
                </label>
                <label>
                  <span>終了日<RequiredDot /></span>
                  <input type="date" style={{ width: '100%', padding: '6px 8px' }} value={values.endDate} onChange={handleChange('endDate')} />
                </label>
              </div>
              <label>
                <span>カテゴリ</span>
                <input style={{ width: '100%' }} value={values.category} onChange={handleChange('category')} />
              </label>
              <label>
                <span>説明</span>
                <textarea style={{ width: '100%', minHeight: 120 }} value={values.description} onChange={handleChange('description')} />
              </label>
            </div>
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                {mode === 'edit' && onDelete && !confirmDelete && (
                  <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                    タスク削除
                  </Button>
                )}
              </div>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                <Button variant="secondary" onClick={onClose} style={{ minWidth: 120 }}>キャンセル</Button>
                <Button variant="primary" onClick={onSave} disabled={!canSave} style={{ minWidth: 120 }}>
                  保存
                </Button>
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
