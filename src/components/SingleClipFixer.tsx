import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Play,
  CheckCircle2,
  Video,
  Wand2,
  Edit3,
  Film,
  AlertCircle,
  ArrowRight,
  Maximize2,
} from 'lucide-react';
import { CountdownSlot, VeoQueueStatus } from '../types';
import { getMediaUrl } from '../utils/media';

interface SingleClipFixerProps {
  slots: CountdownSlot[];
  activeSlotIndex: number;
  onSelectSlot: (slotIndex: number) => void;
  onUpdateVideoPrompt: (slotIndex: number, newPrompt: string) => void;
  onRecreatePrompt: (slotIndex: number, customInstructions?: string) => Promise<void>;
  onRedoVideo: (slotIndex: number) => Promise<void>;
  onPlayVideo: (videoUri: string) => void;
  onProceedToMaster: () => void;
  veoQueueStatus?: VeoQueueStatus;
}

export const SingleClipFixer: React.FC<SingleClipFixerProps> = ({
  slots,
  activeSlotIndex,
  onSelectSlot,
  onUpdateVideoPrompt,
  onRecreatePrompt,
  onRedoVideo,
  onPlayVideo,
  onProceedToMaster,
  veoQueueStatus,
}) => {
  const [aiCustomIdea, setAiCustomIdea] = useState('');
  const [isAiGeneratingPrompt, setIsAiGeneratingPrompt] = useState(false);
  const [justRedoneSlot, setJustRedoneSlot] = useState<number | null>(null);

  const activeSlot = slots.find((s) => s.diegeticNumber === activeSlotIndex) || slots[0];
  const sortedSlots = [...slots].sort((a, b) => b.diegeticNumber - a.diegeticNumber);

  const currentVideoUri = activeSlot?.processedVideoUri || activeSlot?.rawVideoUri;
  const isSlotLoading = Boolean(activeSlot?.isVideoLoading);
  const isPromptRecreating = Boolean(activeSlot?.isPromptRecreating);

  const handleAiPromptClick = async () => {
    if (!activeSlot) return;
    setIsAiGeneratingPrompt(true);
    try {
      await onRecreatePrompt(activeSlot.diegeticNumber, aiCustomIdea.trim() || undefined);
      setAiCustomIdea('');
    } finally {
      setIsAiGeneratingPrompt(false);
    }
  };

  const handleRedoClick = async () => {
    if (!activeSlot || isSlotLoading) return;
    setJustRedoneSlot(activeSlot.diegeticNumber);
    await onRedoVideo(activeSlot.diegeticNumber);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 transition-colors animate-fadeIn">
      {/* Step 5 Decision Banner: 5a vs 5b */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Step 5 Choice
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              What would you like to do next?
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            You can fine-tune individual scenes (10 down to 1) below to create new takes (Step 5a), or proceed directly to assemble the Final Cut (Step 5b).
          </p>
        </div>

        {/* 5b Action Button (Primary) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onProceedToMaster}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-blue-500/25 flex items-center gap-2 transition-all"
          >
            <Film className="w-4 h-4" />
            <span>Create Final Cut →</span>
          </button>
        </div>
      </div>

      {/* 5a Tuning Workspace */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                5a. Fine-Tune Individual Scenes
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Select a scene from 10 down to 1, polish the visual direction, and generate a new take.
              </p>
            </div>
          </div>

          {justRedoneSlot === activeSlot.diegeticNumber && !isSlotLoading && currentVideoUri && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Scene #{activeSlot.diegeticNumber} updated & ready in timeline!</span>
            </span>
          )}
        </div>

        {/* Number Selector Pills (10 down to 1) */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {sortedSlots.map((slot) => {
            const isSelected = slot.diegeticNumber === activeSlotIndex;
            const hasVideo = Boolean(slot.rawVideoUri || slot.processedVideoUri);
            const isGenerating = slot.isVideoLoading;

            return (
              <button
                key={slot.diegeticNumber}
                type="button"
                onClick={() => onSelectSlot(slot.diegeticNumber)}
                className={`py-3 px-2 rounded-2xl font-mono text-xs font-black transition-all flex flex-col items-center justify-center gap-1 border ${
                  isSelected
                    ? 'bg-[#4285F4] text-white border-blue-400 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/40 scale-105'
                    : hasVideo
                    ? 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800'
                    : 'bg-slate-100 dark:bg-slate-900/60 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>#{slot.diegeticNumber}</span>
                  {hasVideo && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                  )}
                  {isGenerating && (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-purple-400" />
                  )}
                </div>
                <span className="text-[9px] font-sans font-normal opacity-80 truncate max-w-full">
                  {slot.sceneConcept ? slot.sceneConcept.substring(0, 8) + '...' : `Scene ${slot.diegeticNumber}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detailed Redo & Tuning Panel for Active Slot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Left Column: Video Preview */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Scene #{activeSlot.diegeticNumber} Video Preview
              </span>
              {currentVideoUri && (
                <button
                  type="button"
                  onClick={() => onPlayVideo(currentVideoUri)}
                  className="text-[11px] text-[#4285F4] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Full Screen</span>
                </button>
              )}
            </div>

            <div className="aspect-video w-full rounded-2xl bg-black border border-slate-200 dark:border-slate-800 overflow-hidden relative flex items-center justify-center shadow-md">
              {isSlotLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                  <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                  <span className="text-xs font-bold text-white">
                    Rendering Scene #{activeSlot.diegeticNumber}...
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ~30-45s render time
                  </span>
                </div>
              ) : currentVideoUri ? (
                <video
                  key={currentVideoUri}
                  src={getMediaUrl(currentVideoUri)}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  controlsList="nodownload"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                  <Video className="w-8 h-8 mx-auto text-slate-600 opacity-50 mb-2" />
                  <p className="font-bold text-slate-300">No video generated yet</p>
                  <p className="text-[11px]">Click &quot;Generate New Take&quot; to render this scene.</p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex justify-between font-medium">
                <span>Concept:</span>
                <strong className="text-slate-800 dark:text-slate-200">{activeSlot.sceneConcept}</strong>
              </div>
              <div className="flex justify-between font-medium">
                <span>Countdown Number:</span>
                <strong className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                  {activeSlot.diegeticNumber}
                </strong>
              </div>
            </div>
          </div>

          {/* Right Column: Prompt Editing & Redo Controls */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Manual Text Prompt Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Option 1: Custom Scene Description & Direction
                </label>
                <span className="text-[11px] text-slate-400">
                  Visual direction for Scene #{activeSlot.diegeticNumber}
                </span>
              </div>
              <textarea
                rows={5}
                value={activeSlot.videoPrompt || ''}
                onChange={(e) => onUpdateVideoPrompt(activeSlot.index, e.target.value)}
                placeholder="Describe what appears on screen and how the countdown number is revealed..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-blue-500/20 font-mono leading-relaxed resize-y"
              />
            </div>

            {/* 2. AI Prompt Recreation Tool */}
            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Option 2: Suggest a New Visual Concept</span>
                </label>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                  Creative Assistant
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={aiCustomIdea}
                  onChange={(e) => setAiCustomIdea(e.target.value)}
                  placeholder="e.g. Glowing neon countdown number revealed across a titanium motherboard..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={handleAiPromptClick}
                  disabled={isAiGeneratingPrompt || isPromptRecreating}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20 transition-all whitespace-nowrap"
                >
                  {isAiGeneratingPrompt || isPromptRecreating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing Direction...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Suggest New Direction</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 3. The Big REDO Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                <span>Fast render. Updates timeline automatically.</span>
              </div>

              <button
                type="button"
                onClick={handleRedoClick}
                disabled={isSlotLoading || !activeSlot.videoPrompt?.trim()}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 active:scale-98 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2 transition-all"
              >
                {isSlotLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rendering Scene #{activeSlot.diegeticNumber}...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Generate New Take for Scene #{activeSlot.diegeticNumber}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
