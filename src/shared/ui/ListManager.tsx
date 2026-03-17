import { useState } from 'react';
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
              <Button
                variant="danger"
                size="sm"
                onClick={() => setPendingDeleteItem(item)}
                style={{ flexShrink: 0, padding: '2px 6px', fontSize: 11 }}
              >
                削除
              </Button>
            </li>
          ))}
        </ul>
      )}

      {pendingDeleteItem && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', display: 'grid', placeItems: 'center', zIndex: 2000 }}
          onClick={() => setPendingDeleteItem(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <Modal>
              <div style={{ background: '#fff', width: 'min(420px, 92vw)', borderRadius: 12, padding: 24 }}>
                <h3 style={{ marginTop: 0 }}>確認</h3>
                <p style={{ marginTop: 0 }}>「{pendingDeleteItem}」を本当に削除しますか？</p>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button variant="secondary" onClick={() => setPendingDeleteItem(null)}>
                    キャンセル
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(pendingDeleteItem)}>
                    削除
                  </Button>
                </div>
              </div>
            </Modal>
          </div>
        </div>
      )}
    </div>
  );
}
