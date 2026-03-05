import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Download } from 'lucide-react';

interface FileUploadProps {
  onCSVLoaded: (rawText: string) => void;
}

export function FileUpload({ onCSVLoaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) onCSVLoaded(text);
    };
    reader.readAsText(file);
  }, [onCSVLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePasteLoad = useCallback(() => {
    if (pasteText.trim()) {
      onCSVLoaded(pasteText);
    }
  }, [pasteText, onCSVLoaded]);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-teal-400 bg-teal-50'
            : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Upload className={`w-10 h-10 mx-auto mb-4 ${isDragging ? 'text-teal-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-700 mb-1">
          Drop a CSV file here, or click to browse
        </p>
        <p className="text-sm text-gray-500">
          Supports Scrunch Responses API export format
        </p>
      </div>

      <div className="text-center">
        <button
          onClick={() => setPasteMode(!pasteMode)}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 mx-auto"
        >
          <FileText className="w-4 h-4" />
          {pasteMode ? 'Hide paste area' : 'Or paste CSV data directly'}
        </button>
      </div>

      {pasteMode && (
        <div className="space-y-3">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste CSV data here..."
            className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y"
          />
          <button
            onClick={handlePasteLoad}
            disabled={!pasteText.trim()}
            className="w-full px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-colors"
          >
            Load Data
          </button>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-400 mb-2">Don't have a responses CSV yet?</p>
        <a
          href="/export/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export one from the API Exporter
        </a>
      </div>
    </div>
  );
}
