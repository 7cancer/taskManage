import { ChangeEvent, useMemo, useState } from 'react';
import { TaskMeta } from '../../../domain/task/meta';
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
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((value) => value.trim());
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

function parseHolidayInput(value: string): string[] {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  return [...new Set(value.split(/[\s,]+/).map((token) => token.trim()).filter((token) => isoDatePattern.test(token)).sort())];
}

export function CsvImportDialog() {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [preview, setPreview] = useState<CsvPreviewState | null>(null);
  const [holidayInput, setHolidayInput] = useState('');
  const setSnapshot = useTaskStore((state) => state.setSnapshot);
  const setHolidays = useTaskStore((state) => state.setHolidays);
  const tasks = useTaskStore((state) => state.tasks);
  const meta = useTaskStore((state) => state.meta);

  const summaryText = useMemo(() => {
    if (!preview) return '';

    return `読込候補: ${preview.fileName} / ${preview.rowCount}行`;
  }, [preview]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage('');
      setSaveMessage('');

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

      const headerLineIndex = lines.findIndex((line) => !line.startsWith('#meta'));
      const headerLine = headerLineIndex >= 0 ? lines[headerLineIndex] : lines[0];
      const header = parseCsvLine(headerLine);
      const firstDataLine = headerLineIndex >= 0 ? lines[headerLineIndex + 1] : lines[1];
      const firstRow = firstDataLine ? parseCsvLine(firstDataLine) : undefined;

      const importResult = importTasksFromCsvText(text);
      setSnapshot(importResult.validTasks, importResult.meta);
      setHolidayInput(importResult.meta.holidays.join('\n'));

      setPreview({
        fileName: file.name,
        rowCount: Math.max(lines.filter((line) => !line.startsWith('#meta')).length - 1, 0),
        header,
        firstRow,
        rawHead: text.slice(0, 200),
        importedCount: importResult.validTasks.length,
        errorCount: importResult.errors.length,
      });

      if (importResult.errors.length > 0) {
        setErrorMessage(`取込時に ${importResult.errors.length} 件のエラーがありました（正常データ ${importResult.validTasks.length} 件を反映）。`);
      }
    } catch (error) {
      setPreview(null);
      setErrorMessage(`CSVの読込中にエラーが発生しました: ${(error as Error).message}`);
    } finally {
      event.target.value = '';
    }
  }

  function currentMeta(): TaskMeta {
    return {
      ...meta,
      holidays: parseHolidayInput(holidayInput),
    };
  }

  async function handleExportToCsv() {
    if (!preview) return;

    const targetFileName = ensureCsvExtension(preview.fileName);
    const pickerWindow = window as SaveFilePickerWindow;

    try {
      setErrorMessage('');

      const latestMeta = currentMeta();
      setHolidays(latestMeta.holidays);

      if (!pickerWindow.showSaveFilePicker) {
        triggerCsvDownload(serializeTasksToCsv(tasks, latestMeta), targetFileName);
        return;
      }

      const fileHandle = await pickerWindow.showSaveFilePicker({
        suggestedName: targetFileName,
        types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }],
      });

      setCsvExportFileHandle(fileHandle);
      await persistTasksToCsvFile(tasks, latestMeta);
    } catch (error) {
      setErrorMessage(`CSVエクスポートに失敗しました: ${(error as Error).message}`);
    }
  }

  async function handleSave() {
    if (!preview) return;

    try {
      setErrorMessage('');
      setSaveMessage('');
      const latestMeta = currentMeta();
      setHolidays(latestMeta.holidays);
      const saved = await persistTasksToCsvFile(tasks, latestMeta);
      if (!saved) {
        setErrorMessage('先に「CSVへのエクスポート」で保存先CSVファイルを選択してください。');
        return;
      }

      setSaveMessage('CSVファイルへ保存しました。');
    } catch (error) {
      setErrorMessage(`Saveに失敗しました: ${(error as Error).message}`);
    }
  }

  return (
    <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>CSV取込（最小実装）</h2>
      <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />

      {preview && (
        <div style={{ marginTop: 12 }}>
          <label htmlFor="holidayInput" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
            会社独自の休日 (YYYY-MM-DD を改行/カンマ区切り)
          </label>
          <textarea
            id="holidayInput"
            rows={4}
            value={holidayInput}
            onChange={(event) => setHolidayInput(event.target.value)}
            style={{ width: '100%', maxWidth: 500 }}
          />
        </div>
      )}

      {preview && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <button type="button" onClick={handleExportToCsv}>
            CSVへのエクスポート
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '12px 28px',
              fontSize: 18,
              fontWeight: 700,
              background: '#16a34a',
              color: '#fff',
              border: '1px solid #15803d',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      )}

      {saveMessage && (
        <p style={{ color: '#166534', marginTop: 8 }} role="status">
          {saveMessage}
        </p>
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
