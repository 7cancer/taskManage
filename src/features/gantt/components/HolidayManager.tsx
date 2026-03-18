import { useState } from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
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
      <Button variant="secondary" size="sm" onClick={openEditor} sx={{ width: '100%' }}>
        定休日の追加
      </Button>
      <Button variant="link" size="sm" onClick={() => setIsListOpen(true)}>
        登録中の休日を確認 ({holidays.length}件)
      </Button>

      <Modal
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title="定休日の追加"
        actions={
          <>
            <Button variant="secondary" onClick={() => setIsEditorOpen(false)}>キャンセル</Button>
            <Button variant="primary" onClick={handleSave}>保存</Button>
          </>
        }
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          YYYY-MM-DD を改行またはカンマ区切りで入力してください。
        </Typography>
        <TextField
          multiline
          minRows={6}
          fullWidth
          value={holidayDraft}
          onChange={(e) => setHolidayDraft(e.target.value)}
        />
      </Modal>

      <Modal
        open={isListOpen}
        onClose={() => setIsListOpen(false)}
        title="登録中の休日一覧"
        actions={
          <Button variant="secondary" onClick={() => setIsListOpen(false)}>閉じる</Button>
        }
      >
        {holidays.length === 0 ? (
          <Typography variant="body2" color="text.secondary">登録中の休日はありません。</Typography>
        ) : (
          <List dense>
            {holidays.map((holiday) => (
              <ListItem
                key={holiday}
                secondaryAction={
                  <Button variant="danger" size="sm" onClick={() => handleDelete(holiday)}>削除</Button>
                }
                sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}
              >
                <ListItemText primary={holiday} />
              </ListItem>
            ))}
          </List>
        )}
      </Modal>
    </>
  );
}
