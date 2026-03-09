import { useState } from 'react';
import { Download, Loader2, AlertCircle, FileDown, Filter } from 'lucide-react';
import { fetchAndFlattenData, generateCSV, validateQueryFields, fetchBrands, DEFAULT_LIMIT } from './utils/api';
import type { Brand } from './utils/api';
import {
  FieldSelector,
  RESPONSES_FIELD_GROUPS,
  RESPONSES_ALL_FIELDS,
  RESPONSES_MANY_TO_MANY,
  QUERY_FIELD_GROUPS,
  QUERY_ALL_FIELDS,
  QUERY_MANY_TO_MANY,
} from './components/FieldSelector';
import { RowExplosionWarningModal } from './components/RowExplosionWarningModal';

// Many-to-many fields that can cause row explosion
// Note: citations and competitors are pre-flattened in the export, so they don't cause row explosion
const MANY_TO_MANY_FIELDS = {
  responses: ['tags', 'key_topics'],
  query: ['ai_platform', 'tag', 'prompt_topic', 'competitor_id'],
};

const PLATFORM_OPTIONS = [
  'chatgpt', 'claude', 'google_ai_overviews', 'perplexity',
  'meta', 'google_ai_mode', 'google_gemini', 'copilot',
];

const STAGE_OPTIONS = ['Advice', 'Awareness', 'Evaluation', 'Comparison', 'Other'];

function App() {
  const [activeTab, setActiveTab] = useState<'responses' | 'query'>('query');
  const [apiKey, setApiKey] = useState('');
  const [brandId, setBrandId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fetchAll, setFetchAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApiCall, setShowApiCall] = useState(false);
  const [apiCallUrl, setApiCallUrl] = useState('');
  const [showRowExplosionWarning, setShowRowExplosionWarning] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isFetchingBrands, setIsFetchingBrands] = useState(false);
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);
  const [filterStages, setFilterStages] = useState<string[]>([]);

  const handleApiKeyChange = async (newApiKey: string) => {
    setApiKey(newApiKey);

    if (newApiKey.length >= 20) {
      setIsFetchingBrands(true);
      setError('');
      try {
        const fetchedBrands = await fetchBrands(newApiKey);
        setBrands(fetchedBrands);

        if (fetchedBrands.length === 1) {
          setBrandId(fetchedBrands[0].id.toString());
        }
      } catch {
        setBrands([]);
      } finally {
        setIsFetchingBrands(false);
      }
    } else {
      setBrands([]);
      setBrandId('');
    }
  };

  const generateApiCallUrl = () => {
    if (!brandId || !startDate || !endDate) {
      return '';
    }

    const baseUrl = `https://api.scrunchai.com/v1/${brandId}/${activeTab}`;
    const params = new URLSearchParams();
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    params.append('limit', String(DEFAULT_LIMIT));
    params.append('offset', '0');

    // Only include fields for query endpoint (responses returns all fields)
    if (activeTab === 'query' && selectedFields.length > 0) {
      params.append('fields', selectedFields.join(','));
    }

    filterPlatforms.forEach(p => params.append('platform', p));
    filterStages.forEach(s => params.append('stage', s));

    return `${baseUrl}?${params.toString()}`;
  };

  const generateCurlCommand = () => {
    const url = generateApiCallUrl();
    if (!url) return '';
    return `curl -H "Authorization: Bearer ${apiKey}" "${url}"`;
  };

  const handleShowApiCall = () => {
    const url = generateApiCallUrl();
    setApiCallUrl(url);
    setShowApiCall(true);
  };

  const getSelectedManyToManyFields = (): string[] => {
    const manyToManyList = MANY_TO_MANY_FIELDS[activeTab];
    if (activeTab === 'responses') {
      // For responses, check selectedColumns (or all columns if none selected)
      const columnsToCheck = selectedColumns.length > 0 ? selectedColumns : [];
      // If no columns selected, user gets all columns including many-to-many
      if (columnsToCheck.length === 0) {
        return manyToManyList; // All many-to-many fields will be included
      }
      // Only tags and key_topics cause row explosion (citations/competitors are pre-flattened)
      return columnsToCheck.filter(col => manyToManyList.includes(col));
    } else {
      // For query, check selectedFields
      return selectedFields.filter(field => manyToManyList.includes(field));
    }
  };

  const handleExportClick = () => {
    setError('');
    setSuccess('');

    if (!apiKey || !brandId || !startDate || !endDate) {
      setError('API Key, Brand ID, Start Date, and End Date are required');
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError('End Date must be after Start Date');
      return;
    }

    if (activeTab === 'query') {
      const validation = validateQueryFields(selectedFields);
      if (!validation.valid) {
        setError(validation.error || 'Invalid field selection');
        return;
      }
    }

    // Check for multiple many-to-many fields
    const selectedManyToMany = getSelectedManyToManyFields();
    if (selectedManyToMany.length > 1) {
      setShowRowExplosionWarning(true);
      return;
    }

    // No warning needed, proceed with export
    performExport();
  };

  const handleConfirmExport = () => {
    setShowRowExplosionWarning(false);
    performExport();
  };

  const handleCancelExport = () => {
    setShowRowExplosionWarning(false);
  };

  const performExport = async () => {
    setProgressLoaded(0);
    setLoading(true);

    try {
      const data = await fetchAndFlattenData({
        apiKey,
        brandId,
        startDate,
        endDate,
        fetchAll,
        endpoint: activeTab,
        fields: activeTab === 'query' ? selectedFields : undefined,
        filterPlatforms,
        filterStages,
        onProgress: (loaded) => {
          setProgressLoaded(loaded);
        },
      });

      if (data.length === 0) {
        setError('No data found for the selected date range and fields.');
        setLoading(false);
        return;
      }

      const columnsToUse = activeTab === 'responses'
        ? (selectedColumns.length > 0 ? selectedColumns : undefined)
        : undefined;
      const csv = generateCSV(data, columnsToUse);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const filename = activeTab === 'responses'
        ? `scrunch-responses-${Date.now()}.csv`
        : `scrunch-query-${Date.now()}.csv`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(`Successfully exported ${data.length} records`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <RowExplosionWarningModal
        isOpen={showRowExplosionWarning}
        onConfirm={handleConfirmExport}
        onCancel={handleCancelExport}
        selectedFields={getSelectedManyToManyFields()}
      />
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <a href="/">
                <img src={`${import.meta.env.BASE_URL}scrunch-logo.svg`} alt="Scrunch" className="h-8" />
              </a>
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">API Exporter</span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 py-6" style={{ backgroundColor: '#e8ffb5' }}>
              <div className="flex items-center gap-3 mb-6">
                <Download className="w-8 h-8 text-gray-800" />
                <h1 className="text-3xl font-bold text-gray-800">Scrunch API Exporter</h1>
              </div>

              <div className="flex gap-4 border-b border-gray-300">
                <button
                  onClick={() => {
                    setActiveTab('query');
                    setShowApiCall(false);
                    setApiCallUrl('');
                  }}
                  className={`px-4 py-2 font-semibold transition-all ${
                    activeTab === 'query'
                      ? 'text-gray-800 border-b-2 border-gray-800 pb-2'
                      : 'text-gray-600 hover:text-gray-800 pb-2'
                  }`}
                >
                  Metrics
                </button>
                <button
                  onClick={() => {
                    setActiveTab('responses');
                    setShowApiCall(false);
                    setApiCallUrl('');
                  }}
                  className={`px-4 py-2 font-semibold transition-all ${
                    activeTab === 'responses'
                      ? 'text-gray-800 border-b-2 border-gray-800 pb-2'
                      : 'text-gray-600 hover:text-gray-800 pb-2'
                  }`}
                >
                  Responses
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-600">
                {activeTab === 'query' ? (
                  <>
                    Data from the{' '}
                    <code className="font-mono bg-black/10 px-1 py-0.5 rounded">/query/</code>
                    {' '}endpoint —{' '}
                  </>
                ) : (
                  <>
                    Data from the{' '}
                    <code className="font-mono bg-black/10 px-1 py-0.5 rounded">/responses/</code>
                    {' '}endpoint —{' '}
                  </>
                )}
                <a
                  href="https://developers.scrunch.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold text-gray-700 hover:text-gray-900"
                >
                  developers.scrunch.com
                </a>
              </p>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Enter your API key"
                    />
                    <button
                      type="button"
                      onClick={() => handleApiKeyChange(apiKey)}
                      disabled={isFetchingBrands || apiKey.length < 20}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors whitespace-nowrap"
                      title="Refresh brands"
                    >
                      {isFetchingBrands ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                  {isFetchingBrands && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                      Loading brands...
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Brand <span className="text-red-500">*</span>
                  </label>
                  {brands.length > 0 ? (
                    <select
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      <option value="">Select a brand</option>
                      {brands.map(brand => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name} ({brand.id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={brandId}
                      onChange={(e) => setBrandId(e.target.value)}
                      placeholder="Enter API key to load brands"
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed transition"
                    />
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Date Range <span className="text-red-500">*</span></h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
                <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Filter className="w-4 h-4" />
                      <span>Filter by:</span>
                    </div>

                    {/* Platform multi-select */}
                    <div className="relative">
                      <select
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__clear__') {
                            setFilterPlatforms([]);
                          } else if (val && !filterPlatforms.includes(val)) {
                            setFilterPlatforms([...filterPlatforms, val]);
                          }
                        }}
                        className="px-3 py-1.5 pr-8 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Platform{filterPlatforms.length > 0 ? ` (${filterPlatforms.length})` : ''}</option>
                        {filterPlatforms.length > 0 && <option value="__clear__">Clear filter</option>}
                        {PLATFORM_OPTIONS.map(p => (
                          <option key={p} value={p} disabled={filterPlatforms.includes(p)}>
                            {filterPlatforms.includes(p) ? `✓ ${p}` : p}
                          </option>
                        ))}
                      </select>
                      {filterPlatforms.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {filterPlatforms.map(val => (
                            <span key={val} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">
                              {val}
                              <button onClick={() => setFilterPlatforms(filterPlatforms.filter(p => p !== val))} className="hover:text-blue-900">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stage multi-select */}
                    <div className="relative">
                      <select
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__clear__') {
                            setFilterStages([]);
                          } else if (val && !filterStages.includes(val)) {
                            setFilterStages([...filterStages, val]);
                          }
                        }}
                        className="px-3 py-1.5 pr-8 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Stage{filterStages.length > 0 ? ` (${filterStages.length})` : ''}</option>
                        {filterStages.length > 0 && <option value="__clear__">Clear filter</option>}
                        {STAGE_OPTIONS.map(s => (
                          <option key={s} value={s} disabled={filterStages.includes(s)}>
                            {filterStages.includes(s) ? `✓ ${s}` : s}
                          </option>
                        ))}
                      </select>
                      {filterStages.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {filterStages.map(val => (
                            <span key={val} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">
                              {val}
                              <button onClick={() => setFilterStages(filterStages.filter(s => s !== val))} className="hover:text-blue-900">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Result Range</h3>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fetchMode"
                      checked={!fetchAll}
                      onChange={() => setFetchAll(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">First 1000 rows <span className="text-gray-500">(default)</span></span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fetchMode"
                      checked={fetchAll}
                      onChange={() => setFetchAll(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">All results <span className="text-gray-500">(may take longer)</span></span>
                  </label>
                </div>
              </div>

              {activeTab === 'responses' && (
                <>
                  <div className="border-t pt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-2">Responses endpoint access</h4>
                        <p className="text-sm text-blue-800">
                          Some Scrunch plans do not include access to the Responses API. If you think you should have access, or you want to request it, email{' '}
                          <a href="mailto:support@scrunchai.com" className="underline font-semibold hover:text-blue-900">
                            support@scrunchai.com
                          </a>
                          .
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Select Columns</h3>
                    <p className="text-xs text-gray-600 mb-4">
                      Leave empty to include all columns. Drag to reorder. Fields with the <span className="inline-flex items-center text-amber-600">layers icon</span> are many-to-many.
                    </p>
                    <FieldSelector
                      selectedFields={selectedColumns}
                      onSelectionChange={setSelectedColumns}
                      groups={RESPONSES_FIELD_GROUPS}
                      allFields={RESPONSES_ALL_FIELDS}
                      manyToManyFields={RESPONSES_MANY_TO_MANY}
                      emptyMessage="All columns will be included"
                    />
                  </div>

                </>
              )}

              {activeTab === 'query' && (
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Select Fields</h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Select dimensions to group by and metrics to aggregate. At least one <strong>metric</strong> is required. Drag to reorder.
                  </p>
                  <FieldSelector
                    selectedFields={selectedFields}
                    onSelectionChange={setSelectedFields}
                    groups={QUERY_FIELD_GROUPS}
                    allFields={QUERY_ALL_FIELDS}
                    manyToManyFields={QUERY_MANY_TO_MANY}
                    emptyMessage="Select at least one metric"
                  />
                </div>
              )}

              {loading && (
                <div className="border-t pt-6">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Exporting...
                    {progressLoaded > 0 && (
                      <span className="text-gray-500 ml-2">{progressLoaded.toLocaleString()} rows</span>
                    )}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 h-2 rounded-full animate-progress-slide" />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}

              <div className="border-t pt-6 flex gap-2">
                <button
                  onClick={handleShowApiCall}
                  className="px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  Show API Call
                </button>
              </div>

              {showApiCall && apiCallUrl && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <div className="text-gray-700 mb-3 font-semibold">API Call (first page):</div>
                  <p className="text-xs text-gray-600 mb-3">Pagination is handled automatically for "All results" mode. Increment <code className="font-mono bg-black/10 px-1 py-0.5 rounded">offset</code> by <code className="font-mono bg-black/10 px-1 py-0.5 rounded">limit</code> to fetch subsequent pages.</p>
                  <div className="bg-white p-3 rounded border border-gray-200 mb-3 break-all font-mono text-xs text-gray-900">
                    {generateCurlCommand()}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateCurlCommand());
                      alert('curl command copied to clipboard');
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                  >
                    Copy curl
                  </button>
                </div>
              )}

              <button
                onClick={handleExportClick}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3.5 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Export to CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
