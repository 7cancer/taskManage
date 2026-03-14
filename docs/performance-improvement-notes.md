# パフォーマンス改善メモ（大量タスク読込時）

## 1) 描画行数の削減（仮想スクロール）
- 現状のガントは `visibleRows.map(...)` で左列・右列をそれぞれ全件描画しており、行数が増えると DOM ノード数と再描画コストが比例して増えます。
- `react-virtual` などで「表示範囲の行だけ」描画する方式に変更すると、体感速度が大きく改善します。

対象コード:
- `src/features/gantt/components/GanttChart.tsx`

## 2) 日付ヘッダのセル数削減（列の間引き）
- `dayDates.map(...)` により、表示日数分のヘッダセルを毎回描画しています。
- 表示幅が狭い場合は「週単位表示」「月単位表示」に自動切り替えし、セル数を減らすとヘッダ描画が軽くなります。

対象コード:
- `src/features/gantt/components/GanttChart.tsx`

## 3) 祖先ハイライト計算の前計算化
- 各行レンダリング時に `while (currentParentId)` で祖先を辿っており、階層が深い/件数が多いほど計算量が増えます。
- `taskId -> ancestorIds[]` のインデックスを `useMemo` で事前構築し、描画時は参照のみへ寄せると効率化できます。

対象コード:
- `src/features/gantt/components/GanttChart.tsx`

## 4) 日付文字列変換のキャッシュ
- `shiftTaskDateText` で `new Date(...)` とフォーマットを頻繁に行っています。
- ドラッグ中は同一タスクに対して同種計算を繰り返すため、`taskId + offsetDays` キーでメモ化するか、開始時に epoch 日数へ変換して数値演算中心にすると軽量化できます。

対象コード:
- `src/features/gantt/components/GanttChart.tsx`

## 5) タブ非表示時の集計をスキップ
- `groupTasksByStatus(tasks)` は `useMemo` ですが、ガント表示中でも tasks 更新のたびに再計算されます。
- `activeView === 'list'` のときだけ計算するように分岐すると、不要計算を抑制できます。

対象コード:
- `src/app/routes/MainRoute.tsx`

## 6) 永続化の同期書き込みを間引く（デバウンス）
- CRUD のたびに `saveTasksToCsvStorage(nextTasks)` が呼ばれ、さらに `localStorage.setItem(...)` は同期 API のためメインスレッドをブロックします。
- 100〜300ms のデバウンス + `requestIdleCallback`（fallback 付き）でまとめ書きすると、編集/ドラッグ時の引っかかりを減らせます。

対象コード:
- `src/store/actions/taskCrud.ts`
- `src/store/actions/taskPersistence.ts`

## 7) ストア分割（データとUI状態）
- 現在は `tasks` の更新で、同じストア購読者が広く再レンダリング対象になります。
- `tasks(正規化データ)` と `ui(選択・フィルタ・ドラッグ状態)` を分ける、または selector + shallow 比較を徹底して更新波及を抑えると効果があります。

対象コード:
- `src/store/taskStore.ts`
- `src/app/routes/MainRoute.tsx`
- `src/features/gantt/components/GanttChart.tsx`

## 8) 計測導入（先にボトルネックを可視化）
- 体感だけで最適化すると副作用が出やすいため、React Profiler と `performance.mark/measure` で「何msかかっているか」を先に取るのがおすすめです。
- まずは `calculateGanttLayout(tasks)`、`visibleRows` 算出、ドラッグ中の再レンダリング回数を計測対象にすると優先順位を決めやすいです。

対象コード:
- `src/features/gantt/lib/ganttLayout.ts`
- `src/features/gantt/components/GanttChart.tsx`
