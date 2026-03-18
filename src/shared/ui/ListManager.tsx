import { useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogContentText from '@mui/material/DialogContentText';
import { Button } from './Button';
import { Modal } from './Modal';

interface ListManagerProps {
  title: string;
  items: string[];
  onUpdate: (items: string[]) => void;
}

export function ListManager({ title, items, onUpdate }: ListManagerProps) {
  const [newItem, setNewItem] = useState('');
  const [pendingDeleteItem, setPendingDeleteItem] = useState<string | null>(null);

  function handleAdd() {
    const trimmed = newItem.trim();
    if (trimmed.length === 0 || items.includes(trimmed)) {
      return;
    }
    onUpdate([...items, trimmed]);
    setNewItem('');
  }

  function handleDelete(target: string) {
    onUpdate(items.filter((item) => item !== target));
    setPendingDeleteItem(null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <TextField
          size="small"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`${title}名を入力`}
          sx={{ flex: 1 }}
        />
        <Button variant="primary" size="sm" onClick={handleAdd} disabled={newItem.trim().length === 0}>
          追加
        </Button>
      </Box>
      {items.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          {title}が未登録です。
        </Typography>
      ) : (
        <List dense disablePadding>
          {items.map((item) => (
            <ListItem
              key={item}
              secondaryAction={
                <Button variant="danger" size="sm" onClick={() => setPendingDeleteItem(item)} sx={{ minWidth: 'auto', px: 1, fontSize: 11 }}>
                  削除
                </Button>
              }
              sx={{ bgcolor: 'grey.50', borderRadius: 1, border: 1, borderColor: 'divider', mb: 0.5 }}
            >
              <ListItemText primary={item} primaryTypographyProps={{ fontSize: 13, noWrap: true }} />
            </ListItem>
          ))}
        </List>
      )}

      <Modal
        open={pendingDeleteItem !== null}
        onClose={() => setPendingDeleteItem(null)}
        title="確認"
        actions={
          <>
            <Button variant="secondary" onClick={() => setPendingDeleteItem(null)}>
              キャンセル
            </Button>
            <Button variant="danger" onClick={() => pendingDeleteItem && handleDelete(pendingDeleteItem)}>
              削除
            </Button>
          </>
        }
      >
        <DialogContentText>「{pendingDeleteItem}」を本当に削除しますか？</DialogContentText>
      </Modal>
    </Box>
  );
}
