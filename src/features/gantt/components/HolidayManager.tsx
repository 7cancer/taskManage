import { useState } from 'react';
import { useTaskStore } from '../../../store/taskStore';
import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';

function parseHolidayInput(value: string): string[] {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  return [...new Set(value.split(/[\s,]+/).map((token) => token.trim()).filter((token) => isoDatePattern.test(token)).sort())];
}

export function HolidayManager() {
  const holidays = useTaskStore((state) => state.meta.holidays);
  const setHolidays = useTaskStore((state) => state.setHolidays);
  const [holidayDraft, setHolidayDraft] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);

  function openEditor() {
    setHolidayDraft(holidays.join('\n'));
    setIsEditorOpen(true);
  }

  function handleSave() {
    setHolidays(parseHolidayInput(holidayDraft));
    setIsEditorOpen(false);
  }

  function handleDelete(target: string) {
    setHolidays(holidays.filter((h) => h !== target));
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openEditor} style={{ width: '100%' }}>
        定休日の追加
      </Button>
      <Button variant="link" size="sm" onClick={() => setIsListOpen(true)}>
        登録中の休日を確認 ({holidays.length}件)
      </Button>

      {isEditorOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', display: 'grid', placeItems: 'center', zIndex: 2000 }}
          onClick={() => setIsEditorOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Modal>
              <div style={{ background: '#fff', width: 'min(560px, 92vw)', borderRadius: 12, padding: 24 }}>
                <h3 style={{ marginTop: 0 }}>定休日の追加</h3>
                <p style={{ marginTop: 0, fontSize: 13, color: '#475569' }}>YYYY-MM-DD を改行またはカンマ区切りで入力してください。</p>
                <textarea
                  rows={8}
                  value={holidayDraft}
                  onChange={(e) => setHolidayDraft(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button variant="secondary" onClick={() => setIsEditorOpen(false)}>キャンセル</Button>
                  <Button variant="primary" onClick={handleSave}>保存</Button>
                </div>
              </div>
            </Modal>
          </div>
        </div>
      )}

      {isListOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', display: 'grid', placeItems: 'center', zIndex: 2000 }}
          onClick={() => setIsListOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Modal>
              <div style={{ background: '#fff', width: 'min(520px, 92vw)', borderRadius: 12, padding: 24 }}>
                <h3 style={{ marginTop: 0 }}>登録中の休日一覧</h3>
                {holidays.length === 0 ? (
                  <p style={{ margin: '8px 0 0', color: '#475569' }}>登録中の休日はありません。</p>
                ) : (
                  <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
                    {holidays.map((holiday) => (
                      <li key={holiday} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px' }}>
                        <span>{holiday}</span>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(holiday)}>削除</Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => setIsListOpen(false)}>閉じる</Button>
                </div>
              </div>
            </Modal>
          </div>
        </div>
      )}
    </>
  );
}
