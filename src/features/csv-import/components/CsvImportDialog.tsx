import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { TaskMeta } from '../../../domain/task/meta';
import { importTasksFromCsvText } from '../../../store/actions/taskImport';
import { CsvFileHandle, persistTasksToCsvFile, serializeTasksToCsv, setCsvExportFileHandle } from '../../../store/actions/taskPersistence';
import { useTaskStore } from '../../../store/taskStore';
import { Button } from '../../../shared/ui/Button';

interface CsvPreviewState {
  fileName: string;
  rowCount: number;
  header: string[];
  firstRow?: string[];
  rawHead: string;
  importedCount: number;
  errorCount: number;
}

interface OpenCsvFileHandle extends CsvFileHandle {
  getFile: () => Promise<File>;
}

interface FilePickerWindow extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<CsvFileHandle>;
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<OpenCsvFileHandle[]>;
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


export function CsvImportDialog() {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [preview, setPreview] = useState<CsvPreviewState | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setSnapshot = useTaskStore((state) => state.setSnapshot);
  const tasks = useTaskStore((state) => state.tasks);
  const meta = useTaskStore((state) => state.meta);

  const summaryText = useMemo(() => {
    if (!preview) return '';

    return `${preview.fileName} / ${preview.rowCount}行`;
  }, [preview]);

  function applyImportedCsv(text: string, fileName: string) {
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
    setPreview({
      fileName,
      rowCount: Math.max(lines.filter((line) => !line.startsWith('#meta')).length - 1, 0),
      header,
      firstRow,
      rawHead: text.slice(0, 200),
      importedCount: importResult.validTasks.length,
      errorCount: importResult.errors.length,
    });

    if (importResult.errors.length > 0) {
      setErrorMessage(`${importResult.errors.length} 件のエラー（正常 ${importResult.validTasks.length} 件を反映）`);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage('');
      setSaveMessage('');
      const text = await file.text();
      applyImportedCsv(text, file.name);
    } catch (error) {
      setPreview(null);
      setErrorMessage(`読込エラー: ${(error as Error).message}`);
    } finally {
      event.target.value = '';
    }
  }

  async function handleSelectCsv() {
    const pickerWindow = window as FilePickerWindow;
    if (!pickerWindow.showOpenFilePicker) {
      fileInputRef.current?.click();
      return;
    }

    try {
      setErrorMessage('');
      setSaveMessage('');

      const handles = await pickerWindow.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }],
      });
      const fileHandle = handles[0];
      if (!fileHandle) return;

      const file = await fileHandle.getFile();
      const text = await file.text();
      applyImportedCsv(text, file.name);

      setCsvExportFileHandle(fileHandle);
      setSaveMessage('保存先CSVを設定しました。');
    } catch (error) {
      setErrorMessage(`CSV選択失敗: ${(error as Error).message}`);
    }
  }

  function currentMeta(): TaskMeta {
    return meta;
  }

  async function handleExportToCsv() {
    if (!preview) return;

    const targetFileName = ensureCsvExtension(preview.fileName);
    const pickerWindow = window as FilePickerWindow;

    try {
      setErrorMessage('');
      const latestMeta = currentMeta();

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
      setErrorMessage(`エクスポート失敗: ${(error as Error).message}`);
    }
  }

  async function handleSave() {
    if (!preview) return;

    try {
      setErrorMessage('');
      setSaveMessage('');
      const latestMeta = currentMeta();
      const saved = await persistTasksToCsvFile(tasks, latestMeta);
      if (!saved) {
        setErrorMessage('先にCSVファイルを選択してください。');
        return;
      }

      setSaveMessage('保存しました。');
    } catch (error) {
      setErrorMessage(`保存失敗: ${(error as Error).message}`);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Button variant="secondary" size="sm" onClick={handleSelectCsv} style={{ width: '100%' }}>
        ファイルを選択
      </Button>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} style={{ display: 'none' }} />

      {preview && (
        <>
          <Button variant="secondary" size="sm" onClick={handleExportToCsv} style={{ width: '100%' }}>
            CSVエクスポート
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} style={{ width: '100%' }}>
            Save
          </Button>
        </>
      )}

      {saveMessage && (
        <p style={{ color: '#166534', margin: 0, fontSize: 12 }} role="status">
          {saveMessage}
        </p>
      )}

      {errorMessage && (
        <p style={{ color: '#b91c1c', margin: 0, fontSize: 12 }} role="alert">
          {errorMessage}
        </p>
      )}

      {preview && (
        <div style={{ fontSize: 12, color: '#475569' }}>
          <p style={{ margin: '2px 0' }}>{summaryText}</p>
          <p style={{ margin: '2px 0' }}>
            {preview.importedCount}件成功 / {preview.errorCount}件エラー
          </p>
        </div>
      )}
    </div>
  );
}
