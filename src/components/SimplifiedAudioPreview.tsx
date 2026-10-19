import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Music,
  Film,
  Sparkles,
  Clock,
  ArrowRight,
  CheckCircle2,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { CountdownSlot } from '../types';
import { getMediaUrl } from '../utils/media';
import { extractTimestampFromUri, getLatestSlotVideoTimestamp } from '../utils/videoTimeline';

interface SimplifiedAudioPreviewProps {
  slots: CountdownSlot[];
  audioTrackUri: string;
  masterVideoUri?: string | null;
  onProceedToMaster?: () => void;
  onSelectSlot?: (diegeticNumber: number) => void;
}

interface TimelineSegment {
  diegeticNumber: number;
  startTime: number;
  duration: number;
  endTime: number;
  trimStart: number; // For 4s raw clip, where playback begins (1.7s Act 1, 0.7s Act 2)
  color: string;
}

export const SimplifiedAudioPreview: React.FC<SimplifiedAudioPreviewProps> = ({
  slots,
  audioTrackUri,
  masterVideoUri,
  onProceedToMaster,
  onSelectSlot,
}) => {
  // Preview mode: always default to 'individual_scenes' (Scene Takes) so newly generated takes from Step 5 are immediately active
  const [previewMode, setPreviewMode] = useState<'final_cut' | 'individual_scenes'>('individual_scenes');

  // Detect if active scene takes were generated after the master video cut
  const latestSceneTakeTimestamp = useMemo(() => getLatestSlotVideoTimestamp(slots), [slots]);
  const masterCutTimestamp = useMemo(() => extractTimestampFromUri(masterVideoUri), [masterVideoUri]);
  const isFinalCutOutdated = Boolean(
    masterVideoUri &&
    latestSceneTakeTimestamp > 0 &&
    masterCutTimestamp > 0 &&
    latestSceneTakeTimestamp > masterCutTimestamp
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0.0);
  const [isMuted, setIsMuted] = useState(false);

  // Audio ref for countdown music in individual scenes mode
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Single video player ref for Final Cut mode
  const masterVideoRef = useRef<HTMLVideoElement | null>(null);

  // Dual-buffer ping-pong video player refs for Individual Scenes mode
  const videoRefA = useRef<HTMLVideoElement | null>(null);
  const videoRefB = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Define the exact 30.00s golden beat grid:
  // Act 1 (10, 9, 8, 7): 4 * 2.30s = 9.20s
  // Black drop pause: 1.00s = 9.20s -> 10.20s
  // Act 2 (6, 5, 4, 3, 2, 1): 6 * 3.30s = 19.80s
  // Total = 30.00s
  const timelineSegments: TimelineSegment[] = useMemo(() => {
    const colors: Record<number, string> = {
      10: 'bg-cyan-500',
      9: 'bg-blue-500',
      8: 'bg-indigo-500',
      7: 'bg-violet-500',
      6: 'bg-purple-500',
      5: 'bg-fuchsia-500',
      4: 'bg-pink-500',
      3: 'bg-rose-500',
      2: 'bg-amber-500',
      1: 'bg-emerald-500',
    };

    const segments: TimelineSegment[] = [];
    let t = 0;

    // Act 1: 10, 9, 8, 7 (2.3s each, trim first 1.7s of 4s Veo clip)
    for (const num of [10, 9, 8, 7]) {
      const dur = 2.3;
      segments.push({
        diegeticNumber: num,
        startTime: t,
        duration: dur,
        endTime: t + dur,
        trimStart: 4.0 - dur, // 1.7s
        color: colors[num],
      });
      t += dur;
    }

    // Dramatic Pause: 9.2s -> 10.2s (1.0s)
    t += 1.0;

    // Act 2: 6, 5, 4, 3, 2, 1 (3.3s each, trim first 0.7s of 4s Veo clip)
    for (const num of [6, 5, 4, 3, 2, 1]) {
      const dur = 3.3;
      segments.push({
        diegeticNumber: num,
        startTime: t,
        duration: dur,
        endTime: t + dur,
        trimStart: 4.0 - dur, // 0.7s
        color: colors[num],
      });
      t += dur;
    }

    return segments;
  }, []);

  // Determine current timeline state
  const isDramaticPause = currentTime >= 9.2 && currentTime < 10.2;

  const currentSegmentIndex = useMemo(() => {
    if (isDramaticPause) return -1;
    const idx = timelineSegments.findIndex(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
    );
    if (idx !== -1) return idx;
    return currentTime >= 30.0 ? timelineSegments.length - 1 : 0;
  }, [currentTime, isDramaticPause, timelineSegments]);

  const currentSegment = currentSegmentIndex >= 0 ? timelineSegments[currentSegmentIndex] : null;

  const activeSlot = useMemo(() => {
    if (!currentSegment) return null;
    return slots.find((s) => s.diegeticNumber === currentSegment.diegeticNumber) || null;
  }, [slots, currentSegment]);

  // Dual-buffer ping-pong assignment:
  // Even segments (0: #10, 2: #8, 4: #6, 6: #4, 8: #2) -> Buffer A is ACTIVE
  // Odd segments (1: #9, 3: #7, 5: #5, 7: #3, 9: #1)  -> Buffer B is ACTIVE
  const activeBuffer = currentSegmentIndex >= 0 ? (currentSegmentIndex % 2 === 0 ? 'A' : 'B') : null;

  // Derive source videos for Buffer A and Buffer B
  // Buffer A is assigned either the current even segment, or preloads the next even segment
  // Buffer B is assigned either the current odd segment, or preloads the next odd segment
  const { srcA, srcB, trimStartA, trimStartB } = useMemo(() => {
    if (currentSegmentIndex < 0) {
      // During Dramatic Pause (after #7, which was index 3/Buffer B):
      // The upcoming scene is Scene 6 (index 4/Buffer A)
      const seg6 = timelineSegments[4];
      const slot6 = slots.find((s) => s.diegeticNumber === 6);
      const uri6 = slot6?.processedVideoUri || slot6?.rawVideoUri || null;
      return {
        srcA: uri6 ? getMediaUrl(uri6) : '',
        srcB: '',
        trimStartA: seg6?.trimStart ?? 0.7,
        trimStartB: 0,
      };
    }

    const isCurrentA = currentSegmentIndex % 2 === 0;
    const currentSeg = timelineSegments[currentSegmentIndex];
    const nextSeg = currentSegmentIndex + 1 < timelineSegments.length ? timelineSegments[currentSegmentIndex + 1] : null;

    const currentSlotData = slots.find((s) => s.diegeticNumber === currentSeg.diegeticNumber);
    const nextSlotData = nextSeg ? slots.find((s) => s.diegeticNumber === nextSeg.diegeticNumber) : null;

    const currentUri = currentSlotData?.processedVideoUri || currentSlotData?.rawVideoUri || null;
    const nextUri = nextSlotData?.processedVideoUri || nextSlotData?.rawVideoUri || null;

    let aUri = isCurrentA ? currentUri : nextUri;
    let bUri = isCurrentA ? nextUri : currentUri;
    let aTrim = isCurrentA ? currentSeg.trimStart : (nextSeg?.trimStart ?? 0);
    let bTrim = isCurrentA ? (nextSeg?.trimStart ?? 0) : currentSeg.trimStart;

    return {
      srcA: aUri ? getMediaUrl(aUri) : '',
      srcB: bUri ? getMediaUrl(bUri) : '',
      trimStartA: aTrim,
      trimStartB: bTrim,
    };
  }, [currentSegmentIndex, timelineSegments, slots]);

  // Pre-prime standby buffer to its trimStart as soon as metadata loads
  const handleLoadedMetadataA = useCallback(() => {
    const video = videoRefA.current;
    if (!video) return;
    if (activeBuffer !== 'A') {
      // Standby buffer: seek to target start frame and hold paused
      video.currentTime = trimStartA;
      video.pause();
    }
  }, [activeBuffer, trimStartA]);

  const handleLoadedMetadataB = useCallback(() => {
    const video = videoRefB.current;
    if (!video) return;
    if (activeBuffer !== 'B') {
      // Standby buffer: seek to target start frame and hold paused
      video.currentTime = trimStartB;
      video.pause();
    }
  }, [activeBuffer, trimStartB]);

  // Sync active video playback time with audio clock (Dual-Buffer Mode)
  useEffect(() => {
    if (previewMode === 'final_cut') return;

    const activeVideo = activeBuffer === 'A' ? videoRefA.current : videoRefB.current;
    const standbyVideo = activeBuffer === 'A' ? videoRefB.current : videoRefA.current;

    if (standbyVideo && !standbyVideo.paused) {
      standbyVideo.pause();
    }

    if (!activeVideo || !currentSegment || isDramaticPause) return;

    const clipElapsed = currentTime - currentSegment.startTime;
    const targetVideoTime = Math.min(4.0, Math.max(0, currentSegment.trimStart + clipElapsed));

    // Only seek active video if drift exceeds 0.3s (prevents stuttering during smooth playback)
    if (Math.abs(activeVideo.currentTime - targetVideoTime) > 0.3) {
      activeVideo.currentTime = targetVideoTime;
    }

    if (isPlaying && activeVideo.paused) {
      activeVideo.play().catch(() => {});
    } else if (!isPlaying && !activeVideo.paused) {
      activeVideo.pause();
    }
  }, [currentTime, currentSegment, isDramaticPause, isPlaying, activeBuffer, previewMode]);

  // Final Cut mode: sync single video player
  useEffect(() => {
    if (previewMode !== 'final_cut') return;
    const masterVideo = masterVideoRef.current;
    if (!masterVideo) return;

    masterVideo.muted = isMuted;

    if (isPlaying && masterVideo.paused) {
      masterVideo.play().catch(() => {});
    } else if (!isPlaying && !masterVideo.paused) {
      masterVideo.pause();
    }
  }, [isPlaying, previewMode, isMuted]);

  // Animation frame loop tracking playback time
  useEffect(() => {
    const tick = () => {
      if (previewMode === 'final_cut') {
        const mv = masterVideoRef.current;
        if (mv) {
          setCurrentTime(mv.currentTime);
          if (mv.currentTime >= 30.0 || mv.ended) {
            mv.pause();
            mv.currentTime = 0;
            setCurrentTime(0);
            setIsPlaying(false);
          } else if (isPlaying) {
            animFrameRef.current = requestAnimationFrame(tick);
          }
        }
      } else {
        const audio = audioRef.current;
        if (audio) {
          setCurrentTime(audio.currentTime);
          if (audio.currentTime >= 30.0 || audio.ended) {
            audio.pause();
            audio.currentTime = 0;
            setCurrentTime(0);
            setIsPlaying(false);
            if (videoRefA.current) {
              videoRefA.current.pause();
              videoRefA.current.currentTime = timelineSegments[0].trimStart;
            }
            if (videoRefB.current) {
              videoRefB.current.pause();
            }
          } else if (isPlaying) {
            animFrameRef.current = requestAnimationFrame(tick);
          }
        }
      }
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, previewMode, timelineSegments]);

  const togglePlay = () => {
    if (previewMode === 'final_cut') {
      const mv = masterVideoRef.current;
      if (!mv) return;

      if (isPlaying) {
        mv.pause();
        setIsPlaying(false);
      } else {
        if (currentTime >= 29.8) {
          mv.currentTime = 0;
          setCurrentTime(0);
        }
        mv.play().then(() => {
          setIsPlaying(true);
        }).catch((e) => {
          console.warn('Final Cut playback prevented:', e);
        });
      }
    } else {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        if (videoRefA.current) videoRefA.current.pause();
        if (videoRefB.current) videoRefB.current.pause();
      } else {
        if (currentTime >= 29.8) {
          audio.currentTime = 0;
          setCurrentTime(0);
        }
        audio.play().then(() => {
          setIsPlaying(true);
          const activeVideo = activeBuffer === 'A' ? videoRefA.current : videoRefB.current;
          if (activeVideo && !isDramaticPause) {
            activeVideo.play().catch(() => {});
          }
        }).catch((e) => {
          console.warn('Audio playback prevented:', e);
        });
      }
    }
  };

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(30.0, newTime));
    setCurrentTime(clamped);

    if (previewMode === 'final_cut') {
      if (masterVideoRef.current) {
        masterVideoRef.current.currentTime = clamped;
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = clamped;
      }

      // Update active video position immediately
      const seg = timelineSegments.find(
        (s) => clamped >= s.startTime && clamped < s.endTime
      );
      if (seg) {
        const segIdx = timelineSegments.indexOf(seg);
        const targetVid = segIdx % 2 === 0 ? videoRefA.current : videoRefB.current;
        if (targetVid) {
          const clipElapsed = clamped - seg.startTime;
          targetVid.currentTime = Math.min(4.0, seg.trimStart + clipElapsed);
        }
      }
    }
  };

  const handleRestart = () => {
    handleSeek(0);
    if (!isPlaying) {
      togglePlay();
    }
  };

  const toggleMute = () => {
    if (previewMode === 'final_cut') {
      if (masterVideoRef.current) {
        masterVideoRef.current.muted = !isMuted;
      }
    } else {
      if (audioRef.current) {
        audioRef.current.muted = !isMuted;
      }
    }
    setIsMuted(!isMuted);
  };

  const resolvedAudioUrl = getMediaUrl(audioTrackUri);
  const resolvedMasterVideoUrl = masterVideoUri ? getMediaUrl(masterVideoUri) : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 transition-colors animate-fadeIn">
      {/* Hidden Audio Player for Multi-Scene Mode */}
      {previewMode === 'individual_scenes' && (
        <audio
          ref={audioRef}
          src={resolvedAudioUrl}
          preload="auto"
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-[#4285F4] border border-blue-500/20 flex items-center gap-1">
              <Music className="w-3 h-3" />
              <span>Step 4 • Auto-Timed Preview</span>
            </span>

            {masterVideoUri && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Final Cut Ready</span>
              </span>
            )}

            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              30-Second Countdown Preview with Music
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {previewMode === 'final_cut'
              ? 'Playing your completed 30-second broadcast Final Cut with embedded music and sound synchronization.'
              : 'Clips are automatically trimmed to match the 30-second soundtrack and beat drop before #6.'}
          </p>
        </div>

        {/* Mode Switcher & Time/Play Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Toggle between Final Cut and Individual Scene Takes if Final Cut exists */}
          {masterVideoUri && (
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  if (isPlaying) togglePlay();
                  setPreviewMode('final_cut');
                }}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewMode === 'final_cut'
                    ? 'bg-[#4285F4] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Film className="w-3 h-3" />
                <span>Final Cut</span>
                {isFinalCutOutdated && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    Outdated
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isPlaying) togglePlay();
                  setPreviewMode('individual_scenes');
                }}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewMode === 'individual_scenes'
                    ? 'bg-[#4285F4] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Scene Takes</span>
              </button>
            </div>
          )}

          {/* Time Counter */}
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs flex items-center gap-2 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-[#4285F4]" />
            <span className="text-slate-700 dark:text-slate-300 font-bold">
              {currentTime.toFixed(1)}s
            </span>
            <span className="text-slate-400">/ 30.0s</span>
          </div>

          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#4285F4] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-95 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white ml-0.5" />
                <span>Play Full 30s Countdown</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Outdated Final Cut Banner */}
      {masterVideoUri && isFinalCutOutdated && previewMode === 'final_cut' && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>Notice:</strong> This Final Cut was generated before recent scene take edits. Switch to <strong>Scene Takes</strong> to preview your new clips, or re-export in the studio below.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isPlaying) togglePlay();
              setPreviewMode('individual_scenes');
            }}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition shrink-0 cursor-pointer"
          >
            Switch to Scene Takes
          </button>
        </div>
      )}

      {/* Main Preview Viewport */}
      <div className="relative aspect-video w-full max-w-4xl mx-auto rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center group select-none">
        {/* MODE 1: Finished Final Cut Mode (Single Continuous 30s MP4) */}
        {previewMode === 'final_cut' && resolvedMasterVideoUrl ? (
          <video
            ref={masterVideoRef}
            src={resolvedMasterVideoUrl}
            playsInline
            muted={isMuted}
            className="w-full h-full object-cover"
          />
        ) : (
          /* MODE 2: Dual-Buffer Ping-Pong Video Player for Individual Scenes (Zero Black Frames) */
          <>
            {/* Visual Poster Backdrop: Active Scene Keyframe Image (Prevents any blank voids) */}
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-slate-950">
              {activeSlot?.currentImageUri ? (
                <img
                  src={getMediaUrl(activeSlot.currentImageUri)}
                  alt={`Scene #${currentSegment?.diegeticNumber}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs text-slate-600 font-mono">
                  Loading scene #{currentSegment?.diegeticNumber || 10}...
                </div>
              )}
            </div>

            {/* Video Buffer A (Active on Even Segments: 10, 8, 6, 4, 2) */}
            {srcA && (
              <video
                key={srcA}
                ref={videoRefA}
                src={srcA}
                muted
                playsInline
                preload="auto"
                onLoadedMetadata={handleLoadedMetadataA}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
                  !isDramaticPause && activeBuffer === 'A'
                    ? 'opacity-100 z-10'
                    : 'opacity-0 z-0 pointer-events-none'
                }`}
              />
            )}

            {/* Video Buffer B (Active on Odd Segments: 9, 7, 5, 3, 1) */}
            {srcB && (
              <video
                key={srcB}
                ref={videoRefB}
                src={srcB}
                muted
                playsInline
                preload="auto"
                onLoadedMetadata={handleLoadedMetadataB}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
                  !isDramaticPause && activeBuffer === 'B'
                    ? 'opacity-100 z-10'
                    : 'opacity-0 z-0 pointer-events-none'
                }`}
              />
            )}

            {/* Dramatic Silence Pause Drop Screen (9.2s -> 10.2s) */}
            {isDramaticPause && (
              <div className="absolute inset-0 z-20 w-full h-full bg-black flex flex-col items-center justify-center text-center p-4 animate-fadeIn">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping mb-3" />
                <span className="font-mono text-xs font-extrabold tracking-widest text-slate-400 uppercase">
                  1.0s Beat Drop • Silence
                </span>
                <span className="text-[11px] text-slate-600 font-mono mt-1">
                  Music resumes with Scene #6
                </span>
              </div>
            )}
          </>
        )}

        {/* Overlay Badges */}
        {!isDramaticPause && currentSegment && (
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono font-bold text-white shadow-lg flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${currentSegment.color}`} />
              <span>Scene #{currentSegment.diegeticNumber}</span>
              <span className="text-slate-400 font-normal">({currentSegment.duration.toFixed(1)}s)</span>
            </span>

            {previewMode === 'final_cut' && (
              <span className={`px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-[10px] font-mono font-bold shadow flex items-center gap-1 ${
                isFinalCutOutdated
                  ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
              }`}>
                {isFinalCutOutdated ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Final Cut (Outdated Takes)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Final Cut</span>
                  </>
                )}
              </span>
            )}
          </div>
        )}

        {/* Quick Click-to-Play Center Overlay when paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 m-auto z-30 w-16 h-16 rounded-full bg-[#4285F4]/90 hover:bg-[#4285F4] text-white flex items-center justify-center shadow-2xl shadow-blue-500/50 transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-sm"
            title="Play Preview"
          >
            <Play className="w-7 h-7 fill-white ml-1" />
          </button>
        )}

        {/* Bottom Floating Bar with Playback Controls */}
        <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
          <button
            type="button"
            onClick={handleRestart}
            className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Restart Countdown"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 30-Second Segmented Timeline Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Timeline Structure (Click any number to jump)
          </span>
          <span className="font-mono text-[11px]">
            Act 1 (10-7) • <strong className="text-slate-700 dark:text-slate-200">1.0s Drop</strong> • Act 2 (6-1)
          </span>
        </div>

        {/* Interactive Scrub Bar */}
        <div
          className="relative h-12 w-full rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex overflow-hidden p-1 gap-1 cursor-pointer select-none"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            handleSeek(ratio * 30.0);
          }}
        >
          {/* Animated Red Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 shadow-[0_0_8px_rgba(244,63,94,0.9)] pointer-events-none transition-all duration-75"
            style={{ left: `${(currentTime / 30.0) * 100}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1 -mt-0.5 shadow-md" />
          </div>

          {/* Act 1: 10, 9, 8, 7 */}
          {timelineSegments.slice(0, 4).map((seg) => {
            const widthPct = (seg.duration / 30.0) * 100;
            const isActive = currentSegment?.diegeticNumber === seg.diegeticNumber;

            return (
              <div
                key={seg.diegeticNumber}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek(seg.startTime);
                  if (onSelectSlot) onSelectSlot(seg.diegeticNumber);
                }}
                style={{ width: `${widthPct}%` }}
                className={`h-full rounded-xl flex flex-col justify-center items-center px-1 transition-all text-white font-mono cursor-pointer ${
                  seg.color
                } ${
                  isActive
                    ? 'ring-2 ring-white shadow-lg brightness-110 scale-[0.98]'
                    : 'opacity-75 hover:opacity-100 hover:brightness-105'
                }`}
                title={`Scene #${seg.diegeticNumber} (${seg.duration.toFixed(1)}s)`}
              >
                <span className="text-xs font-black">#{seg.diegeticNumber}</span>
                <span className="text-[9px] opacity-90">{seg.duration.toFixed(1)}s</span>
              </div>
            );
          })}

          {/* 1.0s Dramatic Pause Drop Slot (Between 7 and 6) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleSeek(9.2);
            }}
            style={{ width: `${(1.0 / 30.0) * 100}%` }}
            className={`h-full rounded-xl border border-dashed border-slate-400 dark:border-slate-700 bg-slate-900 flex flex-col justify-center items-center px-1 text-center cursor-pointer transition-all ${
              isDramaticPause ? 'ring-2 ring-rose-500 brightness-150' : 'opacity-80 hover:opacity-100'
            }`}
            title="1.0s Dramatic Drop Pause (Black Screen Silence)"
          >
            <span className="text-[9px] font-mono font-black text-rose-400">DROP</span>
            <span className="text-[8px] font-mono text-slate-400">1.0s</span>
          </div>

          {/* Act 2: 6, 5, 4, 3, 2, 1 */}
          {timelineSegments.slice(4).map((seg) => {
            const widthPct = (seg.duration / 30.0) * 100;
            const isActive = currentSegment?.diegeticNumber === seg.diegeticNumber;

            return (
              <div
                key={seg.diegeticNumber}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek(seg.startTime);
                  if (onSelectSlot) onSelectSlot(seg.diegeticNumber);
                }}
                style={{ width: `${widthPct}%` }}
                className={`h-full rounded-xl flex flex-col justify-center items-center px-1 transition-all text-white font-mono cursor-pointer ${
                  seg.color
                } ${
                  isActive
                    ? 'ring-2 ring-white shadow-lg brightness-110 scale-[0.98]'
                    : 'opacity-75 hover:opacity-100 hover:brightness-105'
                }`}
                title={`Scene #${seg.diegeticNumber} (${seg.duration.toFixed(1)}s)`}
              >
                <span className="text-xs font-black">#{seg.diegeticNumber}</span>
                <span className="text-[9px] opacity-90">{seg.duration.toFixed(1)}s</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
