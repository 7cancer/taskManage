import { PropsWithChildren } from 'react';
import { APP_VERSION } from '../version';

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: 3000,
          background: '#0f172a',
          color: '#fff',
          fontSize: 12,
          padding: '4px 8px',
          borderRadius: 999,
          lineHeight: 1.2,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.35)',
        }}
      >
        v{APP_VERSION}
      </div>
      <header>
        <h1>Offline Task Manager</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
