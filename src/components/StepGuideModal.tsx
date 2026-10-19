import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  Globe,
  Film,
  Music,
  Sliders,
  Tv,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export type StepGuideId = 'step-1' | 'step-2' | 'step-4' | 'step-5' | 'step-6';

interface StepInfo {
  stepBadge: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  overview: string;
  decisions: {
    title: string;
    description: string;
  }[];
}

const STEP_DATA: Record<StepGuideId, StepInfo> = {
  'step-1': {
    stepBadge: 'Step 1 of 6',
    title: 'Brand Discovery & 10 Countdown Scenes',
    subtitle: 'Researching your customer’s website to craft authentic visual scenes',
    icon: <Globe className="w-6 h-6 text-cyan-200" />,
    overview:
      'The generator scans your customer’s live website to understand their brand identity, colors, and industry aesthetic. It then designs 10 custom scene concepts counting down from 10 to 1.',
    decisions: [
      {
        title: 'Customer Website',
        description:
          'Enter the customer’s domain (e.g. madsack.de) and any event theme or kickoff notes.',
      },
      {
        title: 'Review 10 Scenes',
        description:
          'Preview the countdown concepts. You can customize any scene idea before video generation begins.',
      },
    ],
  },
  'step-2': {
    stepBadge: 'Step 2 of 6',
    title: 'Video Generation',
    subtitle: 'High-speed video rendering producing 2 scenes at a time',
    icon: <Film className="w-6 h-6 text-amber-200" />,
    overview:
      'The video engine creates all 10 scenes, generating 2 scenes at a time. Each scene takes about 30 seconds to render, and you can watch and preview them as soon as each one finishes.',
    decisions: [
      {
        title: 'Live Scene Progress',
        description:
          'Watch scenes 10 down to 1 generate. Each scene becomes playable the moment it completes.',
      },
      {
        title: 'Ready for Sound',
        description:
          'Once all 10 scenes finish, proceed directly to synchronized soundtrack preview in Step 4.',
      },
    ],
  },
  'step-4': {
    stepBadge: 'Step 4 of 6',
    title: 'Music & Timeline Sync',
    subtitle: 'Watch your 10 scenes locked to the high-energy soundtrack',
    icon: <Music className="w-6 h-6 text-emerald-200" />,
    overview:
      'All 10 scenes are automatically edited to the 30-second soundtrack beat, including the dramatic 1-second drop pause on Scene #1 right before the keynote launches.',
    decisions: [
      {
        title: 'Check Pacing & Energy',
        description:
          'Play the sequence to see how the numbers flow seamlessly together.',
      },
      {
        title: 'Next Step',
        description:
          'Ready to export? Proceed to Final Cut Export. Want to tweak any scene? Fine-tune it in Step 5.',
      },
    ],
  },
  'step-5': {
    stepBadge: 'Step 5 of 6',
    title: 'Fine-Tuning Individual Scenes',
    subtitle: 'Easily re-generate any scene without touching the rest',
    icon: <Sliders className="w-6 h-6 text-purple-200" />,
    overview:
      'You have full creative control over each number from 10 down to 1. If you want a different visual style or a more prominent countdown number in any scene, you can generate a fresh take in seconds.',
    decisions: [
      {
        title: 'Choose Any Scene (10 to 1)',
        description:
          'Select any scene to view its full video and visual description.',
      },
      {
        title: 'Generate New Take',
        description:
          'Adjust the description or click "Generate New Take". Your other 9 scenes stay locked.',
      },
    ],
  },
  'step-6': {
    stepBadge: 'Step 6 of 6',
    title: 'Final Cut & Full Video Export',
    subtitle: '2 simple decisions for a broadcast-ready video',
    icon: <Tv className="w-6 h-6 text-sky-200" />,
    overview:
      'Assembles your individual scenes into one seamless, continuous video file with full soundtrack audio. You make 2 straightforward choices:',
    decisions: [
      {
        title: 'Decision 1: Video Length',
        description:
          'Choose the standalone 30-second countdown or the full 2-minute version transitioning into the Google I/O 2026 inspirational AI film.',
      },
      {
        title: 'Decision 2: Quality & Speed',
        description:
          'Choose ⚡ Quick Draft (720p, ~18s) for immediate testing, or 🌟 Studio 4K (~50s to 5.5m) for main-stage keynote screens.',
      },
    ],
  },
};

interface StepGuideModalProps {
  isOpen: boolean;
  stepId: StepGuideId | null;
  onClose: (dontShowAgain?: boolean) => void;
}

export const StepGuideModal: React.FC<StepGuideModalProps> = ({
  isOpen,
  stepId,
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

  if (!isOpen || !stepId) return null;

  const data = STEP_DATA[stepId] || STEP_DATA['step-1'];

  const handleDismiss = () => {
    onClose(dontShowAgain);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      {/* Google Blue Background Container matching Welcome Guide */}
      <div
        className="relative w-full max-w-xl bg-gradient-to-br from-[#1a73e8] via-[#1557b0] to-[#0d47a1] text-white rounded-3xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Ambient Glows */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 sm:p-7 border-b border-white/15 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner shrink-0">
              {data.icon}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-[11px] font-bold tracking-wide uppercase mb-1">
                <span>{data.stepBadge}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                {data.title}
              </h2>
              <p className="text-xs text-blue-100/90 mt-0.5">{data.subtitle}</p>
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

        {/* Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-4 text-white">
          {/* Overview Card */}
          <div className="p-4 rounded-2xl bg-white/10 border border-white/15">
            <p className="text-xs sm:text-sm text-blue-50 leading-relaxed">
              {data.overview}
            </p>
          </div>

          {/* Key Decisions / Actions */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-200 block px-1">
              What happens in this step:
            </span>

            {data.decisions.map((dec, i) => (
              <div
                key={i}
                className="p-3.5 sm:p-4 rounded-2xl bg-white/10 border border-white/15 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                  {i + 1}
                </div>
                <div className="space-y-0.5 text-left flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    {dec.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-blue-100 leading-relaxed">
                    {dec.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative p-5 sm:p-6 bg-black/20 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs text-blue-100 select-none cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-white/40 text-blue-600 focus:ring-white/30 bg-white/20 cursor-pointer"
            />
            <span>Don't show step tips automatically</span>
          </label>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#1a73e8] font-bold text-xs shadow-lg shadow-black/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <span>Got it, let's go!</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
