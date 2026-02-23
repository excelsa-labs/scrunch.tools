import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  X,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Check,
  ChevronRight,
  Link2,
  ClipboardPaste,
} from 'lucide-react';
import JSZip from 'jszip';
import { extractLinkPool } from './utils/urlExtractor';
import { convertToMarkdown } from './utils/textToMarkdown';
import { insertLinksWithClaude } from './utils/claudeApi';
import { UploadedFile, ProcessedFile, LinkPoolEntry, AppState } from './types';

// ─── helpers ────────────────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.text', '.markdown'];

function isAccepted(name: string) {
  const l = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((e) => l.endsWith(e));
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function outputName(name: string) {
  const dot = name.lastIndexOf('.');
  return (dot > 0 ? name.slice(0, dot) : name) + '.md';
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  // file state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [linkPool, setLinkPool] = useState<LinkPoolEntry[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // drag state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // paste panel state
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteName, setPasteName] = useState('');

  // processing state
  const [appState, setAppState] = useState<AppState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  // copy state per-output
  const [copied, setCopied] = useState(false);

  // ── file loading ──

  const readAndMerge = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => isAccepted(f.name));
    if (!files.length) return;
    const results: UploadedFile[] = await Promise.all(
      files.map(
        (f) =>
          new Promise<UploadedFile>((res) => {
            const r = new FileReader();
            r.onload = (e) => res({ name: f.name, rawText: (e.target?.result as string) ?? '' });
            r.readAsText(f);
          })
      )
    );
    setUploadedFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]));
      results.forEach((r) => map.set(r.name, r));
      const next = Array.from(map.values());
      setLinkPool(extractLinkPool(next));
      return next;
    });
    setProcessedFiles([]);
    setAppState('idle');
    setError('');
    setStatusMessage('');
  }, []);

  const removeFile = useCallback((name: string) => {
    setUploadedFiles((prev) => {
      const next = prev.filter((f) => f.name !== name);
      setLinkPool(extractLinkPool(next));
      return next;
    });
    setProcessedFiles([]);
    setAppState('idle');
    setError('');
    setStatusMessage('');
  }, []);

  const clearAll = useCallback(() => {
    setUploadedFiles([]);
    setLinkPool([]);
    setProcessedFiles([]);
    setSelectedIndex(0);
    setAppState('idle');
    setError('');
    setStatusMessage('');
  }, []);

  // ── paste text ──

  const openPaste = useCallback(() => {
    setPasteName(`paste-${uploadedFiles.length + 1}.txt`);
    setPasteText('');
    setPasteOpen(true);
  }, [uploadedFiles.length]);

  const addPastedFile = useCallback(() => {
    if (!pasteText.trim()) return;
    const name = pasteName.trim() || `paste-${uploadedFiles.length + 1}.txt`;
    setUploadedFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]));
      map.set(name, { name, rawText: pasteText });
      const next = Array.from(map.values());
      setLinkPool(extractLinkPool(next));
      return next;
    });
    setProcessedFiles([]);
    setAppState('idle');
    setError('');
    setStatusMessage('');
    setPasteText('');
    setPasteOpen(false);
  }, [pasteText, pasteName, uploadedFiles.length]);

  // ── drag & drop ──

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      readAndMerge(e.dataTransfer.files);
    },
    [readAndMerge]
  );

  // ── convert ──

  const handleConvert = useCallback(async () => {
    if (!uploadedFiles.length) return;
    setError('');
    setStatusMessage('');
    setAppState('converting');
    setStatusMessage('Converting text to markdown...');

    const heuristic: ProcessedFile[] = uploadedFiles.map((f) => ({
      name: f.name,
      rawText: f.rawText,
      convertedMarkdown: convertToMarkdown(f.rawText),
      finalMarkdown: convertToMarkdown(f.rawText),
    }));

    if (linkPool.length > 0) {
      setAppState('linking');
      setStatusMessage(`Inserting links via Claude (${linkPool.length} URL${linkPool.length !== 1 ? 's' : ''})...`);
      try {
        const linked = await insertLinksWithClaude(
          heuristic.map((f) => ({ name: f.name, markdown: f.convertedMarkdown })),
          linkPool
        );
        const map = new Map(linked.map((f) => [f.name, f.markdown]));
        const final: ProcessedFile[] = heuristic.map((f) => ({
          ...f,
          finalMarkdown: map.get(f.name) ?? f.convertedMarkdown,
        }));
        setProcessedFiles(final);
        setSelectedIndex(0);
        setAppState('done');
        setStatusMessage(`${final.length} file${final.length !== 1 ? 's' : ''} converted with links.`);
      } catch (err) {
        console.warn('[AXP Converter] Claude link insertion failed, using heuristic output:', err);
        setProcessedFiles(heuristic);
        setSelectedIndex(0);
        setAppState('done');
        setStatusMessage(`${heuristic.length} file${heuristic.length !== 1 ? 's' : ''} converted.`);
      }
    } else {
      setProcessedFiles(heuristic);
      setSelectedIndex(0);
      setAppState('done');
      setStatusMessage(`${heuristic.length} file${heuristic.length !== 1 ? 's' : ''} converted.`);
    }
  }, [uploadedFiles, linkPool]);

  const handleMarkdownChange = useCallback((name: string, val: string) => {
    setProcessedFiles((prev) =>
      prev.map((f) => (f.name === name ? { ...f, finalMarkdown: val } : f))
    );
  }, []);

  // ── export ──

  const handleCopy = useCallback(async () => {
    const f = processedFiles[selectedIndex];
    if (!f) return;
    await navigator.clipboard.writeText(f.finalMarkdown).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [processedFiles, selectedIndex]);

  const handleDownloadOne = useCallback(() => {
    const f = processedFiles[selectedIndex];
    if (!f) return;
    const blob = new Blob([f.finalMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: outputName(f.name),
      style: 'display:none',
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [processedFiles, selectedIndex]);

  const handleDownloadAll = useCallback(async () => {
    if (!processedFiles.length) return;
    const zip = new JSZip();
    processedFiles.forEach((f) => zip.file(outputName(f.name), f.finalMarkdown));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `axp-content-${Date.now()}.zip`,
      style: 'display:none',
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [processedFiles]);

  // ── derived ──

  const isProcessing = appState === 'converting' || appState === 'linking';
  const hasFiles = uploadedFiles.length > 0;
  const hasResults = processedFiles.length > 0;
  const selectedUploaded = uploadedFiles[selectedIndex] ?? null;
  const selectedProcessed = processedFiles[selectedIndex] ?? null;

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/">
              <img src={`${import.meta.env.BASE_URL}scrunch-logo.svg`} alt="Scrunch" className="h-7" />
            </a>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-sm font-medium text-gray-700">AXP Converter</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Status pill */}
            {appState === 'done' && !error && statusMessage && (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {statusMessage}
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {statusMessage}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-3 py-1 max-w-md truncate">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}
            {/* Convert button */}
            <button
              onClick={handleConvert}
              disabled={isProcessing || !hasFiles}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors"
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              {isProcessing ? 'Processing…' : 'Convert to Markdown'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Three-column body ── */}
      <div className="flex flex-1 overflow-hidden divide-x divide-gray-200">

        {/* ══ Column 1: File Manager ══ */}
        <div className="w-64 flex-shrink-0 flex flex-col bg-gray-50 overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Files</span>
            {hasFiles && (
              <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Clear all
              </button>
            )}
          </div>

          {/* Drop zone — compact when files present */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-shrink-0 mx-3 my-3 rounded-lg border-2 border-dashed transition-all cursor-pointer text-center
              ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-white'}
              ${hasFiles ? 'py-3 px-2' : 'py-8 px-4'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.text,.markdown"
              className="hidden"
              onChange={(e) => { if (e.target.files) readAndMerge(e.target.files); e.target.value = ''; }}
            />
            <Upload className={`mx-auto mb-1 ${hasFiles ? 'w-4 h-4' : 'w-7 h-7'} ${isDragging ? 'text-indigo-500' : 'text-gray-400'}`} />
            <p className={`font-medium text-gray-600 ${hasFiles ? 'text-xs' : 'text-sm'}`}>
              {hasFiles ? 'Drop more files' : 'Drop files here'}
            </p>
            {!hasFiles && (
              <p className="text-xs text-gray-400 mt-0.5">.txt .md .text .markdown</p>
            )}
          </div>

          {/* Paste text button + inline panel */}
          {!pasteOpen ? (
            <button
              onClick={openPaste}
              className="flex-shrink-0 mx-3 mb-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              Paste text
            </button>
          ) : (
            <div className="flex-shrink-0 mx-3 mb-2 rounded-lg border border-gray-200 bg-white overflow-hidden">
              <textarea
                autoFocus
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste your text here…"
                className="w-full h-28 px-3 py-2 text-xs font-mono text-gray-700 resize-none focus:outline-none border-b border-gray-200"
                spellCheck={false}
              />
              <div className="px-3 py-2 flex items-center gap-2">
                <input
                  value={pasteName}
                  onChange={(e) => setPasteName(e.target.value)}
                  placeholder="filename.txt"
                  className="flex-1 min-w-0 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-indigo-400 text-gray-700"
                />
                <button
                  onClick={() => setPasteOpen(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addPastedFile}
                  disabled={!pasteText.trim()}
                  className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* File list */}
          {hasFiles && (
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {uploadedFiles.map((file, idx) => {
                const isActive = idx === selectedIndex;
                const isDone = processedFiles.length > idx;
                return (
                  <div
                    key={file.name}
                    onClick={() => setSelectedIndex(idx)}
                    className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors mb-0.5 ${
                      isActive ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">{fmtBytes(new Blob([file.rawText]).size)}</p>
                    </div>
                    {isDone && (
                      <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Link pool badge */}
          {linkPool.length > 0 && (
            <div className="flex-shrink-0 mx-3 mb-3 flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{linkPool.length} URL{linkPool.length !== 1 ? 's' : ''} in link pool</span>
            </div>
          )}
        </div>

        {/* ══ Column 2: Raw Input Viewer ══ */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Input
              {selectedUploaded && (
                <span className="ml-2 normal-case font-normal text-gray-400">{selectedUploaded.name}</span>
              )}
            </span>
          </div>
          {selectedUploaded ? (
            <textarea
              readOnly
              value={selectedUploaded.rawText}
              className="flex-1 w-full px-4 py-3 text-sm font-mono text-gray-500 bg-white resize-none focus:outline-none leading-relaxed"
              spellCheck={false}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <FileText className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">No file selected</p>
              <p className="text-xs text-gray-300 mt-1">Upload files and select one to preview</p>
            </div>
          )}
        </div>

        {/* ══ Column 3: Markdown Output ══ */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Markdown Output
              {selectedProcessed && (
                <span className="ml-2 normal-case font-normal text-gray-400">{outputName(selectedProcessed.name)}</span>
              )}
            </span>
            {hasResults && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-all"
                >
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Copied</span></> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                </button>
                <button
                  onClick={handleDownloadOne}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                {processedFiles.length > 1 && (
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-800 hover:bg-gray-900 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    All ({processedFiles.length})
                  </button>
                )}
              </div>
            )}
          </div>
          {selectedProcessed ? (
            <textarea
              value={selectedProcessed.finalMarkdown}
              onChange={(e) => handleMarkdownChange(selectedProcessed.name, e.target.value)}
              className="flex-1 w-full px-4 py-3 text-sm font-mono text-gray-800 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 leading-relaxed"
              spellCheck={false}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-indigo-300" />
              </div>
              <p className="text-sm font-medium text-gray-400">No output yet</p>
              <p className="text-xs text-gray-300 mt-1">
                {hasFiles ? 'Click "Convert to Markdown" to process files' : 'Upload files to get started'}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
