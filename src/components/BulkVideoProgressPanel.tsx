import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Play,
  CheckCircle2,
  Zap,
  Clock,
  Activity,
  ArrowRight,
  AlertCircle,
  X,
  Info,
} from 'lucide-react';
import { CountdownSlot, VeoQueueStatus } from '../types';
import { getMediaUrl } from '../utils/media';

interface BulkVideoProgressPanelProps {
  slots: CountdownSlot[];
  veoQueueStatus: VeoQueueStatus;
  isBatchGenerating: boolean;
  onSelectSlot: (slotIndex: number) => void;
  onPlayVideo: (videoUri: string) => void;
  onProceedToPreview: () => void;
  onRetrySlot: (slotIndex: number) => void;
  onRetryAllFailed?: () => void;
  onRegenerateAll?: () => void;
  onOpenStepGuide?: () => void;
  currentJobId?: string | null;
  brandName?: string;
}

export const BulkVideoProgressPanel: React.FC<BulkVideoProgressPanelProps> = ({
  slots,
  veoQueueStatus,
  isBatchGenerating,
  onSelectSlot,
  onPlayVideo,
  onProceedToPreview,
  onRetrySlot,
  onRetryAllFailed,
  onRegenerateAll,
  onOpenStepGuide,
  currentJobId,
  brandName,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedError, setSelectedError] = useState<{ slotNum: number; error: string } | null>(null);

  const otherUsersWaitingCount = currentJobId
    ? veoQueueStatus.queue.filter((q) => q.jobId && q.jobId !== currentJobId).length +
      veoQueueStatus.activeWorkers.filter((w) => w.jobId && w.jobId !== currentJobId).length
    : 0;

  const completedCount = slots.filter((s) => Boolean(s.rawVideoUri || s.processedVideoUri)).length;
  const failedCount = slots.filter((s) => Boolean(s.videoError) && !s.rawVideoUri && !s.processedVideoUri).length;
  const remainingCount = Math.max(0, 10 - completedCount);
  const percent = Math.round((completedCount / 10) * 100);

  const isAnyLoading = slots.some((s) => s.isVideoLoading) || isBatchGenerating || veoQueueStatus.activeCount > 0;

  // Track elapsed timer while batch is running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAnyLoading) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnyLoading]);

  // Calculate estimated time remaining
  const avgDuration = veoQueueStatus.avgVideoDurationSeconds || 35;
  const estimatedBatches = Math.ceil(remainingCount / 2);
  const calculatedRemainingSeconds = veoQueueStatus.estimatedRemainingSeconds
    ? veoQueueStatus.estimatedRemainingSeconds
    : estimatedBatches * avgDuration;

  const formatTime = (secs: number) => {
    if (secs <= 0) return 'Few seconds';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const sortedSlots = [...slots].sort((a, b) => b.diegeticNumber - a.diegeticNumber);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 transition-colors animate-fadeIn">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Step 2: Creating Your 10 Countdown Scenes
              </h2>
              {brandName && (
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 shadow-sm">
                  {brandName}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                2 scenes at a time
              </span>
              {onOpenStepGuide && (
                <button
                  type="button"
                  onClick={onOpenStepGuide}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-colors cursor-pointer"
                  title="Open Step 2 Guide"
                >
                  <Info className="w-3 h-3" />
                  <span>Guide</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generating scenes 10 down to 1 with custom countdown numbers.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-3">
          {failedCount > 0 && onRetryAllFailed && (
            <button
              type="button"
              onClick={onRetryAllFailed}
              disabled={isAnyLoading}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
              <span>Retry All {failedCount} Failed Scenes</span>
            </button>
          )}

          {onRegenerateAll && completedCount > 0 && (
            <button
              type="button"
              onClick={onRegenerateAll}
              disabled={isAnyLoading}
              className="px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              title="Regenerate all 10 scenes from current prompts and invalidate previous final cuts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnyLoading ? 'animate-spin' : ''}`} />
              <span>Regenerate All 10</span>
            </button>
          )}

          <button
            type="button"
            onClick={onProceedToPreview}
            disabled={completedCount === 0}
            className={`px-6 py-3 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
              completedCount === 10
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                : completedCount > 0
                ? 'bg-gradient-to-r from-[#4285F4] to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>
              {completedCount === 10
                ? 'All 10 Ready • Go to 30s Preview (Step 4)'
                : `Preview Ready Clips (${completedCount}/10)`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prominent Global Notice if Any Shot Failed */}
      {failedCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-900 dark:text-rose-100">
                {failedCount} of 10 clips encountered a generation issue
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                Click the red alert icon on any card to see the exact server message, or click <strong>&quot;Retry All Failed Clips&quot;</strong> to restart synthesis with Veo 3.1 Fast.
              </p>
            </div>
          </div>
          {onRetryAllFailed && (
            <button
              type="button"
              onClick={onRetryAllFailed}
              disabled={isAnyLoading}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-md transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnyLoading ? 'animate-spin' : ''}`} />
              <span>Retry All Failed</span>
            </button>
          )}
        </div>
      )}

      {/* Progress & Live Countdown ETA Banner */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500 animate-pulse" />
              <span>Synthesis Progress: {completedCount}/10 Clips Ready ({percent}%)</span>
            </span>
          </div>

          {/* Dynamic ETA display */}
          <div className="flex items-center gap-2.5 text-xs font-mono">
            {remainingCount > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800/80 font-bold">
                <Clock className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                <span>⏳ Est. time remaining: ~{formatTime(calculatedRemainingSeconds)}</span>
                <span className="text-purple-400 dark:text-purple-600">•</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">Elapsed: {formatTime(elapsedSeconds)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>All 10 Scenes Ready! (Total Time: {formatTime(elapsedSeconds)})</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-full rounded-full transition-all duration-700 shadow-sm"
            style={{ width: `${Math.max(5, percent)}%` }}
          />
        </div>

        {/* Active Scene Rendering Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-700 dark:text-slate-300">Active Rendering:</span>
            <div className="flex items-center gap-2 font-medium text-[11px]">
              {veoQueueStatus.activeWorkers.length > 0 ? (
                veoQueueStatus.activeWorkers.map((w, idx) => (
                  <span
                    key={w.taskId || idx}
                    className="px-3 py-1 rounded-xl bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30 flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    <span>Scene #{w.slotIndex}</span>
                  </span>
                ))
              ) : (
                <span className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  Standby
                </span>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {veoQueueStatus.queueLength > 0 ? (
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                ⏳ {veoQueueStatus.queueLength} {veoQueueStatus.queueLength === 1 ? 'scene' : 'scenes'} waiting
              </span>
            ) : (
              <span>All scenes assigned</span>
            )}
          </div>
        </div>
      </div>

      {/* High Traffic Multi-User Notice Banner */}
      {otherUsersWaitingCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-amber-800 dark:text-amber-200 animate-fadeIn">
          <span className="text-xl">⏳</span>
          <div className="space-y-1 text-xs flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                High Traffic: Other Projects in Queue
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-200 border border-amber-500/30">
                {otherUsersWaitingCount} other {otherUsersWaitingCount === 1 ? 'scene' : 'scenes'} ahead
              </span>
            </div>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
              Another countdown project is currently rendering ahead of yours ({otherUsersWaitingCount} scenes ahead).
              Please <strong>keep this browser tab open</strong> — your scenes will begin automatically as soon as the queue clears!
              A chime and notification will alert you when they are ready.
            </p>
          </div>
        </div>
      )}

      {/* Grid of 10 Shots (10 down to 1) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            10 Countdown Scenes
          </label>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Click any ready scene to preview • Click ⚠️ for details
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {sortedSlots.map((slot) => {
            const hasVideo = Boolean(slot.rawVideoUri || slot.processedVideoUri);
            const isSlotLoading = slot.isVideoLoading;
            const hasError = Boolean(slot.videoError) && !hasVideo;
            const activeWorker = veoQueueStatus.activeWorkers.find(
              (w) => w.slotIndex === slot.diegeticNumber
            );

            return (
              <div
                key={slot.index}
                className={`relative rounded-2xl p-3 border transition-all flex flex-col justify-between min-h-[150px] ${
                  hasVideo
                    ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500 shadow-sm'
                    : isSlotLoading
                    ? 'bg-purple-500/10 dark:bg-purple-950/30 border-purple-500/50 shadow-md shadow-purple-500/10 animate-pulse'
                    : hasError
                    ? 'bg-rose-500/10 dark:bg-rose-950/30 border-rose-500/50 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Top Badge: Shot Number + Status Icon */}
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black flex items-center justify-center font-mono shadow-sm">
                    #{slot.diegeticNumber}
                  </span>

                  {hasVideo ? (
                    <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" title="Scene ready">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  ) : isSlotLoading ? (
                    <span title="Generating...">
                      <RefreshCw className="w-4 h-4 text-purple-500 animate-spin" />
                    </span>
                  ) : hasError ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedError({
                          slotNum: slot.diegeticNumber,
                          error: slot.videoError || 'An issue occurred while generating this scene.',
                        })
                      }
                      className="p-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 transition-colors"
                      title="Click to view details"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">In queue</span>
                  )}
                </div>

                {/* Concept Snippet */}
                <div className="my-2">
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                    {slot.sceneConcept || `Scene #${slot.diegeticNumber}`}
                  </p>
                </div>

                {/* Bottom Action / Status */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  {hasVideo ? (
                    <button
                      type="button"
                      onClick={() => onPlayVideo(slot.processedVideoUri || slot.rawVideoUri!)}
                      className="w-full py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Play Preview</span>
                    </button>
                  ) : isSlotLoading ? (
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <span>Rendering...</span>
                    </span>
                  ) : hasError ? (
                    <button
                      type="button"
                      onClick={() => onRetrySlot(slot.index)}
                      className="w-full py-1.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-sm"
                      title={`Retry Scene #${slot.diegeticNumber}`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry #{slot.diegeticNumber}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      In queue
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Scene #{selectedError.slotNum} Details
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 font-mono text-xs text-rose-800 dark:text-rose-200 break-words leading-relaxed">
              {selectedError.error}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const targetSlot = slots.find((s) => s.diegeticNumber === selectedError.slotNum);
                  if (targetSlot) {
                    onRetrySlot(targetSlot.index);
                  }
                  setSelectedError(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Scene #{selectedError.slotNum} Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
