import { PropsWithChildren } from 'react';

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <div style={{ padding: 16 }}>
      <header>
        <h1>Offline Task Manager</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
