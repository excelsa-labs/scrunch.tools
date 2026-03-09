import { useState, useRef, useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';

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

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-violet-400 bg-violet-50'
            : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
        />
        <Upload className={`w-10 h-10 mx-auto mb-4 ${isDragging ? 'text-violet-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-700 mb-1">
          Drop a CSV file here, or click to browse
        </p>
        <p className="text-sm text-gray-500">
          Requires columns: topic_id, prompt_id, url
        </p>
      </div>

      <div className="text-center">
        <button
          onClick={() => setPasteMode(!pasteMode)}
          className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 mx-auto"
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
            className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-y"
          />
          <button
            onClick={() => { if (pasteText.trim()) onCSVLoaded(pasteText); }}
            disabled={!pasteText.trim()}
            className="w-full px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition-colors"
          >
            Load Data
          </button>
        </div>
      )}
    </div>
  );
}
