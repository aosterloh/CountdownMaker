import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Globe,
  Film,
  Download,
  Share2,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Clock,
  Play,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Copy,
  Check,
  Image as ImageIcon,
  Bot,
  Monitor,
  Maximize2,
  Mic,
} from 'lucide-react';
import { CountdownSlot, VeoQueueStatus } from '../types';
import { getMediaUrl } from '../utils/media';

interface ExpressDirectorViewProps {
  companyUrl: string;
  onCompanyUrlChange: (url: string) => void;
  brandName: string;
  onBrandNameChange: (brand: string) => void;
  themeContext: string;
  onThemeContextChange: (theme: string) => void;
  industry?: string;

  // Feature Selectors (Checkboxes)
  includeCinemaWallpaper: boolean;
  onIncludeCinemaWallpaperChange: (val: boolean) => void;
  includeBugdroidMascot: boolean;
  onIncludeBugdroidMascotChange: (val: boolean) => void;
  includeCountdownVideo: boolean;
  onIncludeCountdownVideoChange: (val: boolean) => void;

  // Deliverables State
  isAnalyzingBrand?: boolean;
  cinemaWallpaperUri: string | null;
  wallpaperPillars?: Array<{ division: string; prompt: string }>;
  currentPillarIndex?: number;
  wallpaperAspectRatio?: '32:9' | '16:9';
  onWallpaperAspectRatioChange?: (ratio: '32:9' | '16:9') => void;
  bugdroidMascotUri: string | null; // Worker
  bugdroidSpeakerUri?: string | null; // Keynote Speaker
  isGeneratingWallpaper: boolean;
  isGeneratingBugdroid: boolean;
  isGeneratingSpeakerBugdroid?: boolean;
  wallpaperError?: string | null;
  bugdroidError?: string | null;
  speakerBugdroidError?: string | null;
  onRedoWallpaper: () => Promise<void>;
  onRedoBugdroid: (type?: 'worker' | 'speaker') => Promise<void>;

  // Countdown Video State
  isGeneratingPrompts: boolean;
  isBatchGeneratingVideos: boolean;
  isExportingMaster: boolean;
  isExportingExtendedMaster: boolean;
  slots: CountdownSlot[];
  veoQueueStatus: VeoQueueStatus;
  extended4kUri: string | null;
  master4kUri: string | null;
  youtubeUrl: string | null;
  isUploadingYouTube: boolean;
  youtubeUploadError: string | null;
  autoUploadYouTube: boolean;
  onAutoUploadYouTubeChange: (val: boolean) => void;

  // Actions
  onStartAutopilot: () => void;
  onUploadToYouTube: () => Promise<void>;
  onResetProject: () => void;
  onExportExtended: (resolution?: '720p' | '4k') => Promise<void>;
  exportError?: string | null;
}

export const ExpressDirectorView: React.FC<ExpressDirectorViewProps> = ({
  companyUrl,
  onCompanyUrlChange,
  brandName,
  onBrandNameChange,
  themeContext,
  onThemeContextChange,
  industry,
  includeCinemaWallpaper,
  onIncludeCinemaWallpaperChange,
  includeBugdroidMascot,
  onIncludeBugdroidMascotChange,
  includeCountdownVideo,
  onIncludeCountdownVideoChange,
  isAnalyzingBrand = false,
  cinemaWallpaperUri,
  wallpaperPillars = [],
  currentPillarIndex = 0,
  wallpaperAspectRatio = '32:9',
  onWallpaperAspectRatioChange,
  bugdroidMascotUri,
  bugdroidSpeakerUri = null,
  isGeneratingWallpaper,
  isGeneratingBugdroid,
  isGeneratingSpeakerBugdroid = false,
  wallpaperError,
  bugdroidError,
  speakerBugdroidError = null,
  onRedoWallpaper,
  onRedoBugdroid,
  isGeneratingPrompts,
  isBatchGeneratingVideos,
  isExportingMaster,
  isExportingExtendedMaster,
  slots,
  veoQueueStatus,
  extended4kUri,
  master4kUri,
  youtubeUrl,
  isUploadingYouTube,
  youtubeUploadError,
  autoUploadYouTube,
  onAutoUploadYouTubeChange,
  onStartAutopilot,
  onUploadToYouTube,
  onResetProject,
  onExportExtended,
  exportError,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const completedVideosCount = slots.filter((s) => Boolean(s.rawVideoUri || s.processedVideoUri)).length;
  const isVideoPipelineActive =
    isGeneratingPrompts ||
    isBatchGeneratingVideos ||
    isExportingMaster ||
    isExportingExtendedMaster ||
    isUploadingYouTube;

  const isAnyActive =
    isAnalyzingBrand ||
    isVideoPipelineActive ||
    isGeneratingWallpaper ||
    isGeneratingBugdroid ||
    isGeneratingSpeakerBugdroid;

  const finalVideoUri = extended4kUri || master4kUri;

  // Determine if deliverables are ready to display
  const hasAnyDeliverableReady = Boolean(
    cinemaWallpaperUri ||
    bugdroidMascotUri ||
    bugdroidSpeakerUri ||
    (includeCountdownVideo && finalVideoUri)
  );

  const isVideoReady = Boolean(finalVideoUri) && !isVideoPipelineActive;
  const isAllSelectedReady =
    (!includeCinemaWallpaper || Boolean(cinemaWallpaperUri)) &&
    (!includeBugdroidMascot || Boolean(bugdroidMascotUri)) &&
    (!includeCountdownVideo || isVideoReady) &&
    !isAnyActive;

  // Selected features count
  const selectedCount =
    (includeCinemaWallpaper ? 1 : 0) +
    (includeBugdroidMascot ? 1 : 0) +
    (includeCountdownVideo ? 1 : 0);

  // Express Director Zero-Touch Autopilot: Automatically start 4K Master Stitching when all 10 clips are ready
  useEffect(() => {
    if (
      includeCountdownVideo &&
      !isVideoPipelineActive &&
      !isVideoReady &&
      completedVideosCount === 10 &&
      !extended4kUri &&
      !master4kUri &&
      !exportError
    ) {
      console.log('[ExpressDirector] All 10 clips ready. Autonomously initiating 4K Master Stitching...');
      onExportExtended('4k');
    }
  }, [
    includeCountdownVideo,
    isVideoPipelineActive,
    isVideoReady,
    completedVideosCount,
    extended4kUri,
    master4kUri,
    exportError,
    onExportExtended,
  ]);

  // Track elapsed timer while generating
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAnyActive) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnyActive]);

  // Determine current active phase for video stepper
  let activePhase: 'idle' | 'prompts' | 'videos' | 'mastering' | 'youtube' | 'ready' = 'idle';
  if (isVideoReady) {
    activePhase = 'ready';
  } else if (isUploadingYouTube) {
    activePhase = 'youtube';
  } else if (isExportingExtendedMaster || isExportingMaster) {
    activePhase = 'mastering';
  } else if (isBatchGeneratingVideos || completedVideosCount > 0) {
    activePhase = 'videos';
  } else if (isGeneratingPrompts) {
    activePhase = 'prompts';
  }

  const handleCopyYouTube = () => {
    if (!youtubeUrl) return;
    navigator.clipboard.writeText(youtubeUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const displayBrand = brandName && brandName.trim() ? brandName.trim() : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-16">
      {/* Top Banner & Screen Title (Prominently displaying Customer Name) */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-blue-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-black uppercase tracking-wider shadow-sm">
          <Zap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 fill-current" />
          <span>Customer Meeting Package Generator</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {displayBrand ? (
            <span>
              Executive Meeting Package for{' '}
              <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                {displayBrand}
              </span>
            </span>
          ) : (
            'Executive Customer Meeting Package'
          )}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
          Enter any customer URL. Select deliverables to autonomously generate an ultra-wide 32:9 cinema wallpaper, a cute branded Bugdroid mascot on black, and a broadcast-ready 4K countdown video.
        </p>
      </div>

      {/* STATE 1: DELIVERABLES HUB (WHEN ASSETS ARE GENERATED OR READY, OR GENERATION IS ACTIVE) */}
      {(hasAnyDeliverableReady || isAnyActive) && (
        <div className="space-y-6">
          {/* Top Deliverables Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-inner">
                <Sparkles className="w-7 h-7 fill-emerald-500/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {displayBrand ? `${displayBrand} Executive Deliverables` : 'Executive Deliverables'}
                  </h3>
                  {isAllSelectedReady ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      READY
                    </span>
                  ) : isAnyActive ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 animate-pulse flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>GENERATING</span>
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {industry ? <span className="font-semibold text-purple-600 dark:text-purple-400 mr-1.5">{industry} •</span> : null}
                  Prepared for cinema screen display, executive slide deck, and keynote presentation.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onResetProject}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
            >
              + Create Another Package
            </button>
          </div>

          {/* DELIVERABLE CARD 1: 32:9 CINEMA WELCOME WALLPAPER */}
          {/* DELIVERABLE CARD 1: CINEMA WALLPAPER (32:9 or 16:9) */}
          {includeCinemaWallpaper && (
            <div className="bg-white dark:bg-slate-900 border-2 border-purple-500/30 dark:border-purple-500/20 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        1. {wallpaperAspectRatio === '16:9' ? '16:9 Widescreen' : '32:9 Cinema'} Welcome Wallpaper
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                        {wallpaperAspectRatio === '16:9' ? '3840×2160 4K UHD' : '3840×1080 4K Cinema'}
                      </span>
                      {wallpaperPillars && wallpaperPillars.length > 0 && wallpaperPillars[currentPillarIndex % wallpaperPillars.length] && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                          Division: {wallpaperPillars[currentPillarIndex % wallpaperPillars.length].division}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {wallpaperAspectRatio === '16:9'
                        ? 'Standard 16:9 widescreen format tailored for conference presentations, Google Slides, and standard displays.'
                        : 'Ultra-wide panoramic format tailored for the cinema 32:9 display screen.'}
                      {wallpaperPillars && wallpaperPillars.length > 1 && (
                        <span className="ml-1 text-purple-600 dark:text-purple-400 font-semibold">
                          (Pillar {(currentPillarIndex % wallpaperPillars.length) + 1} of {wallpaperPillars.length})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Aspect Ratio Switcher & Redo Wallpaper Pill */}
                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                  {/* Aspect Ratio Segmented Control */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
                    <button
                      type="button"
                      onClick={() => onWallpaperAspectRatioChange?.('32:9')}
                      disabled={isGeneratingWallpaper || isAnalyzingBrand}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        wallpaperAspectRatio === '32:9'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="32:9 Ultrawide Cinema Format (3840×1080)"
                    >
                      32:9 Cinema
                    </button>
                    <button
                      type="button"
                      onClick={() => onWallpaperAspectRatioChange?.('16:9')}
                      disabled={isGeneratingWallpaper || isAnalyzingBrand}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        wallpaperAspectRatio === '16:9'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="16:9 Standard Widescreen Format (3840×2160)"
                    >
                      16:9 Standard
                    </button>
                  </div>

                  {/* Redo Wallpaper Pill */}
                  {(cinemaWallpaperUri || isGeneratingWallpaper) && (
                    <button
                      type="button"
                      onClick={onRedoWallpaper}
                      disabled={isGeneratingWallpaper || isAnalyzingBrand}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-200 dark:border-slate-700 hover:border-purple-500/30 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      title="Rotate to another customer business area & fresh creative theme"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingWallpaper ? 'animate-spin text-purple-500' : ''}`} />
                      <span>{isGeneratingWallpaper ? 'Generating Division...' : '🔄 Redo (Next Division)'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Wallpaper Preview Container (Dynamic 32:9 or 16:9 Aspect Ratio) */}
              <div
                className={`${
                  wallpaperAspectRatio === '16:9' ? 'aspect-video' : 'aspect-[32/9]'
                } bg-slate-950 rounded-2xl overflow-hidden shadow-2xl relative border border-slate-800 flex items-center justify-center group transition-all duration-300`}
              >
                {cinemaWallpaperUri ? (
                  <>
                    <img
                      src={getMediaUrl(cinemaWallpaperUri)}
                      alt={`${wallpaperAspectRatio} Cinema Wallpaper`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4 pointer-events-none">
                      <span className="text-xs font-mono text-white/90 bg-black/50 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                        {wallpaperAspectRatio === '16:9' ? '16:9 • 3840×2160 UHD Widescreen' : '32:9 • 3840×1080 Ultra-Wide Cinema'}
                      </span>
                      <a
                        href={getMediaUrl(cinemaWallpaperUri)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pointer-events-auto p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors"
                        title="View Full Resolution"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </a>
                    </div>
                  </>
                ) : isGeneratingWallpaper || isAnalyzingBrand ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                    <p className="text-xs font-bold text-slate-300">
                      {isAnalyzingBrand
                        ? 'Gemini 4 Argon discovering visionary business pillars...'
                        : `Synthesizing 4K ${wallpaperAspectRatio} Wallpaper with Nano Banana 2.1 (4K)...`}
                    </p>
                    <span className="text-[11px] text-slate-500">
                      {wallpaperAspectRatio === '16:9'
                        ? '16:9 widescreen composition • Optimistic forward-facing business division'
                        : 'Ultra-wide cinematic composition • Optimistic forward-facing business division'}
                    </span>
                  </div>
                ) : wallpaperError ? (
                  <div className="p-4 text-center text-xs text-rose-400 space-y-2">
                    <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
                    <p>{wallpaperError}</p>
                    <button
                      type="button"
                      onClick={onRedoWallpaper}
                      className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold"
                    >
                      Retry Wallpaper
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Wallpaper queued for generation...</span>
                )}
              </div>

              {/* Download Wallpaper Button */}
              {cinemaWallpaperUri && (
                <div className="flex justify-end pt-1">
                  <a
                    href={getMediaUrl(cinemaWallpaperUri)}
                    download={`wallpaper_${(displayBrand || 'client').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${wallpaperAspectRatio === '16:9' ? '16x9_4k' : '32x9_4k'}.png`}
                    className="py-3 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download 4K {wallpaperAspectRatio === '16:9' ? '16:9 Widescreen' : '32:9 Cinema'} Wallpaper (.png)</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* DELIVERABLE CARD 2: DUAL CUTE BUGDROID MASCOTS ON BLACK */}
          {includeBugdroidMascot && (
            <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/30 dark:border-indigo-500/20 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        2. Dual Cute Bugdroid Mascots on Pure Black (#000000)
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                        Worker + Keynote Speaker
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      3D Android Bugdroids wearing customer logo white T-shirts: Company Worker attire and Keynote Speaker with Google-branded mic.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2-Column Grid for Dual Bugdroids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bugdroid 1: Authentic Company Worker */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                        1. Company Worker
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Workwear &amp; Logo T-Shirt
                      </span>
                    </div>
                    {bugdroidMascotUri && (
                      <button
                        type="button"
                        onClick={() => onRedoBugdroid('worker')}
                        disabled={isGeneratingBugdroid}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/30 hover:text-indigo-600 shadow-sm cursor-pointer disabled:opacity-50"
                        title="Regenerate worker mascot"
                      >
                        <RefreshCw className={`w-3 h-3 ${isGeneratingBugdroid ? 'animate-spin text-indigo-500' : ''}`} />
                        <span>Redo</span>
                      </button>
                    )}
                  </div>

                  {/* Image Container */}
                  <div className="bg-black rounded-xl overflow-hidden relative border border-slate-800 flex items-center justify-center p-3 aspect-square group">
                    {bugdroidMascotUri ? (
                      <>
                        <img
                          src={getMediaUrl(bugdroidMascotUri)}
                          alt="Worker Bugdroid Mascot"
                          className="max-h-full max-w-full object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
                        />
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={getMediaUrl(bugdroidMascotUri)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors flex items-center"
                            title="View Full Resolution"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </>
                    ) : isGeneratingBugdroid || isAnalyzingBrand ? (
                      <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                        <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                        <p className="text-xs font-bold text-slate-300">
                          {isAnalyzingBrand ? 'Researching attire...' : 'Rendering Worker Mascot...'}
                        </p>
                        <span className="text-[10px] text-slate-500">Pure black background (#000000)</span>
                      </div>
                    ) : bugdroidError ? (
                      <div className="p-3 text-center text-xs text-rose-400 space-y-1">
                        <AlertCircle className="w-5 h-5 mx-auto text-rose-500" />
                        <p className="text-[11px]">{bugdroidError}</p>
                        <button
                          type="button"
                          onClick={() => onRedoBugdroid('worker')}
                          className="px-2.5 py-0.5 rounded bg-rose-600 text-white text-[11px] font-bold"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Queued for rendering...</span>
                    )}
                  </div>

                  {/* Download Worker */}
                  {bugdroidMascotUri && (
                    <a
                      href={getMediaUrl(bugdroidMascotUri)}
                      download={`bugdroid_worker_${(displayBrand || 'client').toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`}
                      className="w-full py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Worker Mascot (.png)</span>
                    </a>
                  )}
                </div>

                {/* Bugdroid 2: Keynote Speaker with Google Microphone */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                        <Mic className="w-3 h-3 text-[#4285F4]" />
                        <span>2. Keynote Speaker</span>
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Google Mic &amp; Logo T-Shirt
                      </span>
                    </div>
                    {bugdroidSpeakerUri && (
                      <button
                        type="button"
                        onClick={() => onRedoBugdroid('speaker')}
                        disabled={isGeneratingSpeakerBugdroid}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-500/30 hover:text-blue-600 shadow-sm cursor-pointer disabled:opacity-50"
                        title="Regenerate keynote speaker mascot"
                      >
                        <RefreshCw className={`w-3 h-3 ${isGeneratingSpeakerBugdroid ? 'animate-spin text-blue-500' : ''}`} />
                        <span>Redo</span>
                      </button>
                    )}
                  </div>

                  {/* Image Container */}
                  <div className="bg-black rounded-xl overflow-hidden relative border border-slate-800 flex items-center justify-center p-3 aspect-square group">
                    {bugdroidSpeakerUri ? (
                      <>
                        <img
                          src={getMediaUrl(bugdroidSpeakerUri)}
                          alt="Keynote Speaker Bugdroid Mascot"
                          className="max-h-full max-w-full object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
                        />
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={getMediaUrl(bugdroidSpeakerUri)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors flex items-center"
                            title="View Full Resolution"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </>
                    ) : isGeneratingSpeakerBugdroid || isAnalyzingBrand ? (
                      <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                        <p className="text-xs font-bold text-slate-300">
                          {isAnalyzingBrand ? 'Preparing keynote speaker...' : 'Rendering Keynote Speaker Mascot...'}
                        </p>
                        <span className="text-[10px] text-slate-500">Google-branded microphone • Pure black backing</span>
                      </div>
                    ) : speakerBugdroidError ? (
                      <div className="p-3 text-center text-xs text-rose-400 space-y-1">
                        <AlertCircle className="w-5 h-5 mx-auto text-rose-500" />
                        <p className="text-[11px]">{speakerBugdroidError}</p>
                        <button
                          type="button"
                          onClick={() => onRedoBugdroid('speaker')}
                          className="px-2.5 py-0.5 rounded bg-rose-600 text-white text-[11px] font-bold"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Queued for rendering...</span>
                    )}
                  </div>

                  {/* Download Speaker */}
                  {bugdroidSpeakerUri && (
                    <a
                      href={getMediaUrl(bugdroidSpeakerUri)}
                      download={`bugdroid_speaker_${(displayBrand || 'client').toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`}
                      className="w-full py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Keynote Speaker Mascot (.png)</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DELIVERABLE CARD 3: 2-MINUTE 4K COUNTDOWN VIDEO */}
          {includeCountdownVideo && finalVideoUri && (
            <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/40 dark:border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        3. 2-Minute 4K Countdown Video
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        4K 60FPS
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      10-shot diegetic countdown with embedded soundtrack and Google I/O finale.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4K Video Player */}
              <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-slate-800 flex items-center justify-center">
                <video
                  src={getMediaUrl(finalVideoUri)}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Action Center: Download & YouTube Sharing */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <a
                  href={getMediaUrl(finalVideoUri)}
                  download={`countdown_${(displayBrand || 'director_cut').toLowerCase().replace(/[^a-z0-9]/g, '_')}_2min_4k.mp4`}
                  className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 transition-all transform active:scale-[0.98] cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>Download 4K Director's Cut (.mp4)</span>
                </a>

                {youtubeUrl ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                      title="Watch on YouTube (Unlisted)"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Watch on YouTube</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyYouTube}
                      className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Copy unlisted YouTube link"
                    >
                      {copiedLink ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onUploadToYouTube}
                    disabled={isUploadingYouTube}
                    className="px-5 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingYouTube ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-purple-500 animate-spin" />
                        <span>Uploading to YouTube...</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-rose-500" />
                        <span>Upload to YouTube (Unlisted)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {youtubeUploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{youtubeUploadError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STATE 2: PIPELINE ACTIVE PROGRESS DASHBOARD */}
      {isAnyActive && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fadeIn">
          {/* Top Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {displayBrand && (
                      <span className="text-purple-600 dark:text-purple-400 font-black">
                        {displayBrand}:
                      </span>
                    )}
                    <span>
                      {isAnalyzingBrand
                        ? 'Researching Domain & Discovering Creative Pillars via Gemini 4 Argon'
                        : isVideoPipelineActive
                        ? activePhase === 'prompts'
                          ? 'Analyzing Brand & Scripting Deliverables'
                          : activePhase === 'videos'
                          ? `Synthesizing Video Scenes (${completedVideosCount}/10 Ready)`
                          : activePhase === 'mastering'
                          ? 'Stitching & Mastering 4K Master Cut'
                          : activePhase === 'youtube'
                          ? 'Uploading 4K Cut to YouTube'
                          : 'Generating Customer Deliverables'
                        : isGeneratingWallpaper && (isGeneratingBugdroid || isGeneratingSpeakerBugdroid)
                        ? `Synthesizing ${wallpaperAspectRatio} Wallpaper & Dual Bugdroid Mascots`
                        : isGeneratingWallpaper
                        ? `Synthesizing 4K ${wallpaperAspectRatio} Cinema Wallpaper`
                        : 'Rendering Cute Bugdroid Mascots'}
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Elapsed: <strong className="font-mono">{formatTime(elapsedSeconds)}</strong> • Generating high-fidelity deliverables with Google AI.
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Pipeline (Shown if Video is Included) */}
          {includeCountdownVideo && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Step 1: Brand Concept */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  activePhase === 'prompts'
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500/30'
                    : slots[0]?.startImagePrompt
                    ? 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Phase 1</span>
                  {slots[0]?.startImagePrompt ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : activePhase === 'prompts' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                  ) : null}
                </div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">Brand Intelligence</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">32:9 wallpaper, mascot &amp; video</p>
              </div>

              {/* Step 2: Veo Video Synthesis */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  activePhase === 'videos'
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500/30'
                    : completedVideosCount === 10
                    ? 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Phase 2</span>
                  {completedVideosCount === 10 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : activePhase === 'videos' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                  ) : null}
                </div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  Veo 3.1 Synthesis ({completedVideosCount}/10)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">2 clips in parallel</p>
              </div>

              {/* Step 3: 4K Master Cut */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  activePhase === 'mastering'
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500/30'
                    : extended4kUri
                    ? 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Phase 3</span>
                  {extended4kUri ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : activePhase === 'mastering' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                  ) : null}
                </div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">4K Stitch &amp; Master</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">2-min cut + Google I/O</p>
              </div>

              {/* Step 4: YouTube Upload */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  activePhase === 'youtube'
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-500/30'
                    : youtubeUrl
                    ? 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Phase 4</span>
                  {youtubeUrl ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : activePhase === 'youtube' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                  ) : null}
                </div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">YouTube Unlisted</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {autoUploadYouTube ? 'Auto-uploading...' : 'Optional'}
                </p>
              </div>
            </div>
          )}

          {/* Countdown Scene Pipeline (If Video is active) */}
          {includeCountdownVideo && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Countdown Scene Pipeline (10 down to 1)
              </span>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {slots
                  .slice()
                  .sort((a, b) => b.diegeticNumber - a.diegeticNumber)
                  .map((slot) => {
                    const isDone = Boolean(slot.rawVideoUri || slot.processedVideoUri);
                    const isLoading = slot.isVideoLoading;
                    return (
                      <div
                        key={slot.index}
                        className={`aspect-video rounded-xl border flex flex-col items-center justify-center relative overflow-hidden text-center p-1 transition-all ${
                          isDone
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : isLoading
                            ? 'border-purple-500 bg-purple-500/10 text-purple-600 animate-pulse'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-black">#{slot.diegeticNumber}</span>
                        {isDone ? (
                          <Check className="w-3 h-3 text-emerald-500 mt-0.5" />
                        ) : isLoading ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-purple-500 mt-0.5" />
                        ) : (
                          <Clock className="w-3 h-3 opacity-40 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATE 3: HERO INPUT CARD (WHEN IDLE & NO READY DELIVERABLES) */}
      {!isAnyActive && !hasAnyDeliverableReady && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6 transition-colors">
          {/* Customer URL Input */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Customer Website URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={companyUrl}
                onChange={(e) => onCompanyUrlChange(e.target.value)}
                placeholder="e.g. https://lufthansa.com or wimex-group.com"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 focus:border-purple-500 dark:focus:border-purple-400 text-slate-900 dark:text-white font-bold text-base sm:text-lg outline-none transition-all placeholder:text-slate-400 shadow-inner"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">
              Google Gemini 4 Argon will search-ground the website to extract official branding, company logo, industry domain, and visual styling.
            </p>
          </div>

          {/* DELIVERABLE SELECTION CHECKBOXES */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Choose Deliverables to Generate
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Feature 1: 32:9 Cinema Wallpaper */}
              <label
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  includeCinemaWallpaper
                    ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 shadow-md shadow-purple-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <input
                    type="checkbox"
                    checked={includeCinemaWallpaper}
                    onChange={(e) => onIncludeCinemaWallpaperChange(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 mt-1 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      32:9 Cinema Wallpaper
                    </h4>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-purple-500/15 text-purple-600 dark:text-purple-400">
                      4K Nano Banana 2.1
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Ultra-wide 32:9 panoramic visual tailored to client's industry for our cinema screen.
                  </p>
                </div>
              </label>

              {/* Feature 2: Branded Bugdroid Mascot */}
              <label
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  includeBugdroidMascot
                    ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                    <Bot className="w-5 h-5" />
                  </div>
                  <input
                    type="checkbox"
                    checked={includeBugdroidMascot}
                    onChange={(e) => onIncludeBugdroidMascotChange(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-1 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      Dual Bugdroid Mascots
                    </h4>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                      Worker + Google Mic
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Company Worker attire + Keynote Speaker holding Google-branded microphone on solid black.
                  </p>
                </div>
              </label>

              {/* Feature 3: 2-Minute 4K Countdown Video */}
              <label
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  includeCountdownVideo
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-md shadow-blue-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <Film className="w-5 h-5" />
                  </div>
                  <input
                    type="checkbox"
                    checked={includeCountdownVideo}
                    onChange={(e) => onIncludeCountdownVideoChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mt-1 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      2-Minute 4K Countdown
                    </h4>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400">
                      Veo 3.1 &bull; 60fps
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    10-shot diegetic countdown with soundtrack, Google I/O finale, and YouTube upload.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* YouTube Upload Toggle (Only shown if video is selected) */}
          {includeCountdownVideo && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="express-youtube-toggle"
                checked={autoUploadYouTube}
                onChange={(e) => onAutoUploadYouTubeChange(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
              />
              <label htmlFor="express-youtube-toggle" className="text-xs space-y-0.5 cursor-pointer">
                <span className="font-extrabold text-slate-900 dark:text-white block flex items-center gap-1.5">
                  <span>Auto-upload 4K video as Unlisted to YouTube</span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    youtu.be link
                  </span>
                </span>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  Upon rendering completion, automatically uploads the 4K MP4 to YouTube with Unlisted privacy.
                </span>
              </label>
            </div>
          )}

          {/* Advanced / Optional Context Drawer */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <span>Custom Brand Name &amp; Creative Theme (Optional)</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Customer Brand Name
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => onBrandNameChange(e.target.value)}
                    placeholder="e.g. Lufthansa, Wimex, BMW"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Creative Theme / Atmosphere
                  </label>
                  <input
                    type="text"
                    value={themeContext}
                    onChange={(e) => onThemeContextChange(e.target.value)}
                    placeholder="e.g. Golden hour sunset runway, vast wheat harvest fields, cleanroom engineering"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Primary Call to Action Button */}
          <button
            type="button"
            onClick={onStartAutopilot}
            disabled={!companyUrl.trim() || selectedCount === 0 || isAnalyzingBrand}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 transition-all transform active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAnalyzingBrand ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
                <span>Researching Brand with Gemini 4 Argon...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" />
                <span>
                  {selectedCount === 3
                    ? 'Generate Customer Meeting Package (3 Deliverables)'
                    : selectedCount === 2
                    ? 'Generate Meeting Package (2 Deliverables)'
                    : selectedCount === 1
                    ? `Generate ${includeCinemaWallpaper ? '32:9 Wallpaper' : includeBugdroidMascot ? 'Dual Bugdroid Mascots' : '4K Countdown Video'}`
                    : 'Select At Least 1 Deliverable'}
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
