import { CSSProperties, PointerEvent as ReactPointerEvent, PropsWithChildren, ReactNode, useCallback, useEffect, useRef, useState } from 'react';

interface SidebarSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

const SECTION_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  width: '100%',
  fontWeight: 600,
  fontSize: 13,
  color: '#334155',
  textAlign: 'left',
};

export function SidebarSection({ title, defaultOpen = false, children }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: '1px solid #e2e8f0' }}>
      <button
        type="button"
        style={SECTION_HEADER_STYLE}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span style={{ fontSize: 11, color: '#94a3b8', transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none' }}>
          ▶
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

const SIDEBAR_STYLE: CSSProperties = {
  background: '#fff',
  borderRight: '1px solid #e2e8f0',
  padding: '12px 16px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  height: '100%',
  boxSizing: 'border-box',
};

const SIDEBAR_CONTAINER_STYLE: CSSProperties = {
  position: 'relative',
  height: '100%',
  flexShrink: 0,
};

const SIDEBAR_RESIZER_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: -3,
  width: 6,
  height: '100%',
  cursor: 'col-resize',
  background: 'transparent',
  border: 'none',
  padding: 0,
  zIndex: 10,
};

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 520;
const SIDEBAR_DEFAULT_WIDTH = 260;

export function Sidebar({ children }: PropsWithChildren) {
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const state = dragStateRef.current;
    if (!state) {
      return;
    }

    const nextWidth = state.startWidth + (event.clientX - state.startX);
    const clampedWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, nextWidth));
    setWidth(clampedWidth);
  }, []);

  const stopDragging = useCallback(() => {
    dragStateRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
    };
  }, [handlePointerMove, stopDragging]);

  const startDragging = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dragStateRef.current = {
      startX: event.clientX,
      startWidth: width,
    };
  }, [width]);

  return (
    <div style={{ ...SIDEBAR_CONTAINER_STYLE, width, minWidth: width, maxWidth: width }}>
      <aside style={SIDEBAR_STYLE}>
        {children}
      </aside>
      <button
        type="button"
        aria-label="サイドバー幅を変更"
        onPointerDown={startDragging}
        style={SIDEBAR_RESIZER_STYLE}
      />
    </div>
  );
}
