import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  RefreshCw,
  Palette,
  Info,
  Globe,
  AlertCircle,
  CheckCircle2,
  ArrowDown,
  X,
  BookOpen,
  ExternalLink,
  Lightbulb,
} from 'lucide-react';
import { UNIVERSAL_STYLE_ANCHOR } from '../utils/promptBuilder';

interface ThemeInputFormProps {
  onGeneratePrompts: (
    brand: string,
    theme: string,
    styleAnchor: string,
    ldap: string,
    companyUrl?: string
  ) => Promise<void>;
  isLoading: boolean;
  initialBrandName?: string;
  initialCompanyUrl?: string;
  onChangeCompanyUrl?: (url: string) => void;
  initialThemeContext?: string;
  initialCreatorLdap?: string;
  onOpenStepGuide?: () => void;
  onOpenPromptGuide?: () => void;
}

export function formatVisualIdeasWithNewlines(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/(?:^|\n)\s*(\d{1,2}\.|\#\d{1,2}\b|(?:Numeral|Shot|Scene)\s*"?\d{1,2}"?:?)/gi, (match, prefix, offset) => {
      return (offset === 0 ? '' : '\n\n') + prefix;
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const ThemeInputForm: React.FC<ThemeInputFormProps> = ({
  onGeneratePrompts,
  isLoading,
  initialBrandName = '',
  initialCompanyUrl = '',
  onChangeCompanyUrl,
  initialThemeContext = '',
  initialCreatorLdap = '',
  onOpenStepGuide,
  onOpenPromptGuide,
}) => {
  // Company URL & Brand detection
  const [companyUrl, setCompanyUrl] = useState(() => {
    if (initialCompanyUrl) return initialCompanyUrl;
    if (
      initialBrandName &&
      (initialBrandName.includes('.') || initialBrandName.startsWith('http'))
    ) {
      return initialBrandName;
    }
    return '';
  });
  const [brandName, setBrandName] = useState(initialBrandName);
  const [detectedBrand, setDetectedBrand] = useState<string | null>(null);
  const [businessSummary, setBusinessSummary] = useState<string | null>(null);
  const [themeContext, setThemeContext] = useState(initialThemeContext);
  const [creatorLdap, setCreatorLdap] = useState(() => {
    try {
      const saved = localStorage.getItem('saved_google_email');
      if (saved && saved.endsWith('@google.com') && saved !== 'user@google.com') return saved;
    } catch {}
    if (initialCreatorLdap && initialCreatorLdap.endsWith('@google.com') && initialCreatorLdap !== 'user@google.com') return initialCreatorLdap;
    return '';
  });
  const [styleAnchor, setStyleAnchor] = useState(UNIVERSAL_STYLE_ANCHOR);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGettingIdeas, setIsGettingIdeas] = useState(false);
  const [ideasNotice, setIdeasNotice] = useState<string | null>(null);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const isGoogleEmailValid = /^[a-zA-Z0-9._%+-]+@google\.com$/.test(creatorLdap.trim().toLowerCase());

  // Helper pop-up callout for first-time users indicating where to enter Customer URL
  const [showUrlHelper, setShowUrlHelper] = useState<boolean>(() => {
    try {
      const seen = localStorage.getItem('seen_url_helper');
      return seen !== 'true' && !initialCompanyUrl;
    } catch {
      return true;
    }
  });

  const dismissUrlHelper = () => {
    setShowUrlHelper(false);
    try {
      localStorage.setItem('seen_url_helper', 'true');
    } catch {}
  };

  // Sync state if initial props change
  React.useEffect(() => {
    if (initialCompanyUrl !== undefined) setCompanyUrl(initialCompanyUrl);
  }, [initialCompanyUrl]);

  React.useEffect(() => {
    if (initialBrandName) setBrandName(initialBrandName);
  }, [initialBrandName]);

  React.useEffect(() => {
    if (initialThemeContext !== undefined) setThemeContext(initialThemeContext);
  }, [initialThemeContext]);

  React.useEffect(() => {
    if (
      initialCreatorLdap !== undefined &&
      !creatorLdap &&
      initialCreatorLdap.endsWith('@google.com') &&
      initialCreatorLdap !== 'user@google.com'
    ) {
      setCreatorLdap(initialCreatorLdap);
    }
  }, [initialCreatorLdap]);

  const handleGetVisualIdeas = async () => {
    setIdeasError(null);
    setIdeasNotice(null);

    let cleanedUrl = companyUrl.trim();
    if (!cleanedUrl) {
      setIdeasError(
        'Please enter a company website URL (e.g. company.com or https://company.com).'
      );
      return;
    }

    if (!/^https?:\/\//i.test(cleanedUrl)) {
      cleanedUrl = `https://${cleanedUrl}`;
      setCompanyUrl(cleanedUrl);
      onChangeCompanyUrl?.(cleanedUrl);
    }

    try {
      const parsed = new URL(cleanedUrl);
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        setIdeasError(
          'Please enter a valid domain name (e.g. company.com or https://company.com).'
        );
        return;
      }
    } catch {
      setIdeasError('Invalid URL format. Please enter a valid website URL.');
      return;
    }

    setIsGettingIdeas(true);
    try {
      const res = await fetch('/api/suggest-brand-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyUrl: cleanedUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setIdeasError(
          data.error || 'Failed to verify URL or research visual scenes.'
        );
        return;
      }

      if (data.visualIdeas) {
        setThemeContext(formatVisualIdeasWithNewlines(data.visualIdeas));
      }
      if (data.detectedBrandName) {
        setDetectedBrand(data.detectedBrandName);
        setBrandName(data.detectedBrandName);
      }
      if (data.businessSummary) {
        setBusinessSummary(data.businessSummary);
      }

      setIdeasNotice(
        '✨ Researched your brand & crafted 10 custom countdown scenes!'
      );
    } catch (err: any) {
      setIdeasError(
        err.message || 'Network error while researching visual scenes.'
      );
    } finally {
      setIsGettingIdeas(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorLdap.trim() || !isGoogleEmailValid) return;
    if (!themeContext.trim()) return;

    // Use detected brand or derive clean brand from company URL
    let effectiveBrand = brandName.trim();
    if (!effectiveBrand && companyUrl.trim()) {
      try {
        const u = new URL(
          /^https?:\/\//i.test(companyUrl.trim())
            ? companyUrl.trim()
            : `https://${companyUrl.trim()}`
        );
        effectiveBrand = u.hostname.replace(/^www\./, '').split('.')[0].toUpperCase();
      } catch {
        effectiveBrand = 'Project';
      }
    }

    const cleanEmail = creatorLdap.trim().toLowerCase();
    try {
      localStorage.setItem('saved_google_email', cleanEmail);
    } catch {}

    onGeneratePrompts(
      effectiveBrand || 'Project',
      themeContext,
      styleAnchor,
      cleanEmail,
      companyUrl.trim()
    );
  };

  const hasVisualIdeas = themeContext && themeContext.trim().length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#4285F4]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 1: Customer Company URL & Visual Ideas
              </h2>
              {onOpenStepGuide && (
                <button
                  type="button"
                  onClick={onOpenStepGuide}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-[#4285F4] border border-blue-500/30 hover:bg-blue-500/20 transition-colors cursor-pointer"
                  title="Open Step 1 Guide"
                >
                  <Info className="w-3 h-3" />
                  <span>Guide</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the company website URL to verify authenticity and research 10 domain-authentic countdown scenes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#4285F4] flex items-center gap-1.5 transition-colors font-medium"
        >
          <Palette className="w-3.5 h-3.5" />
          <span>{showAdvanced ? 'Hide Style Anchor' : 'Customize Visual Anchor'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer Company Website URL + Get Visual Ideas Button */}
        <div className="space-y-2">
          {/* First-Time User Helper Pop-up Callout */}
          {showUrlHelper && (
            <div className="relative p-4 rounded-2xl bg-gradient-to-r from-[#1a73e8] via-[#1557b0] to-indigo-600 text-white shadow-xl shadow-blue-500/20 border border-white/20 animate-scaleUp mb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-white/25 text-[10px] font-black tracking-wider uppercase">
                        Start Here
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-white">
                        Enter Customer Website URL
                      </h4>
                    </div>
                    <p className="text-xs text-blue-100 leading-relaxed">
                      Type or paste your customer's website URL below (e.g. <span className="font-mono font-bold text-white bg-white/20 px-1 py-0.5 rounded">madsack.de</span> or <span className="font-mono font-bold text-white bg-white/20 px-1 py-0.5 rounded">bmw.com</span>) and click <strong className="text-white">Get Visual Ideas</strong>. Our creative generator will research the brand in real-time and generate 10 domain-authentic countdown scenes!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={dismissUrlHelper}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all shrink-0 cursor-pointer"
                  title="Dismiss hint"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Bouncing Pointer Arrow down toward the input */}
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-white/15 text-[11px] font-bold text-cyan-100">
                <ArrowDown className="w-3.5 h-3.5 text-cyan-200 animate-bounce" />
                <span>Enter website URL into the glowing box below:</span>
                <button
                  type="button"
                  onClick={dismissUrlHelper}
                  className="ml-auto text-[10px] underline hover:text-white font-medium cursor-pointer"
                >
                  Got it, dismiss
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Customer Company Website URL <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              Used with Google Search grounding to prevent brand/industry confusion
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={companyUrl}
                onFocus={() => {
                  if (showUrlHelper) dismissUrlHelper();
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setCompanyUrl(val);
                  onChangeCompanyUrl?.(val);
                  if (ideasError) setIdeasError(null);
                  if (showUrlHelper) dismissUrlHelper();
                }}
                placeholder="e.g. https://company.com or company.com"
                className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border ${
                  showUrlHelper
                    ? 'border-[#1a73e8] ring-4 ring-blue-500/35 shadow-lg shadow-blue-500/15 animate-pulse'
                    : 'border-slate-200 dark:border-slate-800'
                } text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 transition-all font-medium`}
              />
            </div>

            <button
              type="button"
              onClick={handleGetVisualIdeas}
              disabled={isGettingIdeas || !companyUrl.trim()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition-all whitespace-nowrap"
            >
              {isGettingIdeas ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying & Researching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Get Visual Ideas</span>
                </>
              )}
            </button>
          </div>

          {/* Validation or Lookup Error Notice */}
          {ideasError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{ideasError}</span>
            </div>
          )}

          {/* Verified Domain Summary */}
          {(detectedBrand || businessSummary || ideasNotice) && (
            <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Verified Organization: {detectedBrand || companyUrl}</span>
                </div>
                {ideasNotice && (
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                    {ideasNotice}
                  </span>
                )}
              </div>
              {businessSummary && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 pl-6 leading-relaxed">
                  {businessSummary}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Expandable Visual Ideas Text Box */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>10 Visual Scenes & Substrates (Freely Editable)</span>
              {hasVisualIdeas && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                  Ready
                </span>
              )}
            </label>
            <div className="flex items-center gap-3">
              {hasVisualIdeas && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-[#4285F4] transition-colors"
                >
                  {isExpanded ? 'Collapse View' : 'Expand Editor'}
                </button>
              )}
              {hasVisualIdeas && companyUrl.trim().length > 0 && (
                <button
                  type="button"
                  onClick={handleGetVisualIdeas}
                  disabled={isGettingIdeas}
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-[#4285F4] flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isGettingIdeas ? 'animate-spin' : ''}`} />
                  <span>Re-research</span>
                </button>
              )}
            </div>
          </div>

          <textarea
            rows={isExpanded ? 14 : 7}
            value={themeContext}
            onChange={(e) => setThemeContext(e.target.value)}
            placeholder="Click 'Get Visual Ideas' above to research 10 authentic visual scenes matching your company website URL, or write/paste 10 custom scenes generated externally via Gemini using the Creative Direction Guide..."
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 transition-all font-mono leading-relaxed resize-y"
          />

          {/* External Generation Explainer Callout (Gemini & Creative Guide) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/60 dark:from-slate-900 dark:to-blue-950/30 border border-blue-200 dark:border-blue-800/80 space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-[#4285F4] shrink-0 mt-0.5">
                <Lightbulb className="w-4 h-4 text-[#4285F4]" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Pro Tip: Generate Outside with Gemini &amp; The Creative Guide
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/15 text-[#4285F4] border border-blue-500/20">
                    Creative Alternative
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  In addition to <strong>Get Visual Ideas</strong> above, you can generate your 10 countdown scenes externally using <strong>Gemini</strong> (or your preferred LLM). Simply copy the prompt framework from the <strong>Creative Direction Guide</strong>, paste it into Gemini with your customer website or theme, and paste the 10 resulting scene descriptions (10 down to 1) directly into the box above.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {onOpenPromptGuide && (
                    <button
                      type="button"
                      onClick={onOpenPromptGuide}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-xs font-bold text-[#4285F4] border border-blue-200 dark:border-slate-700 shadow-sm transition-all cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Open Creative Direction Guide</span>
                    </button>
                  )}
                  <a
                    href="https://gemini.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <span>Open Gemini (gemini.google.com)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Owner Google Email */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Your Google Email (Project Owner) <span className="text-rose-500">*</span>
            </label>
            <div
              className="relative group cursor-pointer"
              title="Enter your full @google.com address so you can easily locate and filter your projects in the projects library."
            >
              <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#4285F4] transition-colors" />
            </div>
          </div>
          <input
            type="email"
            required
            value={creatorLdap}
            onChange={(e) => setCreatorLdap(e.target.value)}
            placeholder="e.g. yourname@google.com"
            className={`w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border ${
              creatorLdap && !isGoogleEmailValid
                ? 'border-rose-400 dark:border-rose-500 ring-2 ring-rose-500/10'
                : 'border-slate-200 dark:border-slate-800'
            } text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 transition-all font-medium`}
          />
          {creatorLdap && !isGoogleEmailValid && (
            <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium">
              Must be a complete Google email address ending with @google.com
            </p>
          )}
        </div>

        {showAdvanced && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 animate-fadeIn">
            <label className="block text-xs font-bold text-[#4285F4] uppercase tracking-wider">
              Universal Visual Style Anchor (Repeated across all 10 shots)
            </label>
            <textarea
              rows={2}
              value={styleAnchor}
              onChange={(e) => setStyleAnchor(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono focus:outline-none focus:border-[#4285F4]"
            />
            <p className="text-[11px] text-slate-500">
              This invariant guarantees cinematic cohesion across all 10 independent generations.
            </p>
          </div>
        )}

        {/* Submit Action: ONLY rendered when visual ideas exist */}
        {hasVisualIdeas ? (
          <div className="flex justify-end pt-2 animate-fadeIn">
            <button
              type="submit"
              disabled={isLoading || !isGoogleEmailValid}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-98 disabled:opacity-50 text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Starting Scene Generation...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Countdown Video</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 animate-fadeIn">
            <Sparkles className="w-5 h-5 text-purple-500 shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Step 1: Enter company website URL and click &quot;Get Visual Ideas&quot;
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                We'll review your company website and craft 10 brand-authentic countdown scenes. Once ready, click <strong>&quot;Create Countdown Video&quot;</strong> to generate all 10 scenes.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
