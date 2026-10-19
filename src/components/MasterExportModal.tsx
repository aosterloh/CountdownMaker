import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Film,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Zap,
  Play,
  Layers,
  ExternalLink,
  HelpCircle,
  Clock,
  Check,
} from 'lucide-react';
import { getMediaUrl } from '../utils/media';
import { UpscaleEngineType } from '../types';

interface MasterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isExporting: boolean;
  isExportingExtended?: boolean;
  masterVideoUri: string | null;
  master720pUri?: string | null;
  master4kUri?: string | null;
  extendedMasterVideoUri?: string | null;
  extended720pUri?: string | null;
  extended4kUri?: string | null;
  totalDuration: number;
  error: string | null;
  onExport: (engine: UpscaleEngineType) => void;
  onExportExtended?: (resolution: '720p' | '4k') => void;
  initialTab?: '30s' | 'extended';
  onOpenStepGuide?: () => void;
}

export const MasterExportModal: React.FC<MasterExportModalProps> = ({
  isOpen,
  onClose,
  isExporting,
  isExportingExtended = false,
  masterVideoUri,
  master720pUri,
  master4kUri,
  extendedMasterVideoUri,
  extended720pUri,
  extended4kUri,
  error,
  onExport,
  onExportExtended,
  initialTab = 'extended',
  onOpenStepGuide,
}) => {
  // 2 Major Decisions State
  const [selectedDuration, setSelectedDuration] = useState<'30s' | '2min'>(
    initialTab === '30s' ? '30s' : '2min'
  );
  const [selectedQuality, setSelectedQuality] = useState<'720p' | '4k'>('4k');
  const [activePreviewType, setActivePreviewType] = useState<'30s-720p' | '30s-4k' | '2m-720p' | '2m-4k'>('2m-4k');
  const [activeExportMode, setActiveExportMode] = useState<'6a' | '6b' | '6c' | '6d' | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (initialTab === 'extended') {
      setSelectedDuration('2min');
    }
  }, [initialTab]);

  // Resolve effective URIs
  const effectiveMaster720p = master720pUri || (masterVideoUri?.includes('720p') ? masterVideoUri : null);
  const effectiveMaster4k = master4kUri || (masterVideoUri?.includes('4k') ? masterVideoUri : null);
  const effectiveExtended720p = extended720pUri || (extendedMasterVideoUri?.includes('720p') ? extendedMasterVideoUri : null);
  const effectiveExtended4k = extended4kUri || (extendedMasterVideoUri?.includes('4k') ? extendedMasterVideoUri : null);

  const isAnyExporting = isExporting || isExportingExtended;

  // Track elapsed time during active export
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAnyExporting) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnyExporting]);

  // When master finishes exporting, automatically switch preview to the newly created master
  useEffect(() => {
    if (effectiveExtended4k && activeExportMode === '6d') {
      setActivePreviewType('2m-4k');
      setSelectedDuration('2min');
      setSelectedQuality('4k');
    } else if (effectiveExtended720p && activeExportMode === '6c') {
      setActivePreviewType('2m-720p');
      setSelectedDuration('2min');
      setSelectedQuality('720p');
    } else if (effectiveMaster4k && activeExportMode === '6b') {
      setActivePreviewType('30s-4k');
      setSelectedDuration('30s');
      setSelectedQuality('4k');
    } else if (effectiveMaster720p && activeExportMode === '6a') {
      setActivePreviewType('30s-720p');
      setSelectedDuration('30s');
      setSelectedQuality('720p');
    }
  }, [effectiveExtended4k, effectiveExtended720p, effectiveMaster4k, effectiveMaster720p, activeExportMode]);

  // Compute realistic estimated total seconds based on Cloud Run benchmarks
  const getExpectedSeconds = () => {
    switch (activeExportMode) {
      case '6a': return 18;  // Direct 30s 720p stream concatenation
      case '6b': return 50;  // 30s 4K Lanczos multi-pass upscaling
      case '6c': return 100; // 2-min 720p crossfade stitch (~1.5 min)
      case '6d': return 350; // 2-min 4K UHD crossfade stitch & upscaling (~5.5 min)
      default: return 30;
    }
  };
  const expectedTotal = getExpectedSeconds();
  const estRemaining = Math.max(1, expectedTotal - elapsedSeconds);

  // Check which versions are currently ready
  const is30s720pReady = Boolean(effectiveMaster720p);
  const is30s4kReady = Boolean(effectiveMaster4k);
  const is2m720pReady = Boolean(effectiveExtended720p);
  const is2m4kReady = Boolean(effectiveExtended4k);

  // Is the current selection ready?
  const isCurrentSelectionReady =
    selectedDuration === '30s'
      ? selectedQuality === '720p'
        ? is30s720pReady
        : is30s4kReady
      : selectedQuality === '720p'
      ? is2m720pReady
      : is2m4kReady;

  // Resolve URI for the currently selected combination
  const currentSelectionUri =
    selectedDuration === '30s'
      ? selectedQuality === '720p'
        ? effectiveMaster720p
        : effectiveMaster4k
      : selectedQuality === '720p'
      ? effectiveExtended720p
      : effectiveExtended4k;

  // Resolve Preview Video URL
  let currentPreviewUri: string | null = null;
  if (activePreviewType === '30s-720p') {
    currentPreviewUri = effectiveMaster720p || masterVideoUri || null;
  } else if (activePreviewType === '30s-4k') {
    currentPreviewUri = effectiveMaster4k || masterVideoUri || null;
  } else if (activePreviewType === '2m-720p') {
    currentPreviewUri = effectiveExtended720p || extendedMasterVideoUri || null;
  } else if (activePreviewType === '2m-4k') {
    currentPreviewUri = effectiveExtended4k || extendedMasterVideoUri || null;
  }
  if (!currentPreviewUri) {
    currentPreviewUri = currentSelectionUri || effectiveExtended4k || effectiveExtended720p || effectiveMaster4k || effectiveMaster720p || null;
  }

  const exportUrl = currentPreviewUri ? getMediaUrl(currentPreviewUri) : '';

  // Trigger Creation Handler for current selection
  const handleCreateSelected = () => {
    if (selectedDuration === '30s') {
      if (selectedQuality === '720p') {
        setActiveExportMode('6a');
        setActivePreviewType('30s-720p');
        onExport('FAST_720P');
      } else {
        setActiveExportMode('6b');
        setActivePreviewType('30s-4k');
        onExport('LANCZOS_4K');
      }
    } else {
      if (selectedQuality === '720p') {
        if (onExportExtended) {
          setActiveExportMode('6c');
          setActivePreviewType('2m-720p');
          onExportExtended('720p');
        }
      } else {
        if (onExportExtended) {
          setActiveExportMode('6d');
          setActivePreviewType('2m-4k');
          onExportExtended('4k');
        }
      }
    }
  };

  // Download filename generator
  const getDownloadFilename = () => {
    if (selectedDuration === '30s') {
      return selectedQuality === '720p' ? 'countdown_30s_final_cut_720p.mp4' : 'countdown_30s_final_cut_4k.mp4';
    } else {
      return selectedQuality === '720p' ? 'countdown_full_video_2min_720p.mp4' : 'countdown_full_video_2min_4k.mp4';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-scaleUp max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-[#4285F4] border border-blue-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  Final Cut &amp; Full Video Export Hub
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Step 6
                </span>
                {onOpenStepGuide && (
                  <button
                    type="button"
                    onClick={onOpenStepGuide}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors cursor-pointer"
                    title="Open Step 6 Guide"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Guide</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Choose your video duration and resolution below to generate your final cut.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Exporting Banner with Dynamic Countdown ETA */}
        {isAnyExporting ? (
          <div className="py-10 px-6 rounded-3xl bg-slate-950 border border-purple-500/40 shadow-2xl flex flex-col items-center justify-center gap-4 text-center animate-pulse">
            <div className="relative">
              <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
              <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <span className="text-base font-extrabold text-white">
                {activeExportMode === '6a' && 'Creating 30s Final Cut (Native 720p)...'}
                {activeExportMode === '6b' && 'Creating 30s Final Cut with 4K Upscaling...'}
                {activeExportMode === '6c' && 'Stitching 30-second countdown with Event Opening Video (720p)...'}
                {activeExportMode === '6d' && 'Stitching & Upscaling 2-Minute Full Video with Event Opening Video (4K UHD)...'}
                {!activeExportMode && 'Rendering Final Cut...'}
              </span>
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-purple-300 bg-purple-950/60 border border-purple-800/80 px-3.5 py-1.5 rounded-xl">
                <span>⏳ Est. time remaining: ~{estRemaining}s</span>
                <span className="text-slate-500">•</span>
                <span>Elapsed: {elapsedSeconds}s</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                Editing scenes together, blending smooth audio transitions, and mastering soundtrack.
              </p>

              {/* Background Processing Notice */}
              <div className="mt-3 p-3 rounded-2xl bg-blue-950/50 border border-blue-800/60 text-left flex items-start gap-2.5">
                <span className="text-sm">☁️</span>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-blue-300 block">
                    Background Processing Active
                  </span>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    This video is rendering safely in the cloud. You can close your browser or laptop; your completed video will be waiting for you in the <strong className="text-white">Projects</strong> menu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Video Player Preview (if any final cut exists) */}
            {currentPreviewUri ? (
              <div className="space-y-2">
                <div className="aspect-video w-full rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl">
                  <video
                    key={exportUrl}
                    src={exportUrl}
                    preload="metadata"
                    playsInline
                    controls
                    controlsList="nodownload"
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Available Outputs Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-b border-slate-800/80 pb-3">
                  <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    Available Renders:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {is30s720pReady && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePreviewType('30s-720p');
                          setSelectedDuration('30s');
                          setSelectedQuality('720p');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                          activePreviewType === '30s-720p'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 ring-1 ring-cyan-500/30'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
                        }`}
                      >
                        <Check className="w-3 h-3 text-cyan-400" />
                        <span>30s Final Cut (720p)</span>
                      </button>
                    )}
                    {is30s4kReady && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePreviewType('30s-4k');
                          setSelectedDuration('30s');
                          setSelectedQuality('4k');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                          activePreviewType === '30s-4k'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 ring-1 ring-purple-500/30'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
                        }`}
                      >
                        <Check className="w-3 h-3 text-purple-400" />
                        <span>30s Final Cut (4K)</span>
                      </button>
                    )}
                    {is2m720pReady && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePreviewType('2m-720p');
                          setSelectedDuration('2min');
                          setSelectedQuality('720p');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                          activePreviewType === '2m-720p'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 ring-1 ring-emerald-500/30'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
                        }`}
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>2-Min Full Video (720p)</span>
                      </button>
                    )}
                    {is2m4kReady && (
                      <button
                        type="button"
                        onClick={() => {
                          setActivePreviewType('2m-4k');
                          setSelectedDuration('2min');
                          setSelectedQuality('4k');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                          activePreviewType === '2m-4k'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/30'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700'
                        }`}
                      >
                        <Check className="w-3 h-3 text-amber-400" />
                        <span>2-Min Full Video (4K)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <p className="font-bold text-slate-200">No final cut generated yet</p>
                <p className="text-[11px]">Choose your duration and quality options below to create your final cut.</p>
              </div>
            )}

            {/* ========================================================================= */}
            {/* DECISION 1: DURATION & CONTENT (With Visual Timeline)                     */}
            {/* ========================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span>
                  <span>Video Format &amp; Duration</span>
                </label>
                <span className="text-[11px] text-slate-400">Select content layout</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Option 1: 30-Second Countdown Only */}
                <button
                  type="button"
                  onClick={() => setSelectedDuration('30s')}
                  className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    selectedDuration === '30s'
                      ? 'bg-slate-900 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                      <span>30s Final Cut (Stand-alone)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      0:30 Total
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                    The 10-to-1 countdown synchronized to the energetic 30-second soundtrack.
                  </p>

                  {/* Visual Timeline for 30s */}
                  <div className="space-y-1">
                    <div className="w-full h-7 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-1 flex items-center justify-between text-[10px] font-bold text-white shadow-inner">
                      <span className="truncate px-1.5 flex items-center gap-1">
                        <Film className="w-3 h-3" />
                        <span>10 Countdown Scenes</span>
                      </span>
                      <span className="px-1.5 font-mono text-[9px] bg-black/30 rounded">30s</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono px-1">
                      <span>0:00</span>
                      <span>0:30</span>
                    </div>
                  </div>
                </button>

                {/* Option 2: 2-Minute Broadcast Opener (Combined with Google I/O) */}
                <button
                  type="button"
                  onClick={() => setSelectedDuration('2min')}
                  className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    selectedDuration === '2min'
                      ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Recommended Title Badge Over Box */}
                  <div className="absolute -top-3 right-4 z-10 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1 border border-white/20">
                    <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                    <span>Recommended</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>2-Min Extended Full Video</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      2:00 Total
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                    Your 30s countdown seamlessly crossfaded into the 90s{' '}
                    <a
                      href="https://www.youtube.com/watch?v=wYSncx9zLIU"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 underline font-semibold inline-flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>Event opening keynote video</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    .
                  </p>

                  {/* Visual Timeline for 2min */}
                  <div className="space-y-1">
                    <div className="w-full h-7 rounded-xl bg-slate-950 border border-slate-800 p-0.5 flex gap-1 items-center">
                      {/* 30s block (25%) */}
                      <div className="w-1/4 h-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white truncate px-1 shadow-inner">
                        <span>30s Countdown</span>
                      </div>
                      {/* Crossfade separator */}
                      <div className="text-[10px] text-emerald-400 font-bold px-0.5">⤹</div>
                      {/* 90s Google I/O block (75%) */}
                      <div className="flex-1 h-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-between text-[9px] font-bold text-white px-2 truncate shadow-inner">
                        <span className="truncate">Event Opening Video</span>
                        <span className="font-mono text-[9px] bg-black/30 px-1 rounded">90s</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono px-1">
                      <span>0:00</span>
                      <span>0:30</span>
                      <span>2:00</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* DECISION 2: QUALITY & SPEED                                              */}
            {/* ========================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">2</span>
                  <span>Resolution &amp; Processing Speed</span>
                </label>
                <span className="text-[11px] text-slate-400">Choose render profile</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* 720p Quick Draft */}
                <button
                  type="button"
                  onClick={() => setSelectedQuality('720p')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedQuality === '720p'
                      ? 'bg-slate-900 border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>⚡ Quick Draft (720p)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {selectedDuration === '30s' ? '~18s Build' : '~1.5 min Build'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ready in seconds. Best for fast preview, checking music sync, and quick review.
                  </p>
                </button>

                {/* 4K Studio Cut */}
                <button
                  type="button"
                  onClick={() => setSelectedQuality('4k')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    selectedQuality === '4k'
                      ? 'bg-slate-900 border-purple-500 ring-2 ring-purple-500/30 shadow-lg'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Recommended Title Badge Over Box */}
                  <div className="absolute -top-3 right-4 z-10 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1 border border-white/20">
                    <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                    <span>Recommended</span>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>🌟 Studio 4K Ultra HD</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {selectedDuration === '30s' ? '~50s Build' : '~5.5 min Build'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ultra-sharp 4K 60fps. Studio sharpness for main-stage keynote screens and large displays.
                  </p>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* ACTION SECTION: SINGLE CLEAR CALL-TO-ACTION                               */}
            {/* ========================================================================= */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              {isCurrentSelectionReady ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-left w-full sm:w-auto">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {selectedDuration === '30s' ? '30s Final Cut' : '2-Min Full Video'} ({selectedQuality === '720p' ? '720p Draft' : '4K UHD'}) is Ready!
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Saved to Cloud Library • Ready for Presentation
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        const targetPreview =
                          selectedDuration === '30s'
                            ? selectedQuality === '720p'
                              ? '30s-720p'
                              : '30s-4k'
                            : selectedQuality === '720p'
                            ? '2m-720p'
                            : '2m-4k';
                        setActivePreviewType(targetPreview);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-blue-400" />
                      <span>Preview</span>
                    </button>

                    <a
                      href={`${getMediaUrl(currentSelectionUri!)}?download=1`}
                      download={getDownloadFilename()}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download MP4</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCreateSelected}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                      title="Re-render this version"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Ready to assemble {selectedDuration === '30s' ? '30-second final cut' : '2-minute full video'} in {selectedQuality === '720p' ? '720p' : '4K UHD'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {selectedQuality === '720p'
                          ? `⚡ Direct encoding (~${selectedDuration === '30s' ? '18s' : '1.5 min'})`
                          : `🌟 High-definition 4K rendering (~${selectedDuration === '30s' ? '50s' : '5.5 min'})`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateSelected}
                      className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer ${
                        selectedQuality === '720p'
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-purple-600/25'
                      }`}
                    >
                      {selectedQuality === '720p' ? (
                        <Zap className="w-4 h-4 fill-current" />
                      ) : (
                        <Sparkles className="w-4 h-4 fill-current" />
                      )}
                      <span>
                        Create {selectedDuration === '30s' ? '30s Final Cut' : '2-Min Full Video'} ({selectedQuality.toUpperCase()})
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Explainer */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-200">Broadcast Quality Standards:</strong> The Google I/O video is preserved in original studio quality without re-compression. Output videos are saved in your cloud library for instant access.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
