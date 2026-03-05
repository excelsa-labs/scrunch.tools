import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { ColumnMapping } from '../types';

interface ColumnMapperProps {
  headers: string[];
  detectedMapping: ColumnMapping;
  onApply: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

const REQUIRED_COLUMNS = [
  { key: 'prompt', label: 'Prompt', description: 'The question sent to the AI' },
  { key: 'response_text', label: 'Response Text', description: 'The full AI response' },
];

const OPTIONAL_COLUMNS = [
  { key: 'platform', label: 'Platform', description: 'AI platform (e.g., chatgpt, claude)' },
  { key: 'stage', label: 'Stage', description: 'Buyer journey stage' },
  { key: 'country', label: 'Country', description: 'Country/region code' },
  { key: 'prompt_id', label: 'Prompt ID', description: 'Unique prompt identifier' },
  { key: 'brand_present', label: 'Brand Present', description: 'Whether brand was mentioned' },
  { key: 'brand_position', label: 'Brand Position', description: 'Position of brand mention' },
  { key: 'brand_sentiment', label: 'Brand Sentiment', description: 'Sentiment of brand mention' },
  { key: 'persona_name', label: 'Persona Name', description: 'Target persona' },
  { key: 'branded', label: 'Branded', description: 'Whether query is branded' },
];

export function ColumnMapper({ headers, detectedMapping, onApply, onCancel }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({ ...detectedMapping });
  const [showOptional, setShowOptional] = useState(false);

  const handleChange = (canonical: string, value: string) => {
    setMapping(prev => ({ ...prev, [canonical]: value || undefined }));
  };

  const canApply = mapping.prompt && mapping.response_text && mapping.prompt !== mapping.response_text;

  const missingRequired = REQUIRED_COLUMNS.filter(c => !detectedMapping[c.key]);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onCancel} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Column Mapping Required</h2>
                <p className="text-sm text-gray-500 mt-1">
                  We couldn't automatically detect {missingRequired.length === 1 ? 'a required column' : 'some required columns'}.
                  Please map your CSV headers to the expected fields.
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700">Required Fields</h3>
              {REQUIRED_COLUMNS.map(col => (
                <div key={col.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {col.label} <span className="text-red-500">*</span>
                    <span className="font-normal text-gray-400 ml-1">— {col.description}</span>
                  </label>
                  <select
                    value={mapping[col.key] || ''}
                    onChange={(e) => handleChange(col.key, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                      !mapping[col.key] ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">-- Select column --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <button
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Optional Fields ({OPTIONAL_COLUMNS.filter(c => mapping[c.key]).length} detected)
              </button>

              {showOptional && (
                <div className="space-y-3 mt-3">
                  {OPTIONAL_COLUMNS.map(col => (
                    <div key={col.key}>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        {col.label}
                        <span className="font-normal text-gray-400 ml-1">— {col.description}</span>
                      </label>
                      <select
                        value={mapping[col.key] || ''}
                        onChange={(e) => handleChange(col.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">-- Not mapped --</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {mapping.prompt && mapping.response_text && mapping.prompt === mapping.response_text && (
              <p className="text-sm text-red-600 mb-4">
                Prompt and Response Text must be mapped to different columns.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => canApply && onApply(mapping)}
                disabled={!canApply}
                className="flex-1 px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-medium text-sm"
              >
                Apply Mapping
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
