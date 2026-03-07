import { PropsWithChildren } from 'react';

export function StoreProvider({ children }: PropsWithChildren) {
  // TODO: 必要であれば Zustand/Redux の Provider や永続化初期化を追加する。
  return <>{children}</>;
}
