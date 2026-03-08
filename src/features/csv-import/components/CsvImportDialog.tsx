import { ChangeEvent, useMemo, useState } from 'react';

interface CsvPreviewState {
  fileName: string;
  rowCount: number;
  header: string[];
  firstRow?: string[];
  rawHead: string;
}

function parseCsvLine(line: string): string[] {
  // NOTE: 最小実装のためカンマ分割のみ（クォート対応は後続タスクで実装）
  return line.split(',').map((value) => value.trim());
}

export function CsvImportDialog() {
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [preview, setPreview] = useState<CsvPreviewState | null>(null);

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

      setPreview({
        fileName: file.name,
        rowCount: Math.max(lines.length - 1, 0),
        header,
        firstRow,
        rawHead: text.slice(0, 200),
      });

      // 開発中の動作確認用ログ（タスク1-3の要件）
      console.log('[CSV Preview: first 200 chars]', text.slice(0, 200));
    } catch (error) {
      setPreview(null);
      setErrorMessage(`CSVの読込中にエラーが発生しました: ${(error as Error).message}`);
    } finally {
      // 同一ファイル再選択で onChange を発火させるためにリセット
      event.target.value = '';
    }
  }

  return (
    <section style={{ marginTop: 16, padding: 12, background: '#fff', borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>CSV取込（最小実装）</h2>
      <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />

      {errorMessage && (
        <p style={{ color: '#b91c1c', marginTop: 8 }} role="alert">
          {errorMessage}
        </p>
      )}

      {preview && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '4px 0' }}>{summaryText}</p>
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
