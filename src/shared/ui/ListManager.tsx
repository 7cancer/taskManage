import { useState } from 'react';
import { Button } from './Button';

interface ListManagerProps {
  title: string;
  items: string[];
  onUpdate: (items: string[]) => void;
}

export function ListManager({ title, items, onUpdate }: ListManagerProps) {
  const [newItem, setNewItem] = useState('');

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
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdd();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`${title}名を入力`}
          style={{ flex: 1, padding: '4px 8px', fontSize: 13 }}
        />
        <Button variant="primary" size="sm" onClick={handleAdd} disabled={newItem.trim().length === 0}>
          追加
        </Button>
      </div>
      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
          {title}が未登録です。
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item) => (
            <li
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                padding: '4px 8px',
                background: '#f8fafc',
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                fontSize: 13,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
              <Button variant="danger" size="sm" onClick={() => handleDelete(item)} style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11 }}>
                削除
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
