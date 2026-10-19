import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Key, Activity, Sun, Moon, Sparkles, ExternalLink, CheckCircle2, X, Terminal, RefreshCw, Image as ImageIcon, ShieldCheck, FolderOpen, Plus, HelpCircle, Volume2, VolumeX, Film, Play, LogOut, MoreHorizontal, FileText, Settings, Zap } from 'lucide-react';
import { ImageModelType, VeoModelType, AuthMode, JobSummary } from '../types';
import { getMediaUrl } from '../utils/media';
import { ProjectsModal } from './ProjectsModal';

interface HeaderProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  authMode: AuthMode;
  onAuthModeChange: (mode: AuthMode) => void;
  selectedModel: ImageModelType;
  onModelChange: (model: ImageModelType) => void;
  selectedVeoModel?: VeoModelType;
  onVeoModelChange?: (model: VeoModelType) => void;
  isDarkMode: boolean;
  onToggleTheme: (e?: React.MouseEvent) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  authUser?: { email: string; name: string; ldap?: string; picture?: string } | null;
  onSignOut?: () => void;
  currentJobId: string | null;
  jobs: JobSummary[];
  isLoadingJobs: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  onSelectJob: (jobId: string) => void;
  onCreateNewJob: () => void;
  onDeleteJob: (jobId: string) => Promise<void>;
  onBulkDeleteAllJobs?: () => Promise<void>;
  onRefreshJobs: () => void;
  onOpenPromptGuide?: () => void;
  hasCustomPromptGuide?: boolean;
  onOpenWelcomeGuide?: () => void;
  directorMode?: 'express' | 'expert';
  onDirectorModeChange?: (mode: 'express' | 'expert') => void;
  brandName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  apiKey,
  onApiKeyChange,
  authMode,
  onAuthModeChange,
  selectedModel,
  onModelChange,
  selectedVeoModel = 'veo-3.1-fast-generate-preview',
  onVeoModelChange,
  isDarkMode,
  onToggleTheme,
  soundEnabled = true,
  onToggleSound,
  authUser,
  onSignOut,
  currentJobId,
  jobs,
  isLoadingJobs,
  saveStatus,
  onSelectJob,
  onCreateNewJob,
  onDeleteJob,
  brandName,
  onBulkDeleteAllJobs,
  onRefreshJobs,
  onOpenPromptGuide,
  hasCustomPromptGuide = false,
  onOpenWelcomeGuide,
  directorMode = 'express',
  onDirectorModeChange,
}) => {
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showBulkDeleteInModal, setShowBulkDeleteInModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [tempKey, setTempKey] = useState(apiKey);
  const [tempModel, setTempModel] = useState<ImageModelType>(selectedModel);
  const [tempVeoModel, setTempVeoModel] = useState<VeoModelType>(selectedVeoModel);

  // Close moreMenu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  // Test Gemini API State
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const staticTestPrompt = `A cinematic close-up of Aerospace turbine throttle quadrant for Porsche Motorsport for Porsche Motorsport in a setting of Hyper-modern automotive telemetry laboratory, titanium engine components, illuminated carbon fiber cockpit gauge. The number "10" is physically engraved, illuminated, embossed, or stamped directly onto the etched titanium power gauge marking '10' as an authentic, diegetic part of the physical object with realistic wear and reflections. No artificial or floating graphic overlays. Cinematic 8K, photorealistic, shot on 35mm anamorphic lens, shallow depth of field, natural atmospheric lighting, dynamic push-in zoom, highly detailed texture, hyper-realistic color grading, 16:9 aspect ratio.`;

  useEffect(() => {
    setTempKey(apiKey);
  }, [apiKey]);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const base = window.location.port === '5173' ? 'http://localhost:3001' : '';
      const res = await fetch(`${base}/api/logs`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.warn('Could not fetch logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleRunApiTest = async () => {
    setIsTestingApi(true);
    setTestError(null);
    setTestResult(null);
    try {
      const base = window.location.port === '5173' ? 'http://localhost:3001' : '';
      const res = await fetch(`${base}/api/test-gemini-api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: staticTestPrompt,
          apiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(data);
      } else {
        setTestError(data.error || 'Test failed');
      }
    } catch (err: any) {
      setTestError(err.message);
    } finally {
      setIsTestingApi(false);
    }
  };

  const modelLabels: Record<ImageModelType, { name: string; desc: string; badge: string }> = {
    'gemini-nano-banana-2.1': {
      name: 'Gemini Nano Banana 2.1 (4K Ultra-Wide)',
      desc: 'Latest high-fidelity multimodal image model with native 32:9 and 4K output',
      badge: 'Latest 4K',
    },
    'gemini-3.1-flash-image': {
      name: 'Gemini Nano Banana 2 (3.1 Flash Image)',
      desc: 'Fast multimodal image model with direct diegetic number grounding',
      badge: 'Fast Model',
    },
    'imagen-3.0-generate-002': {
      name: 'Google Imagen 3 (Photorealism)',
      desc: '35mm anamorphic cinematic lighting & texture fidelity',
      badge: 'High Quality',
    },
    'imagen-3.0-fast-generate-001': {
      name: 'Google Imagen 3 Fast',
      desc: 'Ultra rapid low-latency thumbnail generation',
      badge: 'Fast',
    },
    'procedural-diegetic': {
      name: 'Procedural Diegetic Canvas Engine',
      desc: 'High-definition offline renderer with zero API key requirement',
      badge: 'Offline/Local',
    },
  };

  const veoModelLabels: Record<VeoModelType, { name: string; desc: string; badge: string }> = {
    'veo-3.1-generate-preview': {
      name: 'Veo 3.1 Studio (4K Flagship)',
      desc: 'Master quality high-fidelity video generation for broadcast 4K 60fps',
      badge: '4K Studio',
    },
    'veo-3.1-fast-generate-preview': {
      name: 'Veo 3.1 Fast',
      desc: 'Rapid high-throughput video generation for quick iterative previews',
      badge: 'Turbo',
    },
  };

  const activeJob = jobs.find((j) => j.jobId === currentJobId);
  const activeCustomerName = activeJob?.customerName || 'Projects';

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm transition-colors duration-200">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4285F4]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FBBC04]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>Magic Countdown Generator</span>
              {brandName && brandName.trim() && (
                <span className="px-3 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-blue-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  <span>{brandName.trim()}</span>
                </span>
              )}
            </h1>
            {onOpenWelcomeGuide && (
              <button
                type="button"
                onClick={onOpenWelcomeGuide}
                className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                title="Show 3-step guide: How Magic Countdown works"
              >
                <HelpCircle className="w-3.5 h-3.5 text-white" />
                <span>How It Works</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            30-Second Cinematic Countdown Generator · Created by{' '}
            <a
              href="https://moma.corp.google.com/person/aosterloh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1a73e8] dark:text-[#8ab4f8] font-semibold hover:underline inline-flex items-center gap-0.5"
              title="Open aosterloh@ on Google MoMa Directory"
            >
              <span>aosterloh@</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </p>
        </div>
      </div>

      {/* Director Mode Switcher: Express vs Expert */}
      {onDirectorModeChange && (
        <div className="hidden lg:flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
          <button
            type="button"
            onClick={() => onDirectorModeChange('express')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              directorMode === 'express'
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Express Director</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 text-white font-mono">DEFAULT</span>
          </button>
          <button
            type="button"
            onClick={() => onDirectorModeChange('expert')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              directorMode === 'expert'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Expert Director</span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-2.5">
        {/* Projects Popup Button (Shift+Click triggers Maintenance Mode) */}
        <button
          type="button"
          onClick={(e) => {
            if (e.shiftKey) {
              setShowBulkDeleteInModal(true);
            } else {
              setShowBulkDeleteInModal(false);
            }
            setShowProjectsModal(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-sm transition-all active:scale-95 group"
          title="Open Projects Management (Shift+Click for Project Maintenance)"
        >
          <FolderOpen className="w-4 h-4 text-[#4285F4] group-hover:scale-110 transition-transform" />
          <span className="truncate max-w-[150px]">{activeCustomerName}</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
            {jobs.length}
          </span>
        </button>

        {/* Live Auto-Save Indicator */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold border transition-all ${
            saveStatus === 'saving'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
              : saveStatus === 'error'
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
          }`}
          title={
            saveStatus === 'saving'
              ? 'Saving to Google Cloud Storage...'
              : saveStatus === 'error'
              ? 'Failed to auto-save to Cloud Storage'
              : 'All project changes synced to Google Cloud Storage'
          }
        >
          {saveStatus === 'saving' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Saving...</span>
            </>
          ) : saveStatus === 'error' ? (
            <>
              <X className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Save Error</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Saved</span>
            </>
          )}
        </div>

        {/* New Project Quick Button */}
        <button
          type="button"
          onClick={onCreateNewJob}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95"
          title="Create a new countdown project"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Project</span>
        </button>

        {/* More Options Dropdown Menu */}
        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            onClick={() => setShowMoreMenu((prev) => !prev)}
            className={`p-2.5 rounded-xl border transition-all shadow-sm flex items-center justify-center ${
              showMoreMenu
                ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 text-[#4285F4]'
                : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="More Options & Utilities"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMoreMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-scaleUp text-xs">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Preferences &amp; Tools
              </div>

              {/* Theme Mode Toggle */}
              <button
                type="button"
                onClick={(e) => {
                  onToggleTheme(e);
                  setShowMoreMenu(false);
                }}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              >
                <div className="flex items-center gap-2.5 font-medium">
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
                  <span>Appearance</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                  {isDarkMode ? 'Dark' : 'Light'}
                </span>
              </button>

              {/* Sound Audio Chimes Toggle */}
              {onToggleSound && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleSound();
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 font-medium">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-[#4285F4]" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Sound Chimes</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      soundEnabled
                        ? 'bg-blue-100 dark:bg-blue-950 text-[#1a73e8] dark:text-[#8ab4f8]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {soundEnabled ? 'ON' : 'MUTED'}
                  </span>
                </button>
              )}

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Resources &amp; Guides
              </div>

              {/* Demo Google Slides Link */}
              <a
                href="https://docs.google.com/presentation/d/1UiozkVzzAuUBGM9DnBwH7w1YXW5Bg4TGWKG_LLCrozE/present?resourcekey=0-DtBmf2QuW69Mh66-ZLXlYA&slide=id.p"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMoreMenu(false)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              >
                <div className="flex items-center gap-2.5 font-medium">
                  <Play className="w-4 h-4 fill-[#EA4335] text-[#EA4335]" />
                  <span>Demo Slides</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>

              {/* Creative Direction Guide */}
              {onOpenPromptGuide && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenPromptGuide();
                    setShowMoreMenu(false);
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5 font-medium">
                    <Film className={`w-4 h-4 ${hasCustomPromptGuide ? 'text-amber-500' : 'text-[#4285F4]'}`} />
                    <span>Creative Direction Guide</span>
                  </div>
                  {hasCustomPromptGuide ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400" title="Customized guidelines active" />
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">Rules</span>
                  )}
                </button>
              )}

              {/* EGM Specification */}
              <a
                href="/specifications/spec_v12.html"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMoreMenu(false)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
              >
                <div className="flex items-center gap-2.5 font-medium">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span>EGM v12.0 Complete Spec</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          )}
        </div>

        {/* User Identity & Sign Out */}
        {authUser && (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-800">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-sm"
              title={`Signed in as ${authUser.email}`}
            >
              {authUser.picture ? (
                <img src={authUser.picture} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
              <span className="font-bold max-w-[110px] truncate">
                {authUser.ldap || (authUser.email ? authUser.email.split('@')[0] : authUser.name || 'Google User')}
              </span>
            </div>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-sm"
                title="Sign out of application"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Projects Management Modal */}
      <ProjectsModal
        isOpen={showProjectsModal}
        onClose={() => {
          setShowProjectsModal(false);
          setShowBulkDeleteInModal(false);
        }}
        currentJobId={currentJobId}
        jobs={jobs}
        isLoading={isLoadingJobs}
        onSelectJob={onSelectJob}
        onCreateNewJob={onCreateNewJob}
        onDeleteJob={onDeleteJob}
        onBulkDeleteAllJobs={onBulkDeleteAllJobs}
        onRefreshJobs={onRefreshJobs}
        currentLdap={authUser?.ldap || (authUser?.email ? authUser.email.split('@')[0] : undefined)}
        showBulkDelete={showBulkDeleteInModal}
      />

      {/* PORTAL MODAL 1: Log Analysis Modal */}
      {showLogsModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] overflow-y-auto flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scaleUp my-auto max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#4285F4]">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Live Server & AI Log Analysis
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Real-time backend trace, model response payloads, and execution metrics.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchLogs}
                    disabled={isLoadingLogs}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={() => setShowLogsModal(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Log Stream */}
              <div className="flex-1 overflow-y-auto space-y-2 p-4 bg-slate-950 rounded-2xl font-mono text-xs text-slate-300 border border-slate-800 max-h-96">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No logs recorded yet.</div>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-semibold">{new Date(l.timestamp).toLocaleTimeString()}</span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            l.level === 'SUCCESS'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : l.level === 'WARN'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : l.level === 'ERROR'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-blue-950 text-blue-400 border border-blue-800'
                          }`}
                        >
                          {l.category} • {l.level}
                        </span>
                      </div>
                      <div className="text-slate-200">{l.message}</div>
                      {l.details && (
                        <pre className="text-[10px] text-slate-400 overflow-x-auto p-1.5 bg-black/50 rounded">
                          {typeof l.details === 'string' ? l.details : JSON.stringify(l.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Close Logs
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* PORTAL MODAL 2: Test Gemini API Modal */}
      {showTestModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] overflow-y-auto flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Test Gemini API (Single Image Test)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Live test with Gemini Nano Banana (gemini-2.5-flash-image).
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowTestModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Static Prompt Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Static Test Prompt:
                </label>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed max-h-24 overflow-y-auto">
                  {staticTestPrompt}
                </div>
              </div>

              {/* Generated Image Preview & Diagnostic Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#4285F4]" />
                    <span>Real AI Generated Image (Nano Banana)</span>
                  </label>
                  <button
                    type="button"
                    disabled={isTestingApi}
                    onClick={handleRunApiTest}
                    className="px-3.5 py-1.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingApi ? 'animate-spin' : ''}`} />
                    <span>{isTestingApi ? 'Synthesizing...' : 'Re-run Test'}</span>
                  </button>
                </div>

                {isTestingApi && (
                  <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3 text-center">
                    <RefreshCw className="w-8 h-8 text-[#4285F4] animate-spin" />
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Generating photorealistic AI image via Gemini Nano Banana...
                    </p>
                  </div>
                )}

                {testResult?.imageUri && (
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md aspect-video bg-black">
                      <img
                        src={getMediaUrl(testResult.imageUri)}
                        alt="Gemini API Test"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Diagnostic Attempts Summary */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        API Diagnostic Log:
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        {testResult.attempts?.map((att: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                att.success
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {att.status || '200'}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{att.target}:</span>
                            <span className="text-slate-500 truncate max-w-sm">{att.responsePreview || att.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {testError && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                    {testError}
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* PORTAL MODAL 3: Model & API Key Settings Modal */}
      {showKeyModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] overflow-y-auto flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-[#4285F4]">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Google AI Studio & Model Settings
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure your model selection & API key settings.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowKeyModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Google AI Studio API Key Box */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#4285F4] uppercase tracking-wider">
                    Google Gemini API Key
                  </label>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Loaded from .env</span>
                  </span>
                </div>

                <input
                  type="text"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value.trim())}
                  placeholder="Enter your Gemini API key..."
                  className="w-full px-3.5 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 font-mono shadow-sm"
                />
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Connected to <strong>gemini-2.5-flash-image (Nano Banana)</strong>.
                </p>
              </div>

              {/* Image Model Selector */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Image Generation Model
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(Object.keys(modelLabels) as ImageModelType[]).map((mKey) => {
                    const mInfo = modelLabels[mKey];
                    const isSelected = tempModel === mKey;
                    return (
                      <div
                        key={mKey}
                        onClick={() => setTempModel(mKey)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-[#4285F4] ring-1 ring-[#4285F4]'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{mInfo.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-[#4285F4] border border-blue-200 dark:border-blue-800">
                              {mInfo.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{mInfo.desc}</p>
                        </div>
                        <input
                          type="radio"
                          name="modelSelection"
                          checked={isSelected}
                          onChange={() => setTempModel(mKey)}
                          className="accent-[#4285F4]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Veo Video Model Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    Veo Video Generation Model
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Vertex AI & AI Studio
                  </span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(Object.keys(veoModelLabels) as VeoModelType[]).map((vKey) => {
                    const vInfo = veoModelLabels[vKey];
                    const isSelected = tempVeoModel === vKey;
                    return (
                      <div
                        key={vKey}
                        onClick={() => setTempVeoModel(vKey)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{vInfo.name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {vInfo.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{vInfo.desc}</p>
                          <code className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">{vKey}</code>
                        </div>
                        <input
                          type="radio"
                          name="veoModelSelection"
                          checked={isSelected}
                          onChange={() => setTempVeoModel(vKey)}
                          className="accent-purple-600"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApiKeyChange(tempKey);
                    onModelChange(tempModel);
                    if (onVeoModelChange) onVeoModelChange(tempVeoModel);
                    setShowKeyModal(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-500/20"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};
