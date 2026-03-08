# ドメイン設計詳細（Task Domain）

この文書は `domain: タスク型・ステータス列挙・バリデーションなど業務ルール` を具体化するための初期設計メモである。

## 1. 言語・実装方針

- フロントエンド実装言語は **TypeScript** を採用する。
- 理由:
  - タスクデータ構造が多項目で、CSV取込・カンバン・ガント・保存機能で同一型を共有するため、型安全のメリットが大きい。
  - React + Vite 構成との相性が良い。
  - 将来的な機能追加（依存関係、複数プロジェクト等）で破壊的変更の検知がしやすい。

## 2. タスク型（Task）

```ts
export type TaskStatus = 'todo' | 'inProgress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  taskId: string;
  taskName: string;
  parentTaskId?: string; // 任意
  status: TaskStatus;
  startDate: string; // ISO: YYYY-MM-DD
  endDate: string;   // ISO: YYYY-MM-DD
  assignee?: string;
  priority?: TaskPriority;
  description?: string;
  displayOrder: number;
}
```

## 3. ステータス列挙（TaskStatus）

初版は固定列挙を推奨する。

- `todo`: 未着手
- `inProgress`: 対応中
- `review`: 確認中
- `done`: 完了

### 管理ルール

- カンバンの列定義は `TaskStatus` の順序と一致させる。
- ドラッグ＆ドロップ時は `status` のみを更新し、他項目は不変。
- ガント側でも同じステータス値を参照し、表示表現のみ分ける。

## 4. バリデーション方針

## 4-1. 必須チェック

- 必須: `taskId`, `taskName`, `status`, `startDate`, `endDate`, `displayOrder`
- 任意: `parentTaskId`, `assignee`, `priority`, `description`

## 4-2. 形式チェック

- `taskId`: 空文字不可、重複不可
- `status`: 列挙値以外はエラー
- `priority`: 指定時は列挙値のみ許可
- `startDate`, `endDate`: `YYYY-MM-DD` 形式
- `displayOrder`: 整数（0以上推奨）

## 4-3. 整合性チェック

- `startDate <= endDate` を満たすこと
- `parentTaskId` 指定時は、参照先 `taskId` が存在すること
- 親子循環（A→B→A）を禁止すること

## 4-4. CSV取込時のエラーハンドリング

- 行単位エラーを収集し、`line`, `column`, `message` を返す。
- 方針は2モード:
  1. 正常行のみ取込（エラー行スキップ）
  2. 1件でもエラーがあれば全件中止

## 5. 業務ルール（初版）

- 1タスクは単一ステータスを持つ。
- 親子関係は `parentTaskId` で表現する（任意）。
- 子タスク作成時は親を指定可能。
- 親タスクの代表期間は、配下タスク最小 `startDate` ～ 最大 `endDate` で算出可能。
- 表示順は `displayOrder` を正とし、カンバン列内並び替えで更新する。

## 6. 将来拡張を見据えた型分割案

- `Task`（永続化対象）
- `TaskDraft`（作成・編集モーダル入力中）
- `TaskViewModel`（画面表示用: ラベルや計算済み属性を付与）

これにより、永続データとUI一時状態の責務を分離しやすくなる。
