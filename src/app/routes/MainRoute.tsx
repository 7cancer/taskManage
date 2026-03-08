import { CsvImportDialog } from '../../features/csv-import/components/CsvImportDialog';
import { MainLayout } from '../layout/MainLayout';

export function MainRoute() {
  // TODO: 画面タブ切り替え（カンバン/ガント）を実装する。
  return (
    <MainLayout>
      <p>TODO: Main view (Kanban / Gantt)</p>
      <CsvImportDialog />
    </MainLayout>
  );
}
