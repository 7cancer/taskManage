import { ReactNode } from 'react';
import { APP_VERSION } from '../version';

interface MainLayoutProps {
  sidebar?: ReactNode;
  children: ReactNode;
}

export function MainLayout({ sidebar, children }: MainLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Offline Task Manager</h1>
        <span
          style={{
            background: '#0f172a',
            color: '#fff',
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 999,
            lineHeight: 1.4,
          }}
        >
          v{APP_VERSION}
        </span>
      </header>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebar}
        <main style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
