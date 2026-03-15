import { CSSProperties, PropsWithChildren, ReactNode, useState } from 'react';

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
  width: 260,
  minWidth: 260,
  background: '#fff',
  borderRight: '1px solid #e2e8f0',
  padding: '12px 16px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
};

export function Sidebar({ children }: PropsWithChildren) {
  return (
    <aside style={SIDEBAR_STYLE}>
      {children}
    </aside>
  );
}
