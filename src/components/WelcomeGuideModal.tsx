import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Globe,
  Film,
  ArrowRight,
  Tv,
  ExternalLink,
  Image,
  Bot,
  RefreshCw,
  CheckSquare,
  Sparkle,
} from 'lucide-react';

interface WelcomeGuideModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain?: boolean) => void;
}

export const WelcomeGuideModal: React.FC<WelcomeGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(dontShowAgain);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dontShowAgain, onClose]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    onClose(dontShowAgain);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      {/* Google Blue Background Container */}
      <div
        className="relative w-full max-w-2xl bg-gradient-to-br from-[#1a73e8] via-[#1557b0] to-[#0d47a1] text-white rounded-3xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Decorative Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-6 sm:p-7 border-b border-white/15 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-[11px] font-bold tracking-wide uppercase mb-1">
                <span>Quick Tour</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                How CountdownMaker Works
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 mt-0.5">
                Prep high-impact customer meetings with countdown videos, 32:9 cinema visuals &amp; mascots
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Feature Guides */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-4 text-white">
          {/* Card 1: Intake & Selection */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-all flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 font-extrabold text-base shadow-sm">
              <Globe className="w-5 h-5 text-cyan-200" />
            </div>
            <div className="space-y-1.5 text-left flex-1">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-cyan-200" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  1. Enter Customer URL &amp; Select Features
                </h3>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Paste any customer domain (e.g. <span className="font-mono bg-white/15 px-1.5 py-0.5 rounded text-white font-bold">lufthansa.com</span>, <span className="font-mono bg-white/15 px-1.5 py-0.5 rounded text-white font-bold">wimex-group.com</span>) and check any combination of the 3 meeting assets. Powered by <strong className="text-white font-semibold">Gemini 4 Argon</strong> with live Google Search grounding to automatically identify the customer's industry aesthetic, corporate brand colors, and official logo.
              </p>
            </div>
          </div>

          {/* Card 2: 32:9 Cinema Welcome Image */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-all flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/40 to-blue-500/40 border border-white/30 flex items-center justify-center shrink-0 font-extrabold text-base shadow-sm">
              <Image className="w-5 h-5 text-indigo-200" />
            </div>
            <div className="space-y-1.5 text-left flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-500/30 border border-indigo-300/40 text-[10px] font-black uppercase text-indigo-100">
                  Cinema 32:9
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  2. 4K Ultra-Wide Cinema Welcome Graphic
                </h3>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Rendered with <strong className="text-white font-semibold">Gemini Nano Banana 2.1</strong> in native 4K ultra-wide (32:9) aspect ratio, purpose-built for our cinema screen. It crafts an authentic environment specific to the customer's industry (e.g. futuristic flight deck for aviation, high-tech hydroponic facility for agriculture). Need another angle? Click the convenient <span className="font-semibold text-white inline-flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded text-[11px]"><RefreshCw className="w-3 h-3" /> Redo</span> pill anytime.
              </p>
            </div>
          </div>

          {/* Card 3: Bugdroid Mascot */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-all flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/40 to-teal-500/40 border border-white/30 flex items-center justify-center shrink-0 font-extrabold text-base shadow-sm">
              <Bot className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="space-y-1.5 text-left flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/30 border border-emerald-300/40 text-[10px] font-black uppercase text-emerald-100">
                  Mascot
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  3. Branded Bugdroid in Industry Outfit
                </h3>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Creates a cute 3D Bugdroid against a sleek dark studio backdrop wearing a crisp white T-shirt featuring the customer's logo. The Bugdroid can appear plain or accessorized in company workwear (e.g. pilot cap, farmer overalls, engineer hardhat). Includes a 1-click <span className="font-semibold text-white inline-flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded text-[11px]"><RefreshCw className="w-3 h-3" /> Redo</span> pill for rapid variations.
              </p>
            </div>
          </div>

          {/* Card 4: 30s Countdown Video & Keynote Opener */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-all flex gap-4 items-start">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/40 to-orange-500/40 border border-white/30 flex items-center justify-center shrink-0 font-extrabold text-base shadow-sm">
              <Film className="w-5 h-5 text-amber-200" />
            </div>
            <div className="space-y-1.5 text-left flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/30 border border-amber-300/40 text-[10px] font-black uppercase text-amber-100">
                  Video 4K
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  4. 30s Countdown Video (Veo 3.1) &amp; Event Opener
                </h3>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                Synthesizes 10 diegetic scenes with countdown numbers (10 down to 1) integrated naturally into the environment. Synced to high-energy golden beat audio with a dramatic 1-second drop pause on #1 right before the keynote starts. Export standalone 30s cuts or the full 2-minute extended version with the inspirational AI film.
              </p>
            </div>
          </div>

          {/* Pro-Tip: Multi-Tab Workflows */}
          <div className="p-3.5 rounded-2xl bg-black/20 border border-white/10 flex items-center gap-3">
            <Sparkle className="w-4 h-4 text-cyan-300 shrink-0" />
            <p className="text-[11px] sm:text-xs text-blue-100 leading-relaxed">
              <strong className="text-white">Pro Tip:</strong> Preparing multiple customer meetings simultaneously? The customer name is dynamically pinned in the screen header and the browser tab title (<span className="font-mono text-cyan-200">&lt;Customer&gt; - Meeting Prep Studio</span>) so you never lose track.
            </p>
          </div>
        </div>

        {/* Modal Footer: Decline preference & Start Button */}
        <div className="relative p-5 sm:p-6 bg-black/20 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Don't show again checkbox */}
          <label className="flex items-center gap-2.5 text-xs text-blue-100 select-none cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-white/40 text-blue-600 focus:ring-white/30 bg-white/20 cursor-pointer"
            />
            <span>Don't show this welcome guide again</span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#1a73e8] font-bold text-xs shadow-lg shadow-black/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
