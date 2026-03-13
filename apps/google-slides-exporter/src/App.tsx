import { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Info } from 'lucide-react';
import MetricsSelector from './components/MetricsSelector';
import TemplatePreview from './components/TemplatePreview';
import ProgressTracker from './components/ProgressTracker';
import { fetchBrandMetrics, fetchBrands, validateQueryFields, buildReplacements, buildChartConfigs, QUERY_METRICS } from './utils/api';
import { initiateGoogleAuth, isOAuthCallback, handleOAuthCallback } from './utils/oauth';
import { validateTemplate, generateSlides, extractTemplateId } from './utils/slides';
import { DEFAULT_TEMPLATE_ID, DEFAULT_SHEETS_TEMPLATE_ID } from './utils/constants';
import type { FormState, TemplateInfo, GenerationStep, Brand } from './types';

function App() {
  // Handle OAuth callback
  useEffect(() => {
    if (isOAuthCallback()) {
      handleOAuthCallback();
    }
  }, []);

  const [formState, setFormState] = useState<FormState>({
    apiKey: '',
    brandId: '',
    brandName: '',
    startDate: '',
    endDate: '',
    templateId: DEFAULT_TEMPLATE_ID,
    metrics: [...QUERY_METRICS], // Default template has all metrics selected
    slideName: '',
    tag: '',
    aiPlatform: '',
    branded: '',
    promptTopic: '',
  });

  const [useCustomTemplate, setUseCustomTemplate] = useState(false);
  const [showAdditionalFilters, setShowAdditionalFilters] = useState(false);
  const [showTemplateInstructions, setShowTemplateInstructions] = useState(false);
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [isValidatingTemplate, setIsValidatingTemplate] = useState(false);
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [error, setError] = useState<string>('');
  const [slideLink, setSlideLink] = useState<string>('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isFetchingBrands, setIsFetchingBrands] = useState(false);

  const updateForm = (field: keyof FormState, value: string | string[]) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  // Fetch brands when API key is entered (minimum length check)
  const handleApiKeyChange = async (apiKey: string) => {
    updateForm('apiKey', apiKey);

    // Check if API key looks valid (at least 20 characters as a simple check)
    if (apiKey.length >= 20) {
      setIsFetchingBrands(true);
      setError('');
      try {
        const fetchedBrands = await fetchBrands(apiKey);
        setBrands(fetchedBrands);

        // Auto-select first brand if only one exists
        if (fetchedBrands.length === 1) {
          setFormState(prev => ({
            ...prev,
            brandId: fetchedBrands[0].id.toString(),
            brandName: fetchedBrands[0].name,
          }));
        }
      } catch (err) {
        setBrands([]);
        setError(err instanceof Error ? err.message : 'Failed to fetch brands');
      } finally {
        setIsFetchingBrands(false);
      }
    } else {
      setBrands([]);
      setFormState(prev => ({ ...prev, brandId: '', brandName: '' }));
    }
  };

  // Handle brand selection
  const handleBrandChange = (brandId: string) => {
    const selectedBrand = brands.find(b => b.id.toString() === brandId);
    setFormState(prev => ({
      ...prev,
      brandId,
      brandName: selectedBrand?.name || '',
    }));
  };

  const handleValidateTemplate = async () => {
    if (!formState.templateId.trim()) {
      setError('Please enter a template ID or URL');
      return;
    }

    setIsValidatingTemplate(true);
    setError('');
    setTemplateInfo(null);

    try {
      // Get OAuth token
      const accessToken = await initiateGoogleAuth();

      // Validate template
      const templateId = extractTemplateId(formState.templateId);
      const info = await validateTemplate(accessToken, templateId);
      setTemplateInfo(info);

      // Update form with cleaned template ID
      setFormState(prev => ({ ...prev, templateId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Template validation failed');
    } finally {
      setIsValidatingTemplate(false);
    }
  };

  const handleGenerate = async () => {
    // Validation
    if (!formState.apiKey.trim()) {
      setError('Please enter your Scrunch API key');
      return;
    }
    if (!formState.brandId.trim()) {
      setError('Please enter a brand ID');
      return;
    }
    if (!formState.startDate || !formState.endDate) {
      setError('Please select a date range');
      return;
    }
    if (!formState.templateId.trim()) {
      setError('Please enter a template ID');
      return;
    }
    if (!formState.slideName.trim()) {
      setError('Please enter a name for your slides');
      return;
    }

    // Only validate metrics for custom templates (default template has all metrics auto-selected)
    if (useCustomTemplate) {
      const validation = validateQueryFields(formState.metrics);
      if (!validation.valid) {
        setError(validation.error || 'Invalid metrics selection');
        return;
      }
    }

    setError('');
    setSlideLink('');
    setGenerationStep('authenticating');

    try {
      // Step 1: Authenticate
      const accessToken = await initiateGoogleAuth();

      // Step 2: Fetch data
      setGenerationStep('fetching');
      const data = await fetchBrandMetrics({
        apiKey: formState.apiKey,
        brandId: formState.brandId,
        startDate: formState.startDate,
        endDate: formState.endDate,
        metrics: formState.metrics,
        tag: formState.tag,
        aiPlatform: formState.aiPlatform,
        branded: formState.branded,
        promptTopic: formState.promptTopic,
      });

      // Step 3: Generate slides
      setGenerationStep('creating');
      const replacements = buildReplacements(data, {
        brandId: formState.brandId,
        brandName: formState.brandName,
        startDate: formState.startDate,
        endDate: formState.endDate,
      });

      // Build chart configurations from the data
      const charts = buildChartConfigs(data);

      const templateId = extractTemplateId(formState.templateId);
      const result = await generateSlides({
        accessToken,
        templateId,
        slideName: formState.slideName,
        replacements,
        charts: charts.length > 0 ? charts : undefined,
        sheetsTemplateId: DEFAULT_SHEETS_TEMPLATE_ID, // Use pre-styled sheets template
      });

      // Step 4: Done
      setGenerationStep('done');
      setSlideLink(result.link);

      // Log spreadsheet info if charts were created
      if (result.spreadsheetId) {
        console.log('Chart data spreadsheet:', result.spreadsheetUrl);
      }
    } catch (err) {
      setGenerationStep('error');
      setError(err instanceof Error ? err.message : 'Slide generation failed');
    }
  };

  // Don't render main UI if on callback page
  if (isOAuthCallback()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ocean-300 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/">
              <img src="/slides/scrunch-logo.svg" alt="Scrunch" className="h-8" />
            </a>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-ocean-300" />
              <span className="text-sm font-medium text-gray-900">Slides Generator</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6" style={{ backgroundColor: '#e8ffb5' }}>
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-8 h-8 text-gray-800" />
              <h1 className="text-3xl font-bold text-gray-800">Slides Generator</h1>
            </div>
            <p className="text-xs text-gray-600">
              Generate branded presentations from your Scrunch API data
            </p>
          </div>

          {/* Form */}
          <div className="p-8 space-y-8">
            {/* API Configuration */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">
                API Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Scrunch API Key <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={formState.apiKey}
                      onChange={e => handleApiKeyChange(e.target.value)}
                      placeholder="Enter your Scrunch API key"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-300 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => handleApiKeyChange(formState.apiKey)}
                      disabled={isFetchingBrands || formState.apiKey.length < 20}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors whitespace-nowrap"
                      title="Refresh brands"
                    >
                      {isFetchingBrands ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                  {isFetchingBrands && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-ocean-300 border-t-transparent rounded-full animate-spin"></span>
                      Loading brands...
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Brand
                  </label>
                  {brands.length > 0 ? (
                    <select
                      value={formState.brandId}
                      onChange={e => handleBrandChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-300 focus:border-transparent"
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
                      value={formState.brandId}
                      onChange={e => updateForm('brandId', e.target.value)}
                      placeholder={formState.apiKey.length >= 20 ? 'Enter brand ID manually' : 'Enter API key to load brands'}
                      disabled={formState.apiKey.length < 20}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                        formState.apiKey.length >= 20
                          ? 'focus:ring-2 focus:ring-ocean-300 focus:border-transparent'
                          : 'bg-gray-50 text-gray-500 cursor-not-allowed'
                      }`}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formState.startDate}
                      onChange={e => updateForm('startDate', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-300 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formState.endDate}
                      onChange={e => updateForm('endDate', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-300 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Additional Filters */}
            <section className="space-y-4">
              <button
                type="button"
                onClick={() => setShowAdditionalFilters(!showAdditionalFilters)}
                className="w-full flex items-center justify-between border-b pb-2 hover:text-ocean-300 transition-colors"
              >
                <h2 className="text-lg font-semibold text-gray-900">
                  Additional Filters <span className="text-sm font-normal text-gray-500">(Optional)</span>
                </h2>
                {showAdditionalFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showAdditionalFilters && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Tags
                        </label>
                        <div className="group relative">
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                            Comma-separated list of prompt tags. Example: product-research, competitor-analysis
                          </div>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={formState.tag || ''}
                        onChange={e => updateForm('tag', e.target.value)}
                        placeholder="e.g., product-research, pricing"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-300 focus:border-transparent text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          AI Platform
                        </label>
                        <div className="group relative">
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                            Filter by specific AI platform
                          </div>
                        </div>
                      </div>
                      <select
                        value={formState.aiPlatform || ''}
                        onChange={e => updateForm('aiPlatform', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-300 focus:border-transparent text-sm"
                      >
                        <option value="">Any Platform</option>
                        <option value="chatgpt">ChatGPT</option>
                        <option value="claude">Claude</option>
                        <option value="google_gemini">Google Gemini</option>
                        <option value="perplexity">Perplexity</option>
                        <option value="copilot">Copilot</option>
                        <option value="google_ai_overviews">Google AI Overviews</option>
                        <option value="google_ai_mode">Google AI Mode</option>
                        <option value="meta">Meta AI</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Branded
                        </label>
                        <div className="group relative">
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                            Filter by whether the prompt explicitly mentions your brand
                          </div>
                        </div>
                      </div>
                      <select
                        value={formState.branded || ''}
                        onChange={e => updateForm('branded', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-300 focus:border-transparent text-sm"
                      >
                        <option value="">Any</option>
                        <option value="true">Branded</option>
                        <option value="false">Non-Branded</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Prompt Topics
                        </label>
                        <div className="group relative">
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                            Comma-separated list of topic names. Topics categorize prompts by subject area.
                          </div>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={formState.promptTopic || ''}
                        onChange={e => updateForm('promptTopic', e.target.value)}
                        placeholder="e.g., pricing, features, reviews"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-300 focus:border-transparent text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Separate multiple topics with commas</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Template Configuration */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Slide Details
              </h2>
              <div className="space-y-4">
                {!useCustomTemplate && (
                  <div className="bg-ocean-50 border border-ocean-100 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-ocean-300 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-ocean-400">
                        <p className="font-medium mb-1">Using Scrunch default template</p>
                        <p className="text-ocean-300 text-xs">
                          This template includes all standard brand metrics and is ready to use.
                        </p>
                        <p className="text-ocean-300 text-xs mt-1">
                          ✨ Massive improvements to the v1 default template are coming soon!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Output Slide Name
                  </label>
                  <input
                    type="text"
                    value={formState.slideName}
                    onChange={e => updateForm('slideName', e.target.value)}
                    placeholder="e.g., Brand Report - Q1 2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-300 focus:border-transparent"
                  />
                </div>

                {/* Template Choice - Moved below Output Slide Name */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomTemplate(!useCustomTemplate);
                      if (!useCustomTemplate) {
                        // Switching TO custom template - clear metrics and template info
                        setTemplateInfo(null);
                        setFormState(prev => ({ ...prev, metrics: [] }));
                      } else {
                        // Switching back TO default template - restore all metrics
                        setFormState(prev => ({
                          ...prev,
                          templateId: DEFAULT_TEMPLATE_ID,
                          metrics: [...QUERY_METRICS]
                        }));
                      }
                    }}
                    className="text-sm text-ocean-300 hover:text-ocean-400 font-medium underline"
                  >
                    {useCustomTemplate ? '← Use default template' : 'Use my own template →'}
                  </button>
                </div>

                {useCustomTemplate && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Template ID or URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formState.templateId}
                          onChange={e => updateForm('templateId', e.target.value)}
                          placeholder="Paste Google Slides URL or template ID"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-300 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={handleValidateTemplate}
                          disabled={isValidatingTemplate || !formState.templateId.trim()}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                        >
                          {isValidatingTemplate ? 'Validating...' : 'Test Template'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Make sure the template is shared with "Anyone with the link"
                      </p>
                    </div>

                    <TemplatePreview templateInfo={templateInfo} isValidating={isValidatingTemplate} />

                    {/* Template Instructions */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowTemplateInstructions(!showTemplateInstructions)}
                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-sm font-medium text-gray-700"
                      >
                        <span>How to create a custom template</span>
                        {showTemplateInstructions ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {showTemplateInstructions && (
                        <div className="p-4 bg-white border-t border-gray-200 text-sm text-gray-700 space-y-3">
                          <div>
                            <p className="font-semibold mb-2">Creating Your Template:</p>
                            <ol className="list-decimal list-inside space-y-1 text-xs">
                              <li>Create a new Google Slides presentation</li>
                              <li>Design your slides with your branding and layout</li>
                              <li>Add placeholder variables where you want data inserted</li>
                              <li>Share the presentation with "Anyone with the link" (View access)</li>
                              <li>Copy the template URL or ID and paste it above</li>
                            </ol>
                          </div>

                          <div>
                            <p className="font-semibold mb-2">Available Placeholder Variables:</p>
                            <div className="bg-gray-50 rounded p-3 space-y-1.5 text-xs font-mono">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div><code className="text-ocean-300">{'{{brand_name}}'}</code> - Brand identifier</div>
                                <div><code className="text-ocean-300">{'{{brand_id}}'}</code> - Brand ID</div>
                                <div><code className="text-ocean-300">{'{{date_range}}'}</code> - Full date range</div>
                                <div><code className="text-ocean-300">{'{{start_date}}'}</code> - Start date</div>
                                <div><code className="text-ocean-300">{'{{end_date}}'}</code> - End date</div>
                                <div><code className="text-ocean-300">{'{{total_responses}}'}</code> - Response count</div>
                                <div><code className="text-ocean-300">{'{{presence_pct}}'}</code> - Brand presence %</div>
                                <div><code className="text-ocean-300">{'{{position_score}}'}</code> - Position score</div>
                                <div><code className="text-ocean-300">{'{{sentiment_score}}'}</code> - Sentiment score</div>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              💡 Tip: Type these exactly as shown (including double curly braces) anywhere in your slides
                            </p>
                          </div>

                          <div>
                            <p className="font-semibold mb-2">Example Usage:</p>
                            <div className="bg-gray-50 rounded p-3 text-xs">
                              <p className="mb-1">In your slide, you might write:</p>
                              <p className="font-mono text-gray-600 ml-2">
                                "During {'{{date_range}}'}, <span className="text-ocean-300">{'{{brand_name}}'}</span> had a presence in <span className="text-ocean-300">{'{{presence_pct}}'}</span> of responses."
                              </p>
                              <p className="mt-2 text-gray-500">This will become:</p>
                              <p className="font-mono text-gray-600 ml-2">
                                "During 2024-01-01 to 2024-01-31, <span className="text-green-600">Acme Corp</span> had a presence in <span className="text-green-600">45.2%</span> of responses."
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Metrics Selection - Only show for custom templates */}
            {useCustomTemplate && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Select Metrics to Include
                </h2>
                <MetricsSelector
                  selectedMetrics={formState.metrics}
                  onChange={metrics => updateForm('metrics', metrics)}
                />
              </section>
            )}

            {/* Generation */}
            <section className="space-y-4">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generationStep !== 'idle' && generationStep !== 'error' && generationStep !== 'done'}
                className="w-full px-6 py-3 bg-ocean-300 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base transition-colors"
              >
                Generate Slides
              </button>

              <ProgressTracker
                step={generationStep}
                error={error}
                slideLink={slideLink}
              />
            </section>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Need help? Check out the{' '}
            <a
              href="https://docs.google.com/document/d/example"
              className="text-ocean-300 hover:text-ocean-400 font-medium"
            >
              template creation guide
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
