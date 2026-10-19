import React, { useState, useEffect, useMemo } from 'react';
import {
  Film,
  Play,
  Download,
  Sparkles,
  Clock,
  CheckCircle2,
  RefreshCw,
  Tv,
  HelpCircle,
  Check,
  Zap,
  AlertTriangle,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { getMediaUrl } from '../utils/media';
import { UpscaleEngineType, RenderMetrics, RenderBenchmarks, CountdownSlot } from '../types';
import { extractTimestampFromUri, getLatestSlotVideoTimestamp } from '../utils/videoTimeline';

export function formatRenderDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

interface FinalCutExportStudioProps {
  slots?: CountdownSlot[];
  masterVideoUri?: string | null;
  master720pUri?: string | null;
  master4kUri?: string | null;
  extendedMasterVideoUri?: string | null;
  extended720pUri?: string | null;
  extended4kUri?: string | null;
  isExporting: boolean;
  isExportingExtended: boolean;
  projectRenderMetrics?: RenderMetrics;
  onExport: (engine?: UpscaleEngineType) => Promise<void>;
  onExportExtended: (resolution?: '720p' | '4k') => Promise<void>;
  onPlayVideo: (uri: string) => void;
  onOpenStepGuide?: () => void;
  youtubeUrl?: string | null;
  isUploadingYouTube?: boolean;
  onUploadToYouTube?: () => void;
}

export const FinalCutExportStudio: React.FC<FinalCutExportStudioProps> = ({
  slots = [],
  masterVideoUri,
  master720pUri,
  master4kUri,
  extendedMasterVideoUri,
  extended720pUri,
  extended4kUri,
  isExporting,
  isExportingExtended,
  projectRenderMetrics,
  onExport,
  onExportExtended,
  onPlayVideo,
  onOpenStepGuide,
  youtubeUrl,
  isUploadingYouTube,
  onUploadToYouTube,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<'30s' | '2min'>('2min');
  const [selectedQuality, setSelectedQuality] = useState<'720p' | '4k'>('4k');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Benchmarks state: loaded from localStorage, updated from server benchmarks endpoint
  const [benchmarks, setBenchmarks] = useState<RenderBenchmarks>(() => {
    try {
      const saved = localStorage.getItem('countdown_render_benchmarks');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      countdown_30s_720p: 18,
      countdown_30s_4k: 48,
      full_2min_720p: 35,
      full_2min_4k: 110,
    };
  });

  // Fetch calibrated benchmarks from Cloud Run / server on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/render-benchmarks')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.benchmarks) {
          setBenchmarks((prev) => {
            const updated = {
              ...prev,
              countdown_30s_720p: data.benchmarks.countdown_30s_720p || prev.countdown_30s_720p,
              countdown_30s_4k: data.benchmarks.countdown_30s_4k || prev.countdown_30s_4k,
              full_2min_720p: data.benchmarks.full_2min_720p || prev.full_2min_720p,
              full_2min_4k: data.benchmarks.full_2min_4k || prev.full_2min_4k,
              lastUpdated: data.benchmarks.lastUpdated,
            };
            try {
              localStorage.setItem('countdown_render_benchmarks', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Check which versions are currently ready
  const is30s720pReady = Boolean(effectiveMaster720p);
  const is30s4kReady = Boolean(effectiveMaster4k);
  const is2m720pReady = Boolean(effectiveExtended720p);
  const is2m4kReady = Boolean(effectiveExtended4k);

  // Staleness detection: compare active scene take timestamps vs rendered master videos
  const latestSceneTakeTimestamp = useMemo(() => getLatestSlotVideoTimestamp(slots), [slots]);
  const master720pTimestamp = useMemo(() => extractTimestampFromUri(effectiveMaster720p), [effectiveMaster720p]);
  const master4kTimestamp = useMemo(() => extractTimestampFromUri(effectiveMaster4k), [effectiveMaster4k]);
  const extended720pTimestamp = useMemo(() => extractTimestampFromUri(effectiveExtended720p), [effectiveExtended720p]);
  const extended4kTimestamp = useMemo(() => extractTimestampFromUri(effectiveExtended4k), [effectiveExtended4k]);

  const isMaster720pOutdated = Boolean(
    is30s720pReady && latestSceneTakeTimestamp > 0 && master720pTimestamp > 0 && latestSceneTakeTimestamp > master720pTimestamp
  );
  const isMaster4kOutdated = Boolean(
    is30s4kReady && latestSceneTakeTimestamp > 0 && master4kTimestamp > 0 && latestSceneTakeTimestamp > master4kTimestamp
  );
  const isExtended720pOutdated = Boolean(
    is2m720pReady && (
      (latestSceneTakeTimestamp > 0 && extended720pTimestamp > 0 && latestSceneTakeTimestamp > extended720pTimestamp) ||
      isMaster720pOutdated
    )
  );
  const isExtended4kOutdated = Boolean(
    is2m4kReady && (
      (latestSceneTakeTimestamp > 0 && extended4kTimestamp > 0 && latestSceneTakeTimestamp > extended4kTimestamp) ||
      isMaster4kOutdated
    )
  );

  const isSelectedCutOutdated =
    selectedDuration === '30s'
      ? selectedQuality === '720p'
        ? isMaster720pOutdated
        : isMaster4kOutdated
      : selectedQuality === '720p'
      ? isExtended720pOutdated
      : isExtended4kOutdated;

  // Realistic estimated total seconds based on calibrated benchmarks and project state
  const getExpectedSeconds = () => {
    if (selectedDuration === '30s') {
      return selectedQuality === '4k' ? benchmarks.countdown_30s_4k : benchmarks.countdown_30s_720p;
    } else {
      // 2-minute full video requires 30s base first if it hasn't been generated yet or is outdated
      const is30sMasterUpToDate = selectedQuality === '4k'
        ? (is30s4kReady && !isMaster4kOutdated)
        : (is30s720pReady && !isMaster720pOutdated);
      const crossfadeTime = selectedQuality === '4k' ? benchmarks.full_2min_4k : benchmarks.full_2min_720p;
      const baseMasterTime = selectedQuality === '4k' ? benchmarks.countdown_30s_4k : benchmarks.countdown_30s_720p;

      return is30sMasterUpToDate ? crossfadeTime : (baseMasterTime + crossfadeTime);
    }
  };
  const expectedTotal = getExpectedSeconds();
  const estRemaining = Math.max(1, expectedTotal - elapsedSeconds);

  // Get measured render duration for current selection (if already rendered in this project)
  const getCurrentMeasuredDuration = (): number | undefined => {
    if (!projectRenderMetrics) return undefined;
    if (selectedDuration === '30s') {
      return selectedQuality === '4k'
        ? projectRenderMetrics.master4kRenderSeconds
        : projectRenderMetrics.master720pRenderSeconds;
    } else {
      return selectedQuality === '4k'
        ? projectRenderMetrics.extended4kRenderSeconds
        : projectRenderMetrics.extended720pRenderSeconds;
    }
  };
  const measuredRenderSeconds = getCurrentMeasuredDuration();

  // Is current selection ready?
  const isCurrentSelectionReady =
    selectedDuration === '30s'
      ? selectedQuality === '720p'
        ? is30s720pReady
        : is30s4kReady
      : selectedQuality === '720p'
      ? is2m720pReady
      : is2m4kReady;

  // Get URI for current selection
  const currentSelectionUri =
    selectedDuration === '30s'
      ? selectedQuality === '720p'
        ? effectiveMaster720p
        : effectiveMaster4k
      : selectedQuality === '720p'
      ? effectiveExtended720p
      : effectiveExtended4k;

  const handleTriggerExport = async () => {
    if (isAnyExporting) return;
    if (selectedDuration === '30s') {
      await onExport(selectedQuality === '4k' ? 'LANCZOS_4K' : 'FAST_720P');
    } else {
      await onExportExtended(selectedQuality);
    }
  };

  const getDownloadFilename = () => {
    if (selectedDuration === '30s') {
      return selectedQuality === '4k'
        ? 'countdown_30s_final_cut_4k.mp4'
        : 'countdown_30s_final_cut_720p.mp4';
    } else {
      return selectedQuality === '4k'
        ? 'countdown_full_video_2min_4k.mp4'
        : 'countdown_full_video_2min_720p.mp4';
    }
  };

  return (
    <div
      id="final-cut-export-studio"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8 transition-colors animate-fadeIn"
    >
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-[#4285F4]">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-[#4285F4] border border-blue-500/20">
                  Step 4 • Assembly &amp; Export Studio
                </span>
                {onOpenStepGuide && (
                  <button
                    type="button"
                    onClick={onOpenStepGuide}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-[#4285F4] transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Guide</span>
                  </button>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Assemble &amp; Export Final Cut
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pl-11">
            Choose your desired duration and quality below. All 10 scenes will be seamlessly rendered into a single continuous broadcast MP4 file.
          </p>
        </div>
      </div>

      {/* Decision 1: Video Format & Duration (2 Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#4285F4] text-white flex items-center justify-center text-[10px] font-mono">
              1
            </span>
            <span>Choose Video Format &amp; Duration</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Card A: 30-Second Countdown (Stand-alone) */}
          <div
            onClick={() => setSelectedDuration('30s')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
              selectedDuration === '30s'
                ? 'border-[#4285F4] bg-blue-50/40 dark:bg-blue-950/20 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedDuration === '30s'
                        ? 'border-[#4285F4] bg-[#4285F4]'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {selectedDuration === '30s' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      30-Second Countdown (Stand-alone)
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Exact 30.00s Duration
                    </span>
                  </div>
                </div>

                {is30s720pReady || is30s4kReady ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{is30s4kReady ? '4K Ready' : '720p Ready'}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Not created yet
                  </span>
                )}
              </div>

              {/* Timeline Graphic for 30s */}
              <div className="space-y-1">
                <div className="h-6 w-full rounded-xl bg-slate-900 overflow-hidden flex text-[10px] font-mono font-bold text-white shadow-inner">
                  <div className="w-[30.7%] bg-cyan-600 flex items-center justify-center px-1" title="Act 1 (10 to 7): 9.2s">
                    10-7
                  </div>
                  <div className="w-[3.3%] bg-rose-500 flex items-center justify-center" title="1.0s Drop Pause">
                    •
                  </div>
                  <div className="w-[66%] bg-indigo-600 flex items-center justify-center px-1" title="Act 2 (6 to 1): 19.8s">
                    Act 2 (6 to 1) • Climax
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>0:00</span>
                  <span>9.2s Drop</span>
                  <span>0:30</span>
                </div>
              </div>

              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span>10 continuous scenes with diegetic numbers (10 down to 1)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span>High-energy synchronized countdown soundtrack</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>1.0-second dramatic silence drop before #6</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Card B: 2-Minute Extended Full Video */}
          <div
            onClick={() => setSelectedDuration('2min')}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
              selectedDuration === '2min'
                ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 shadow-lg shadow-purple-500/10 ring-2 ring-purple-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {/* Recommended Title Badge Over Card */}
            <div className="absolute -top-3 right-5 z-10 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1 border border-white/20">
              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>Recommended</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedDuration === '2min'
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {selectedDuration === '2min' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      2-Minute Extended Full Video
                    </h4>
                    <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                      Countdown + Google I/O AI Film (~2:00)
                    </span>
                  </div>
                </div>

                {is2m720pReady || is2m4kReady ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{is2m4kReady ? '4K Ready' : '720p Ready'}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Not created yet
                  </span>
                )}
              </div>

              {/* Timeline Graphic for 2-Minute (30s Countdown -> 2s Crossfade -> 90s Google I/O Film) */}
              <div className="space-y-1">
                <div className="h-6 w-full rounded-xl bg-slate-900 overflow-hidden flex text-[10px] font-mono font-bold text-white shadow-inner">
                  <div className="w-[23%] bg-[#4285F4] flex items-center justify-center px-1 text-[9px] truncate" title="30s Countdown">
                    30s Cut
                  </div>
                  <div className="w-[2%] bg-amber-400 flex items-center justify-center" title="2.0s Crossfade" />
                  <div className="w-[75%] bg-purple-700 flex items-center justify-center px-2 truncate" title="Google I/O 2026 Inspirational AI Film (90s)">
                    Google I/O 2026 AI Film (1:30)
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>0:00 (30s Countdown)</span>
                  <span>0:28 (2s Crossfade)</span>
                  <span>~2:00 (Google I/O)</span>
                </div>
              </div>

              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span>Starts with your 30s custom diegetic countdown</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Smooth 2-second crossfade at 0:28 (audio &amp; video)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span>Transitions into the 90s Google I/O 2026 inspirational AI film</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Decision 2: Resolution & Processing Speed (2 Options) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#4285F4] text-white flex items-center justify-center text-[10px] font-mono">
              2
            </span>
            <span>Choose Resolution &amp; Processing Speed</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Option 2A: Standard 720p (Fast) */}
          <div
            onClick={() => setSelectedQuality('720p')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
              selectedQuality === '720p'
                ? 'border-[#4285F4] bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                selectedQuality === '720p'
                  ? 'border-[#4285F4] bg-[#4285F4]'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {selectedQuality === '720p' && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Standard Preview (720p Fast)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-[#4285F4] border border-blue-500/20">
                  ~{formatRenderDuration(selectedDuration === '30s' ? benchmarks.countdown_30s_720p : ((is30s720pReady ? 0 : benchmarks.countdown_30s_720p) + benchmarks.full_2min_720p))}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rapid stream synthesis. Best for immediate testing, team review, and web playback.
              </p>
            </div>
          </div>

          {/* Option 2B: Studio 4K Ultra HD */}
          <div
            onClick={() => setSelectedQuality('4k')}
            className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
              selectedQuality === '4k'
                ? 'border-[#4285F4] bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {/* Recommended Title Badge Over Card */}
            <div className="absolute -top-3 right-5 z-10 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1 border border-white/20">
              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>Recommended</span>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                selectedQuality === '4k'
                  ? 'border-[#4285F4] bg-[#4285F4]'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {selectedQuality === '4k' && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Studio 4K Ultra HD (60fps)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  ~{formatRenderDuration(selectedDuration === '30s' ? benchmarks.countdown_30s_4k : ((is30s4kReady ? 0 : benchmarks.countdown_30s_4k) + benchmarks.full_2min_4k))}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-pass Lanczos upscaling. Best for live keynote stage projection and high-res event displays.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Center: Dynamic State based on whether selection is Ready or Needs Generation */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-4">
        {isAnyExporting ? (
          /* State 1: Actively Exporting in Background */
          <div className="space-y-3 py-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <RefreshCw className="w-4 h-4 text-[#4285F4] animate-spin" />
                <span>
                  {selectedDuration === '2min' && isExporting
                    ? `Step 1/2: Updating 30s base countdown with new takes (${selectedQuality.toUpperCase()})...`
                    : selectedDuration === '2min' && isExportingExtended
                    ? `Step 2/2: Crossfading with Google I/O outro (${selectedQuality.toUpperCase()})...`
                    : `Rendering ${selectedDuration === '30s' ? '30s Final Cut' : '2-Min Extended Full Video'} (${selectedQuality.toUpperCase()})...`}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Elapsed: {elapsedSeconds}s</span>
                </span>
                <span>•</span>
                <span>Est. remaining: ~{formatRenderDuration(estRemaining)}</span>
              </div>
            </div>

            {/* Glowing progress bar */}
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.min(96, Math.max(10, (elapsedSeconds / expectedTotal) * 100))}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              {selectedDuration === '2min' && isExporting
                ? 'Step 1 of 2: Assembling and syncing the 30-second countdown with your latest scene takes...'
                : selectedDuration === '2min' && isExportingExtended
                ? 'Step 2 of 2: Crossfading with Google I/O 2026 inspirational AI outro film...'
                : 'FFmpeg is concatenating clips, mixing the soundtrack, and applying transitions. You can keep this tab open or work on other tabs.'}
            </p>
          </div>
        ) : isCurrentSelectionReady && currentSelectionUri ? (
          /* State 2: Selected Video IS Ready to Play & Download */
          <div className="flex flex-col gap-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-2">
                  {isSelectedCutOutdated ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {selectedDuration === '30s' ? '30-Second Final Cut' : '2-Minute Extended Full Video'} is Ready!
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    isSelectedCutOutdated
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}>
                    {selectedQuality.toUpperCase()} {isSelectedCutOutdated ? 'Outdated' : 'Ready'}
                  </span>
                  {Boolean(measuredRenderSeconds) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-[#4285F4] border border-blue-500/20 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Rendered in {formatRenderDuration(measuredRenderSeconds!)}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Play the full video in the preview theater or download the complete MP4 file directly.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onPlayVideo(currentSelectionUri)}
                  className="px-5 py-2.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Play Video</span>
                </button>

                <a
                  href={`${getMediaUrl(currentSelectionUri)}?download=1`}
                  download={getDownloadFilename()}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="Download full video file"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MP4</span>
                </a>

                {youtubeUrl ? (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    title="Watch on YouTube (Unlisted)"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch on YouTube</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : onUploadToYouTube ? (
                  <button
                    type="button"
                    onClick={onUploadToYouTube}
                    disabled={isUploadingYouTube}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Auto-upload this cut to YouTube as Unlisted"
                  >
                    {isUploadingYouTube ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Upload to YouTube (Unlisted)</span>
                      </>
                    )}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={handleTriggerExport}
                  className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelectedCutOutdated
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                  title={isSelectedCutOutdated ? 'Re-render this cut with latest scene takes' : 'Re-render this version'}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isSelectedCutOutdated ? 'Re-render with New Takes' : 'Re-render'}</span>
                </button>
              </div>
            </div>

            {isSelectedCutOutdated && (
              <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>
                  <strong>Scene takes updated:</strong> 1 or more scene clips were regenerated after this cut was exported. Click <strong>Re-render with New Takes</strong> to produce a fresh master with your latest clips.
                </span>
              </div>
            )}
          </div>
        ) : (
          /* State 3: Selected Video has NOT been generated yet */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Ready to Assemble {selectedDuration === '30s' ? '30-Second Final Cut' : '2-Minute Full Video'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click below to start video rendering ({selectedQuality === '4k' ? 'Studio 4K Ultra HD' : 'Standard 720p'}).
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleTriggerExport}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-98 text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Film className="w-4 h-4" />
                <span>
                  Create {selectedDuration === '30s' ? '30s Final Cut' : '2-Minute Full Video'} ({selectedQuality.toUpperCase()})
                </span>
              </button>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <Clock className="w-3 h-3 text-[#4285F4]" />
                <span>
                  Realistic ETA: ~{formatRenderDuration(expectedTotal)}
                  {selectedDuration === '2min' && !(selectedQuality === '4k' ? is30s4kReady : is30s720pReady)
                    ? ' (base master + crossfade)'
                    : ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Switcher for other already-generated formats (if any exist) */}
      {(is30s720pReady || is30s4kReady || is2m720pReady || is2m4kReady) && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400">
            Available Renders in Project:
          </span>

          {is30s720pReady && effectiveMaster720p && (
            <button
              type="button"
              onClick={() => {
                setSelectedDuration('30s');
                setSelectedQuality('720p');
              }}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                selectedDuration === '30s' && selectedQuality === '720p'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {isMaster720pOutdated ? (
                <AlertTriangle className="w-3 h-3 text-amber-400" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              <span>30s Final Cut (720p)</span>
              {isMaster720pOutdated && (
                <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-500">
                  Outdated
                </span>
              )}
            </button>
          )}

          {is30s4kReady && effectiveMaster4k && (
            <button
              type="button"
              onClick={() => {
                setSelectedDuration('30s');
                setSelectedQuality('4k');
              }}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                selectedDuration === '30s' && selectedQuality === '4k'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {isMaster4kOutdated ? (
                <AlertTriangle className="w-3 h-3 text-amber-400" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              <span>30s Final Cut (4K)</span>
              {isMaster4kOutdated && (
                <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-500">
                  Outdated
                </span>
              )}
            </button>
          )}

          {is2m720pReady && effectiveExtended720p && (
            <button
              type="button"
              onClick={() => {
                setSelectedDuration('2min');
                setSelectedQuality('720p');
              }}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                selectedDuration === '2min' && selectedQuality === '720p'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {isExtended720pOutdated ? (
                <AlertTriangle className="w-3 h-3 text-amber-400" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              <span>2-Min Full Video (720p)</span>
              {isExtended720pOutdated && (
                <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-500">
                  Outdated
                </span>
              )}
            </button>
          )}

          {is2m4kReady && effectiveExtended4k && (
            <button
              type="button"
              onClick={() => {
                setSelectedDuration('2min');
                setSelectedQuality('4k');
              }}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                selectedDuration === '2min' && selectedQuality === '4k'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {isExtended4kOutdated ? (
                <AlertTriangle className="w-3 h-3 text-amber-400" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              <span>2-Min Full Video (4K)</span>
              {isExtended4kOutdated && (
                <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-500">
                  Outdated
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
