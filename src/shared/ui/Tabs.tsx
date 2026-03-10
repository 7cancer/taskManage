import { KeyboardEvent } from 'react';

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function Tabs({ items, activeId, onChange }: TabsProps) {
  function moveFocus(nextIndex: number) {
    const boundedIndex = (nextIndex + items.length) % items.length;
    onChange(items[boundedIndex].id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = items.findIndex((item) => item.id === activeId);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveFocus(currentIndex + 1);
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveFocus(currentIndex - 1);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      onChange(items[0].id);
    }

    if (event.key === 'End') {
      event.preventDefault();
      onChange(items[items.length - 1].id);
    }
  }

  return (
    <div role="tablist" aria-label="表示切替" onKeyDown={handleKeyDown} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            style={{
              border: '1px solid #cbd5e1',
              background: isActive ? '#0f172a' : '#fff',
              color: isActive ? '#fff' : '#0f172a',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
