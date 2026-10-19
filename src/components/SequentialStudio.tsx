import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Play,
  CheckCircle2,
  ChevronRight,
  Video,
  Film,
  Zap,
  Crown,
  AlertCircle,
  Eye,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  Globe,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { CountdownSlot, VideoQualityMode, VeoModelType, VeoQueueStatus, GroundingMetadata } from '../types';
import { getMediaUrl } from '../utils/media';
import { VeoInspectorPanel } from './VeoInspectorPanel';

interface SequentialStudioProps {
  slots: CountdownSlot[];
  activeSlotIndex: number;
  brandName: string;
  themeContext: string;
  selectedVideoQuality: VideoQualityMode;
  selectedVeoModel?: VeoModelType;
  onChangeVeoModel?: (model: VeoModelType) => void;
  onSelectSlot: (slotIndex: number) => void;
  onUpdatePrompt?: (slotIndex: number, newPrompt: string, concept?: string, videoPrompt?: string, endPrompt?: string) => void;
  onUpdateEndPrompt?: (slotIndex: number, newEndPrompt: string) => void;
  onUpdateVideoPrompt: (slotIndex: number, newVideoPrompt: string) => void;
  onRecreatePrompt: (slotIndex: number, customVisualIdea?: string) => void;
  onGenerateKeyframes?: (slotIndex: number) => void;
  onRedoStartImage?: (slotIndex: number) => void;
  onRedoEndImage?: (slotIndex: number) => void;
  onGenerateVideo: (slotIndex: number, quality: VideoQualityMode) => void;
  onPlayVideo: (videoUri: string) => void;
  onPreviewStitchedCountdown: () => void;
  isStitchingMaster?: boolean;
  onProceedToNextShot: () => void;
  veoQueueStatus?: VeoQueueStatus;
  onRefinePromptWithComment?: (slotIndex: number, comment: string) => Promise<any>;
  onRedoPromptFromScratch?: (slotIndex: number) => void;
  groundingMetadata?: GroundingMetadata | null;
  geminiModelUsed?: string;
  onGenerateAllVideos?: (quality: VideoQualityMode) => void;
  isBatchGeneratingVideos?: boolean;
  onAnalyzeVideo?: (slotIndex: number) => void;
  onApplyPromptFixAndRegenerate?: (slotIndex: number, fixPrompt: string) => void;
  showBulkVideoOption?: boolean;
}

function formatGeminiModelName(rawModel?: string): string {
  if (!rawModel) return 'Gemini 3.8 Flash';
  if (rawModel.includes('3.8')) return 'Gemini 3.8 Flash';
  if (rawModel.includes('3.7')) return 'Gemini 3.7 Flash (Fallback)';
  if (rawModel.includes('2.5')) return 'Gemini 2.5 Flash (Fallback)';
  return rawModel;
}

function formatVeoModelName(rawModel?: string): string {
  if (!rawModel) return 'Veo 3.1 Fast';
  if (rawModel.includes('3.1-fast')) return 'Veo 3.1 Fast';
  if (rawModel.includes('3.1-generate')) return 'Veo 3.1 Standard';
  if (rawModel.includes('3.0-fast')) return 'Veo 3.0 Fast';
  if (rawModel.includes('2.0')) return 'Veo 2.0 GA';
  return rawModel;
}

function formatEstimatedTime(seconds: number): string {
  if (seconds <= 0) return 'Few seconds';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export const SequentialStudio: React.FC<SequentialStudioProps> = ({
  slots,
  activeSlotIndex,
  brandName,
  themeContext,
  selectedVideoQuality,
  selectedVeoModel = 'veo-3.1-fast-generate-preview',
  onChangeVeoModel,
  onSelectSlot,
  onUpdatePrompt,
  onUpdateEndPrompt,
  onUpdateVideoPrompt,
  onRecreatePrompt,
  onGenerateKeyframes,
  onRedoStartImage,
  onRedoEndImage,
  onGenerateVideo,
  onPlayVideo,
  onPreviewStitchedCountdown,
  isStitchingMaster = false,
  onProceedToNextShot,
  veoQueueStatus,
  onRefinePromptWithComment,
  onRedoPromptFromScratch,
  groundingMetadata,
  geminiModelUsed = 'Gemini 3.8 Flash',
  onGenerateAllVideos,
  isBatchGeneratingVideos = false,
  onAnalyzeVideo,
  onApplyPromptFixAndRegenerate,
  showBulkVideoOption = false,
}) => {
  const displayModel = formatGeminiModelName(geminiModelUsed);
  const [isPromptsExpanded, setIsPromptsExpanded] = useState(true);
  const [customIdeaInput, setCustomIdeaInput] = useState<Record<number, string>>({});
  const [fixCommentInput, setFixCommentInput] = useState<Record<number, string>>({});
  const [isRefiningPrompt, setIsRefiningPrompt] = useState(false);
  const [refineSuccessNotice, setRefineSuccessNotice] = useState<string | null>(null);

  const activeSlot = slots.find((s) => s.diegeticNumber === activeSlotIndex) || slots[0];
  const videosCompletedCount = slots.filter((s) => Boolean(s.rawVideoUri || s.processedVideoUri)).length;
  const remainingVideosCount = Math.max(0, 10 - videosCompletedCount);

  const hasVideo = Boolean(activeSlot?.rawVideoUri || activeSlot?.processedVideoUri);
  const isVideoLoading = Boolean(activeSlot?.isVideoLoading);
  const isPromptRecreating = Boolean(activeSlot?.isPromptRecreating);

  const hasAnyVideoLoading = slots.some((s) => s.isVideoLoading);
  const isSlotBusy = isVideoLoading || isPromptRecreating;

  const slot10 = slots.find((s) => s.diegeticNumber === 10 || s.index === 10);
  const isSlot10VideoReady = Boolean(slot10?.rawVideoUri || slot10?.processedVideoUri);
  const isSlot10Loading = Boolean(slot10?.isVideoLoading);

  const canProceed = hasVideo || Boolean(activeSlot?.videoPrompt);
  const isLastShot = activeSlotIndex === 1;

  const currentCustomIdea = customIdeaInput[activeSlot.diegeticNumber] || '';

  const activeWorkerForSlot = veoQueueStatus?.activeWorkers.find(
    (w) => w.slotIndex === activeSlot.diegeticNumber
  );
  const queueItemForSlot = veoQueueStatus?.queue.find(
    (q) => q.slotIndex === activeSlot.diegeticNumber
  );

  const videoPromptText =
    activeSlot?.videoPrompt ||
    `[0.0s-2.5s]: Dynamic wide cinematic camera tracking shot establishing ${activeSlot?.sceneConcept || themeContext || 'engineering facility'} for ${brandName || 'brand'}, focusing solely on moving machinery and ambient cinematic lighting. [2.5s-4.0s]: Camera rapidly zooms and macro-locks onto the center of ${activeSlot?.objectEmbedding || 'carrier surface'}, revealing the bold high-contrast physical numeral '${activeSlot?.diegeticNumber}' laser-etched in glowing amber luminescence against a dark matte finish occupying the center of the frame in razor-sharp focus during the final second. Essential requirement: the physical numeral '${activeSlot?.diegeticNumber}' must be clearly visible, centered, and unmistakably rendered in frame. Cinematography: 35mm anamorphic lens, macro depth of field, volumetric rim lighting, 8k photorealistic textures, 60fps.`;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fadeIn">
      {/* Live 2-Worker Veo Queue Status Banner */}
      {Boolean(veoQueueStatus && (veoQueueStatus.activeCount > 0 || veoQueueStatus.queueLength > 0)) && (
        <div className="bg-slate-900/90 text-white rounded-3xl p-4 px-5 flex flex-wrap items-center justify-between gap-3 border border-slate-700/60 shadow-xl text-xs backdrop-blur-md animate-fadeIn">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>Parallel Workers ({veoQueueStatus?.activeCount || 0}/2 Active):</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-xl font-mono text-[11px] flex items-center gap-1.5 ${
                  veoQueueStatus?.activeWorkers.some((w) => w.workerId === 1)
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${veoQueueStatus?.activeWorkers.some((w) => w.workerId === 1) ? 'bg-blue-400 animate-ping' : 'bg-slate-600'}`} />
                Worker 1: {veoQueueStatus?.activeWorkers.find((w) => w.workerId === 1)?.slotIndex ? `Shot #${veoQueueStatus?.activeWorkers.find((w) => w.workerId === 1)?.slotIndex}` : 'Idle'}
              </span>
              <span
                className={`px-3 py-1 rounded-xl font-mono text-[11px] flex items-center gap-1.5 ${
                  veoQueueStatus?.activeWorkers.some((w) => w.workerId === 2)
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${veoQueueStatus?.activeWorkers.some((w) => w.workerId === 2) ? 'bg-purple-400 animate-ping' : 'bg-slate-600'}`} />
                Worker 2: {veoQueueStatus?.activeWorkers.find((w) => w.workerId === 2)?.slotIndex ? `Shot #${veoQueueStatus?.activeWorkers.find((w) => w.workerId === 2)?.slotIndex}` : 'Idle'}
              </span>
            </div>
          </div>
          {(veoQueueStatus?.queueLength || 0) > 0 && (
            <div className="flex items-center gap-2 font-semibold text-amber-300 bg-amber-950/60 px-3.5 py-1.5 rounded-xl border border-amber-800/60 shadow-sm">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>{veoQueueStatus?.queueLength} in waiting queue</span>
            </div>
          )}
        </div>
      )}

      {/* 1. Countdown Stepper Navigation (10 down to 1) */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-900/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4285F4] dark:text-blue-400">
              Veo 3.1 Sequential Studio
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Shot #{activeSlot?.diegeticNumber}</span>
              <span className="text-slate-400 text-sm font-normal">
                ({activeSlot?.sceneConcept || `${brandName} countdown scene`})
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              🎬 {videosCompletedCount}/10 Videos Ready
            </span>

            {/* Bulk Video Create Action (Smart Missing Videos Fill-In) */}
            {showBulkVideoOption && onGenerateAllVideos && (
              <button
                type="button"
                onClick={() => onGenerateAllVideos(selectedVideoQuality)}
                disabled={isBatchGeneratingVideos || remainingVideosCount === 0}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-md ${
                  isBatchGeneratingVideos
                    ? 'bg-purple-600 text-white animate-pulse shadow-purple-500/25 cursor-wait'
                    : remainingVideosCount === 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-500/20 active:scale-95'
                }`}
                title={
                  remainingVideosCount === 0
                    ? 'All 10 videos have been synthesized'
                    : `Synthesize the ${remainingVideosCount} remaining missing video clips in bulk using Veo 3.1 Fast`
                }
              >
                {isBatchGeneratingVideos ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 fill-current" />
                )}
                <span>
                  {isBatchGeneratingVideos
                    ? `Generating Remaining (${videosCompletedCount}/10)...`
                    : remainingVideosCount === 0
                    ? 'All 10 Videos Created'
                    : remainingVideosCount === 10
                    ? '⚡ Bulk Create 10 Videos'
                    : `⚡ Bulk Create ${remainingVideosCount} Remaining`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onPreviewStitchedCountdown}
              disabled={videosCompletedCount === 0 || isStitchingMaster}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                videosCompletedCount > 0
                  ? 'bg-gradient-to-r from-[#4285F4] to-[#34A853] hover:opacity-90 text-white shadow-blue-500/20 active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isStitchingMaster ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Preview Stitched Countdown ({videosCompletedCount}/10)</span>
            </button>
          </div>
        </div>

        {/* Google Search Grounding Sources Badge */}
        {Boolean(groundingMetadata?.sources && groundingMetadata.sources.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5 pb-1 border-b border-slate-100 dark:border-slate-800/80 text-[11px] animate-fadeIn">
            <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <Globe className="w-3 h-3" />
              <span>Grounded via Google Search:</span>
            </span>
            {groundingMetadata?.sources?.slice(0, 3).map((s, idx) => (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
                title={s.title}
              >
                <span>{s.title.length > 28 ? `${s.title.substring(0, 28)}...` : s.title}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            ))}
          </div>
        )}

        {/* Stepper Pills */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-3">
          {slots
            .slice()
            .sort((a, b) => b.diegeticNumber - a.diegeticNumber)
            .map((slot) => {
              const isSelected = slot.diegeticNumber === activeSlotIndex;
              const hasSlotVideo = Boolean(slot.rawVideoUri || slot.processedVideoUri);
              const isSlotBusy =
                Boolean(slot.isVideoLoading) ||
                Boolean(veoQueueStatus?.activeWorkers.some((w) => w.slotIndex === slot.diegeticNumber)) ||
                Boolean(veoQueueStatus?.queue.some((q) => q.slotIndex === slot.diegeticNumber));
              const hasSlotPrompt = Boolean(slot.videoPrompt && !slot.videoPrompt.startsWith('Pending'));

              return (
                <button
                  key={slot.diegeticNumber}
                  type="button"
                  onClick={() => onSelectSlot(slot.diegeticNumber)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all border relative group ${
                    isSelected
                      ? 'bg-blue-500/10 dark:bg-blue-500/20 border-[#4285F4] text-[#4285F4] dark:text-blue-400 shadow-md ring-2 ring-blue-500/20'
                      : isSlotBusy
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 animate-pulse'
                      : hasSlotVideo
                      ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                      : hasSlotPrompt
                      ? 'bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/15'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-black">#{slot.diegeticNumber}</span>
                  <span className="text-[10px] mt-1 flex items-center justify-center">
                    {isSlotBusy ? (
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    ) : hasSlotVideo ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : hasSlotPrompt ? (
                      <FileText className="w-3 h-3 text-purple-500 dark:text-purple-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                    )}
                  </span>
                  <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter opacity-80">
                    {isSlotBusy ? 'Active' : hasSlotVideo ? 'Video' : hasSlotPrompt ? 'Prompt' : 'Draft'}
                  </span>
                </button>
              );
            })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 mt-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium"><FileText className="w-3 h-3 text-purple-500" /> 📝 All 10 Prompts Pre-Generated ({displayModel})</span>
            <span className="flex items-center gap-1 font-medium"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 🎬 Video Synthesized</span>
          </div>
          <span className="text-slate-400">💡 Click any number above to jump directly to that shot.</span>
        </div>
      </div>

      {/* 1. Live Parallel Synthesis & Client Safety Warning Banner (Option A) */}
      {isBatchGeneratingVideos && (
        <div className="border border-purple-500/50 bg-gradient-to-br from-slate-950 via-purple-950/70 to-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/40">
                <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>Synthesizing Remaining Videos in Parallel</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">
                    2 Workers Active
                  </span>
                </h4>
                <p className="text-xs text-slate-300">
                  Veo 3.1 Fast clips generating concurrently with continuous rolling throughput estimation.
                </p>
              </div>
            </div>

            {/* Prominent Client Safety Warning Pill */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/50 text-xs font-bold animate-pulse shadow-lg shadow-amber-500/10">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Keep Browser Open — Do Not Close Tab or Sleep Laptop</span>
            </div>
          </div>

          {/* Progress Bar & Real-time ETA */}
          <div className="space-y-2.5 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold flex-wrap gap-2">
              <span className="text-slate-200">
                Progress: <span className="text-purple-300">{videosCompletedCount} / 10 Videos Complete</span> ({remainingVideosCount} remaining)
              </span>
              <span className="text-amber-400 font-mono flex items-center gap-1.5 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-500/30">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Est. time remaining: ~{formatEstimatedTime(veoQueueStatus?.estimatedRemainingSeconds ?? (Math.ceil(remainingVideosCount / 2) * (veoQueueStatus?.avgVideoDurationSeconds ?? 55)))}
                </span>
              </span>
            </div>

            {/* Dynamic Progress Track */}
            <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.max(5, (videosCompletedCount / 10) * 100)}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-0.5 gap-2">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Throughput: ~{veoQueueStatus?.avgVideoDurationSeconds ?? 55}s per video across 2 concurrent workers</span>
                {veoQueueStatus?.lastClipDurationSeconds && (
                  <span className="text-slate-500">• (Last clip took {veoQueueStatus.lastClipDurationSeconds}s)</span>
                )}
              </span>
              <span className="text-slate-500 italic">
                Client session persists slot states to Cloud Storage upon finish
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. All 10 Videos Complete Success Banner (Safe to Close) */}
      {videosCompletedCount === 10 && !isBatchGeneratingVideos && (
        <div className="border border-emerald-500/40 bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-900 rounded-3xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>All 10 Countdown Videos Synthesized & Saved!</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100% Ready
                </span>
              </h4>
              <p className="text-xs text-slate-300">
                ✅ Safe to close: All videos are permanently saved in Google Cloud Storage. You can shut down your computer or assemble your master countdown.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onPreviewStitchedCountdown}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            <Film className="w-4 h-4" />
            <span>Master Video Assembly</span>
          </button>
        </div>
      )}

      {/* 3. Prompts Ready Bulk Action Announcement Banner (Visible when videos < 10 and not generating) */}
      {showBulkVideoOption && videosCompletedCount < 10 && !isBatchGeneratingVideos && (
        <div
          className={`border rounded-3xl p-5 sm:p-6 shadow-xl animate-fadeIn backdrop-blur-md space-y-4 ${
            isSlot10VideoReady
              ? 'bg-gradient-to-br from-slate-900 via-indigo-950/80 to-purple-950/90 border-purple-500/40 shadow-purple-950/30'
              : 'bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/80 border-slate-700/80 shadow-slate-950/40'
          }`}
        >
          {/* Header Row: Icon + Title + Status Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl shrink-0 ${
                  isSlot10VideoReady
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                }`}
              >
                {isSlot10VideoReady ? (
                  <Zap className="w-5 h-5 fill-current" />
                ) : (
                  <Sparkles className="w-5 h-5 text-amber-300" />
                )}
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-white tracking-wide">
                  {isSlot10VideoReady ? (
                    <span>Synthesize Remaining Videos ({videosCompletedCount}/10 Ready)</span>
                  ) : (
                    <span>Bulk Video Creation Available</span>
                  )}
                </h4>
              </div>
            </div>

            {/* Status Pill Badge */}
            {isSlot10VideoReady ? (
              <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/30 text-purple-200 border border-purple-400/50 shadow-sm">
                {remainingVideosCount} Remaining
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-400 text-slate-950 shadow-md flex items-center gap-1.5">
                <span>💡 Recommended: Start with Nr. 10 first</span>
              </span>
            )}
          </div>

          {/* Full Horizontal Space Description with High Contrast */}
          <div className="w-full text-sm sm:text-[15px] leading-relaxed text-slate-100 font-medium">
            {isSlot10VideoReady ? (
              <p>
                Shot #10 verified! Synthesize the remaining <span className="text-purple-300 font-bold">{remainingVideosCount} clips</span> in bulk using parallel workers, or customize individual shots below.
              </p>
            ) : (
              <p>
                Make Shot #10 great before applying the prompts to all other videos. Perfecting Shot #10&apos;s numeral legibility, substrate, and camera motion first ensures maximum quality across your entire countdown.
              </p>
            )}
          </div>

          {/* Actions Row: Buttons with Full Priority */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
            {!isSlot10VideoReady && (
              <button
                type="button"
                onClick={() => {
                  onSelectSlot(10);
                  onGenerateVideo(10, selectedVideoQuality);
                }}
                disabled={isSlot10Loading || isBatchGeneratingVideos}
                className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-xl shadow-amber-500/30 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
                title="Synthesize and inspect Shot #10 first"
              >
                {isSlot10Loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Generate Shot #10 First (Recommended)</span>
              </button>
            )}

            {onGenerateAllVideos && (
              <button
                type="button"
                onClick={() => onGenerateAllVideos(selectedVideoQuality)}
                disabled={isBatchGeneratingVideos}
                className={`px-6 py-3 rounded-2xl text-xs sm:text-sm font-black active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap shadow-xl ${
                  !isSlot10VideoReady
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-500/30'
                }`}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>
                  {remainingVideosCount === 10
                    ? '⚡ Bulk Create 10 Videos'
                    : `⚡ Bulk Create ${remainingVideosCount} Remaining`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Cinematic Veo 3.1 Prompt Studio (Direct 4.0s Continuous Motion & Reveal) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl shadow-slate-900/5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="w-4 h-4 text-[#4285F4]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Shot #{activeSlot?.diegeticNumber} Veo 3.1 Cinematic Prompt
            </h3>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 dark:bg-blue-500/20 text-[#4285F4] dark:text-blue-400 border border-blue-500/30">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Prompt Synthesizer: {displayModel}</span>
            </span>
            {activeSlot?.objectEmbedding && (
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900">
                Carrier: {activeSlot.objectEmbedding}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPromptsExpanded(!isPromptsExpanded)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              {isPromptsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Visual Idea Directorial Input & Prompt Recreation Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1">
            <input
              type="text"
              value={currentCustomIdea}
              onChange={(e) =>
                setCustomIdeaInput((prev) => ({ ...prev, [activeSlot.diegeticNumber]: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isPromptRecreating) {
                  onRecreatePrompt(activeSlot.diegeticNumber, currentCustomIdea);
                }
              }}
              placeholder={`💡 Visual ideas for Shot #${activeSlot.diegeticNumber} (e.g. cockpit HUD telemetry, drone dawn over harvest, laser-etched metal...)`}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => onRecreatePrompt(activeSlot.diegeticNumber, currentCustomIdea)}
            disabled={isPromptRecreating}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#4285F4] to-[#34A853] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPromptRecreating ? 'animate-spin' : ''}`} />
            <span>{isPromptRecreating ? 'Synthesizing...' : 'Re-create Concept'}</span>
          </button>
        </div>

        {isPromptsExpanded && (
          isPromptRecreating ? (
            <div className="p-8 my-4 rounded-2xl bg-blue-50/50 dark:bg-slate-800/50 border border-blue-200/50 dark:border-slate-700 text-center flex flex-col items-center justify-center gap-3 animate-pulse">
              <Sparkles className="w-7 h-7 text-[#4285F4] animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Synthesizing Shot #{activeSlot?.diegeticNumber} 4.0s Cinematic Reveal Arc...
                </p>
                <p className="text-xs text-slate-500 max-w-md">
                  {displayModel} is crafting continuous camera trajectories, dynamic establishing motion (0-2.5s), and physical numeral reveal (2.5-4.0s) with visual continuity.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-4">
              <div className="flex items-center justify-between text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                <div className="flex items-center gap-2">
                  <span>Direct 4.0s Text-to-Video Direction</span>
                  <span className="flex items-center gap-1 normal-case font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-[#4285F4] dark:text-blue-400 border border-blue-500/30 text-[10px]">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Generated via {displayModel}</span>
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono normal-case">{videoPromptText.length} characters</span>
              </div>
              <textarea
                value={videoPromptText}
                onChange={(e) => onUpdateVideoPrompt(activeSlot.diegeticNumber, e.target.value)}
                placeholder="[0.0s-2.5s]: Dynamic wide motion... [2.5s-4.0s]: Camera tilts/zooms or obstacle exits to reveal numeral in sharp center focus..."
                className="w-full text-xs sm:text-sm font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-32 leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Reveal Arc:</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">0.0s–2.5s: Establishing motion (no text)</span>
                <span>➔</span>
                <span className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md font-semibold">2.5s–4.0s: Zoom/Tilt/Unmask Hero Reveal #{activeSlot?.diegeticNumber}</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* 3. Veo 3 Video Synthesis & Realtime Playback */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl shadow-slate-900/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Veo 3.1 Text-to-Video Engine
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Shot #{activeSlot?.diegeticNumber} 4.0s Motion Video
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-2 rounded-xl">
              ⚡ Veo 3.1 Fast (720p ➔ 4K)
            </span>

            <button
              type="button"
              onClick={() => onGenerateVideo(activeSlot.diegeticNumber, selectedVideoQuality)}
              disabled={isVideoLoading || isPromptRecreating}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                isVideoLoading || isPromptRecreating
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#4285F4] to-[#34A853] hover:opacity-95 text-white shadow-blue-500/25 active:scale-95'
              }`}
            >
              <Zap className={`w-4 h-4 ${isVideoLoading ? 'animate-spin' : ''}`} />
              <span>{isVideoLoading ? 'Synthesizing...' : '⚡ Generate Video'}</span>
            </button>
          </div>
        </div>

        {/* Video Player or Progress/Error State */}
        <div className="mt-4">
          {activeSlot?.videoError && (
            <div className="p-4 mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start justify-between gap-3 text-red-600 dark:text-red-400 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Video Generation Notice</p>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-300">{activeSlot.videoError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onGenerateVideo(activeSlot.diegeticNumber, selectedVideoQuality)}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold shrink-0 text-[11px]"
              >
                Retry Video
              </button>
            </div>
          )}

          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800 shadow-inner">
            {hasVideo ? (
              <video
                key={activeSlot.processedVideoUri || activeSlot.rawVideoUri}
                src={getMediaUrl(activeSlot.processedVideoUri || activeSlot.rawVideoUri)}
                controls
                controlsList="nodownload"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="w-full h-full object-contain"
              />
            ) : isVideoLoading || Boolean(activeWorkerForSlot || queueItemForSlot) ? (
              queueItemForSlot ? (
                <div className="flex flex-col items-center gap-3 text-amber-400 text-sm p-8 text-center animate-fadeIn">
                  <Clock className="w-9 h-9 animate-pulse text-amber-400" />
                  <p className="font-bold text-base text-slate-100">
                    Queued for Veo 3 Synthesis (Position #{queueItemForSlot.position} in Queue)...
                  </p>
                  <p className="text-xs text-slate-400 max-w-md">
                    Both parallel workers are currently busy. Shot #{activeSlot.diegeticNumber} will automatically dispatch as soon as a worker slot opens.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-purple-400 text-sm p-8 text-center animate-fadeIn">
                  <RefreshCw className="w-9 h-9 animate-spin text-purple-500" />
                  <p className="font-bold text-base text-slate-100">
                    {activeWorkerForSlot ? `Worker ${activeWorkerForSlot.workerId}` : 'Worker'} Synthesizing 4.0s @ 60fps Veo 3 Video...
                  </p>
                  <p className="text-xs text-slate-400 max-w-md">
                    Google Veo 3.1 is actively rendering 4.0 seconds of native cinematic motion and revealing diegetic numeral #{activeSlot.diegeticNumber}.
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-3 p-8 text-center text-slate-500 text-xs">
                <Film className="w-10 h-10 opacity-30 text-purple-400" />
                <p className="text-sm font-semibold text-slate-400">Veo 3 Video has not been synthesized yet for Shot #{activeSlot.diegeticNumber}.</p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Click <strong className="text-blue-400 font-bold">"⚡ Generate Video"</strong> above to directly synthesize the 4-second motion reveal.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Veo AI Video Quality Inspector Panel (Gemini 3.8 Flash Multimodal Frame Analysis) */}
        {hasVideo && onAnalyzeVideo && onApplyPromptFixAndRegenerate && (
          <VeoInspectorPanel
            slot={activeSlot}
            onAnalyzeVideo={onAnalyzeVideo}
            onApplyPromptFixAndRegenerate={onApplyPromptFixAndRegenerate}
            selectedVideoQuality={selectedVideoQuality}
          />
        )}

        {/* 4. Video Iteration & Directorial Fixes (Option A: Redo from Scratch / Option B: Fix Prompt with Feedback) */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Not satisfied with Shot #{activeSlot.diegeticNumber}? Choose an Iteration Option:
              </span>
            </div>
            {onRedoPromptFromScratch && (
              <button
                type="button"
                onClick={() => onRedoPromptFromScratch(activeSlot.diegeticNumber)}
                disabled={isVideoLoading || isPromptRecreating || isRefiningPrompt}
                className="text-xs font-bold text-rose-500 hover:text-rose-400 hover:underline flex items-center gap-1.5 self-start sm:self-auto py-1 px-2.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                title="Discard this concept and generate a completely new theme, carrier, and motion reveal"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Option A: 🔄 Redo Concept from Scratch</span>
              </button>
            )}
          </div>

          {/* Option B: Fix Current Prompt with Comment */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                Option B: Direct Gemini to Fix Current Prompt
              </span>
              {refineSuccessNotice && (
                <span className="text-[11px] font-bold text-emerald-500 animate-fadeIn">
                  ✓ {refineSuccessNotice}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={fixCommentInput[activeSlot.diegeticNumber] || ''}
                onChange={(e) =>
                  setFixCommentInput((prev) => ({ ...prev, [activeSlot.diegeticNumber]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !isRefiningPrompt &&
                    fixCommentInput[activeSlot.diegeticNumber]?.trim() &&
                    onRefinePromptWithComment
                  ) {
                    const comment = fixCommentInput[activeSlot.diegeticNumber].trim();
                    setIsRefiningPrompt(true);
                    setRefineSuccessNotice(null);
                    onRefinePromptWithComment(activeSlot.diegeticNumber, comment)
                      .then(() => {
                        setFixCommentInput((prev) => ({ ...prev, [activeSlot.diegeticNumber]: '' }));
                        setRefineSuccessNotice('Prompt updated with your directorial fix!');
                        setTimeout(() => setRefineSuccessNotice(null), 4000);
                      })
                      .finally(() => setIsRefiningPrompt(false));
                  }
                }}
                placeholder="💬 Tell Gemini what to fix (e.g. make numeral larger and metallic, slow down zoom, switch to sunset, keep on screen longer)..."
                className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              />

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const comment = fixCommentInput[activeSlot.diegeticNumber]?.trim();
                    if (!comment || !onRefinePromptWithComment) return;
                    setIsRefiningPrompt(true);
                    setRefineSuccessNotice(null);
                    onRefinePromptWithComment(activeSlot.diegeticNumber, comment)
                      .then(() => {
                        setFixCommentInput((prev) => ({ ...prev, [activeSlot.diegeticNumber]: '' }));
                        setRefineSuccessNotice('Prompt updated with your directorial fix!');
                        setTimeout(() => setRefineSuccessNotice(null), 4000);
                      })
                      .finally(() => setIsRefiningPrompt(false));
                  }}
                  disabled={isRefiningPrompt || !fixCommentInput[activeSlot.diegeticNumber]?.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isRefiningPrompt ? 'animate-spin' : ''}`} />
                  <span>{isRefiningPrompt ? 'Refining...' : 'Apply Fix'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const comment = fixCommentInput[activeSlot.diegeticNumber]?.trim();
                    if (!comment || !onRefinePromptWithComment) return;
                    setIsRefiningPrompt(true);
                    setRefineSuccessNotice(null);
                    onRefinePromptWithComment(activeSlot.diegeticNumber, comment)
                      .then(() => {
                        setFixCommentInput((prev) => ({ ...prev, [activeSlot.diegeticNumber]: '' }));
                        onGenerateVideo(activeSlot.diegeticNumber, selectedVideoQuality);
                      })
                      .finally(() => setIsRefiningPrompt(false));
                  }}
                  disabled={isRefiningPrompt || isVideoLoading || !fixCommentInput[activeSlot.diegeticNumber]?.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-95 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Fix & Re-Generate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Footer Workflow Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={onPreviewStitchedCountdown}
          disabled={videosCompletedCount === 0 || isStitchingMaster}
          className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-lg ${
            videosCompletedCount > 0
              ? 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 shadow-slate-900/20 active:scale-98'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isStitchingMaster ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>🎬 Preview Stitched Countdown ({videosCompletedCount}/10 Videos)</span>
        </button>

        {!isLastShot ? (
          <button
            type="button"
            onClick={onProceedToNextShot}
            disabled={!canProceed}
            className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-xl ${
              canProceed
                ? 'bg-[#34A853] hover:bg-emerald-600 text-white shadow-emerald-500/25 active:scale-98 hover:scale-102'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Proceed to Shot #{activeSlotIndex - 1}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onPreviewStitchedCountdown}
            disabled={videosCompletedCount === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#4285F4] to-[#34A853] hover:opacity-95 text-white text-sm font-bold shadow-2xl shadow-emerald-500/30 active:scale-98"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>All 10 Countdown Shots Complete! Preview Final Master</span>
          </button>
        )}
      </div>
    </div>
  );
};
