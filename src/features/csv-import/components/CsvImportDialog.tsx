import { ChangeEvent, useMemo, useState } from 'react';
import { importTasksFromCsvText } from '../../../store/actions/taskImport';
import { CsvFileHandle, persistTasksToCsvFile, serializeTasksToCsv, setCsvExportFileHandle } from '../../../store/actions/taskPersistence';
import { useTaskStore } from '../../../store/taskStore';

interface CsvPreviewState {
  fileName: string;
  rowCount: number;
  header: string[];
  firstRow?: string[];
  rawHead: string;
  importedCount: number;
  errorCount: number;
}

interface SaveFilePickerWindow extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<CsvFileHandle>;
}

function parseCsvLine(line: string): string[] {
  // NOTE: 最小実装のためカンマ分割のみ（クォート対応は後続タスクで実装）
  return line.split(',').map((value) => value.trim());
}

function ensureCsvExtension(fileName: string): string {
  return fileName.toLowerCase().endsWith('.csv') ? fileName : `${fileName}.csv`;
}

function triggerCsvDownload(csvText: string, fileName: string) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = ensureCsvExtension(fileName);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function CsvImportDialog() {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [preview, setPreview] = useState<CsvPreviewState | null>(null);
  const setTasks = useTaskStore((state) => state.setTasks);
  const tasks = useTaskStore((state) => state.tasks);

  const summaryText = useMemo(() => {
    if (!preview) return '';

    return `読込候補: ${preview.fileName} / ${preview.rowCount}行`;
  }, [preview]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage('');

      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        setPreview(null);
        setErrorMessage('CSVが空です。ヘッダー行を含むファイルを選択してください。');
        return;
      }

      const header = parseCsvLine(lines[0]);
      const firstRow = lines[1] ? parseCsvLine(lines[1]) : undefined;

      const importResult = importTasksFromCsvText(text);
      setTasks(importResult.validTasks);

      setPreview({
        fileName: file.name,
        rowCount: Math.max(lines.length - 1, 0),
        header,
        firstRow,
        rawHead: text.slice(0, 200),
        importedCount: importResult.validTasks.length,
        errorCount: importResult.errors.length,
      });

      if (importResult.errors.length > 0) {
        setErrorMessage(`取込時に ${importResult.errors.length} 件のエラーがありました（正常データ ${importResult.validTasks.length} 件を反映）。`);
      }

      // 開発中の動作確認用ログ
      console.log('[CSV Preview: first 200 chars]', text.slice(0, 200));
      console.log('[CSV Import Result]', importResult);
    } catch (error) {
      setPreview(null);
      setErrorMessage(`CSVの読込中にエラーが発生しました: ${(error as Error).message}`);
    } finally {
      // 同一ファイル再選択で onChange を発火させるためにリセット
      event.target.value = '';
    }
  }

  async function handleExportToCvs() {
    if (!preview) return;

    const targetFileName = ensureCsvExtension(preview.fileName);
    const pickerWindow = window as SaveFilePickerWindow;

    try {
      setErrorMessage('');

      if (!pickerWindow.showSaveFilePicker) {
        triggerCsvDownload(serializeTasksToCsv(tasks), targetFileName);
        return;
      }

      const fileHandle = await pickerWindow.showSaveFilePicker({
        suggestedName: targetFileName,
        types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }],
      });

      setCsvExportFileHandle(fileHandle);
      await persistTasksToCsvFile(tasks);
    } catch (error) {
      setErrorMessage(`CVSエクスポートに失敗しました: ${(error as Error).message}`);
    }
  }

  return (
    <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>CSV取込（最小実装）</h2>
      <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />

      {preview && (
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={handleExportToCvs}>
            CVSへのエクスポート
          </button>
        </div>
      )}

      {errorMessage && (
        <p style={{ color: '#b91c1c', marginTop: 8 }} role="alert">
          {errorMessage}
        </p>
      )}

      {preview && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '4px 0' }}>{summaryText}</p>
          <p style={{ margin: '4px 0' }}>
            取込結果: <strong>{preview.importedCount}</strong>件成功 / <strong>{preview.errorCount}</strong>件エラー
          </p>
          <p style={{ margin: '4px 0' }}>
            ヘッダー: <code>{preview.header.join(' | ')}</code>
          </p>
          {preview.firstRow && (
            <p style={{ margin: '4px 0' }}>
              先頭データ行: <code>{preview.firstRow.join(' | ')}</code>
            </p>
          )}
          <details style={{ marginTop: 8 }}>
            <summary>先頭200文字を表示</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{preview.rawHead}</pre>
          </details>
        </div>
      )}
    </section>
  );
}
