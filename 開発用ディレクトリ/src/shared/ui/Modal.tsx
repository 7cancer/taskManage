import { PropsWithChildren } from 'react';

export function Modal({ children }: PropsWithChildren) {
  // TODO: Portal化、ESCキー閉じ、フォーカストラップを追加する。
  return <div role="dialog">{children}</div>;
}
