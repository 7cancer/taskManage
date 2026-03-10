import { ChangeEvent, useMemo, useState } from 'react';
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from '../../../domain/task/constants';
import { Task, TaskStatus } from '../../../domain/task/types';
import { Modal } from '../../../shared/ui/Modal';
import { TaskDeleteConfirm } from './TaskDeleteConfirm';

export interface TaskFormValues {
  taskName: string;
  status: TaskStatus | '';
  startDate: string;
  endDate: string;
  project: string;
  category: string;
  description: string;
}


const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#E97B93',
  inProgress: '#0794B8',
  review: '#67B56A',
  done: '#B8C73D',
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
  const canSave = useMemo(() => values.taskName.trim().length > 0 && values.status !== '' && values.startDate !== '' && values.endDate !== '', [values.endDate, values.startDate, values.status, values.taskName]);

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
            <h3 style={{ marginTop: 0 }}>{mode === 'edit' ? 'タスク編集' : 'タスク新規登録'}</h3>
            <div style={{ display: 'grid', gap: 14 }}>
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
                  style={{ width: '100%', background: values.status ? STATUS_COLORS[values.status] : '#fff' }}
                  value={values.status}
                  onChange={handleChange('status')}
                >
                  <option value="">-</option>
                  {TASK_STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {TASK_STATUS_LABELS[status]}
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
                  <button type="button" onClick={() => setConfirmDelete(true)} style={{ color: '#b91c1c' }}>
                    タスク削除
                  </button>
                )}
              </div>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                <button type="button" onClick={onClose} style={{ minWidth: 120 }}>キャンセル</button>
                <button type="button" onClick={onSave} disabled={!canSave} style={{ minWidth: 120, background: '#16a34a', color: '#fff', border: '1px solid #15803d' }}>保存</button>
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
