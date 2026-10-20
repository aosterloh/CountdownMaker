import React, { useState, useEffect, useRef } from 'react';
import {
  Wand2,
  Sparkles,
  RefreshCw,
  Film,
  Download,
  CheckCircle2,
  Video,
  ChevronRight,
  Layers,
  ChevronDown,
  ChevronUp,
  Play,
  HelpCircle,
} from 'lucide-react';
import { Header } from './components/Header';
import { ThemeInputForm } from './components/ThemeInputForm';
import { SequentialStudio } from './components/SequentialStudio';
import { PromptReviewList } from './components/PromptReviewList';
import { PromptCarousel } from './components/PromptCarousel';
import { GoogleProgressBar } from './components/GoogleProgressBar';
import { SlotCard } from './components/SlotCard';
import { WaveformTimeline } from './components/WaveformTimeline';
import { SimplifiedAudioPreview } from './components/SimplifiedAudioPreview';
import { RefineModal } from './components/RefineModal';
import { FinalCutExportStudio } from './components/FinalCutExportStudio';
import { BulkVideoProgressPanel } from './components/BulkVideoProgressPanel';
import { SingleClipFixer } from './components/SingleClipFixer';
import { GoogleAuthGate } from './components/GoogleAuthGate';
import { PromptGuideModal } from './components/PromptGuideModal';
import { RecentMastersCarousel } from './components/RecentMastersCarousel';
import { WelcomeGuideModal } from './components/WelcomeGuideModal';
import { StepGuideModal, StepGuideId } from './components/StepGuideModal';
import { CountdownSlot, ImageModelType, VeoModelType, AuthMode, SlotTemporalConfig, VideoQualityMode, UpscaleEngineType, JobSummary, VeoQueueStatus, GroundingMetadata, RenderMetrics } from './types';
import { UNIVERSAL_STYLE_ANCHOR } from './utils/promptBuilder';
import { calculateTimelineOffsets, getDefaultTemporalConfigForSlot } from './utils/temporalMath';
import { playPromptChime, playStepSuccessChime, playGrandFinaleChime, setSoundEnabled as setAudioSoundEnabled } from './utils/audioChimes';
import { startTitlePulsing, sendDesktopNotification, requestNotificationPermission } from './utils/browserNotifications';
import { getMediaUrl } from './utils/media';
import { extractTimestampFromUri, getLatestSlotVideoTimestamp } from './utils/videoTimeline';
import { ExpressDirectorView } from './components/ExpressDirectorView';
import { requestYouTubeAccessToken, getCachedYouTubeToken } from './utils/youtubeAuth';

const API_BASE = window.location.port === '5173' ? 'http://localhost:3001' : '';

export const App: React.FC = () => {
  // Authentication State: Corporate Protected Application Access
  const [authUser, setAuthUser] = useState<{ email: string; name: string; ldap?: string; picture?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
      return null;
    } catch {
      return null;
    }
  });

  // Theme State: Default to Light Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme_mode');
    return saved ? saved === 'dark' : false;
  });

  // Audio Chimes Sound State: Default to Sound ON
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('sound_enabled');
    const enabled = saved !== null ? saved === 'true' : true;
    setAudioSoundEnabled(enabled);
    return enabled;
  });

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setAudioSoundEnabled(next);
    localStorage.setItem('sound_enabled', String(next));
  };

  // Persistent GCS Multi-User Job Management State
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobsList, setJobsList] = useState<JobSummary[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Settings State: Default to Active Project aosterloh-cs-muc
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [authMode, setAuthMode] = useState<AuthMode>('ADC');
  const [selectedModel, setSelectedModel] = useState<ImageModelType>('gemini-nano-banana-2.1');
  const [selectedVeoModel, setSelectedVeoModel] = useState<VeoModelType>('veo-3.1-generate-preview');
  const [selectedVideoQuality, setSelectedVideoQuality] = useState<VideoQualityMode>('FULL_4K');

  // Welcome Guide Onboarding Modal State (Explains the 3 simple steps on Google Blue background)
  const [showWelcomeGuide, setShowWelcomeGuide] = useState<boolean>(() => {
    try {
      const dismissed = localStorage.getItem('dismissed_welcome_guide');
      const hasAuth = Boolean(localStorage.getItem('auth_user'));
      return dismissed !== 'true' && hasAuth;
    } catch {
      return false;
    }
  });

  const handleCloseWelcomeGuide = (dontShowAgain?: boolean) => {
    setShowWelcomeGuide(false);
    if (dontShowAgain) {
      localStorage.setItem('dismissed_welcome_guide', 'true');
    }
  };

  // Step Guide Modal State (Explains what is happening at each new step on Google Blue background)
  const [activeStepGuideId, setActiveStepGuideId] = useState<StepGuideId | null>(null);
  const [hasSeenStepGuides, setHasSeenStepGuides] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('seen_step_guides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleOpenStepGuide = (stepId: StepGuideId) => {
    setActiveStepGuideId(stepId);
  };

  const handleCloseStepGuide = (dontShowAgain?: boolean) => {
    if (activeStepGuideId) {
      const nextSeen = { ...hasSeenStepGuides, [activeStepGuideId]: true };
      setHasSeenStepGuides(nextSeen);
      try {
        localStorage.setItem('seen_step_guides', JSON.stringify(nextSeen));
      } catch {}
    }
    if (dontShowAgain) {
      try {
        localStorage.setItem('countdown_hide_step_tips', 'true');
      } catch {}
    }
    setActiveStepGuideId(null);
  };

  // Helper to trigger guide for step automatically if not disabled
  const triggerStepGuideIfUnseen = (stepId: StepGuideId) => {
    try {
      const hideAll = localStorage.getItem('countdown_hide_step_tips') === 'true';
      if (hideAll) return;
      if (!hasSeenStepGuides[stepId]) {
        setActiveStepGuideId(stepId);
      }
    } catch {}
  };

  // Veo Prompt Guide (User-editable with per-user LocalStorage isolation)
  const [showPromptGuideModal, setShowPromptGuideModal] = useState<boolean>(false);
  const [customPromptGuide, setCustomPromptGuide] = useState<string>(() => {
    return localStorage.getItem('veo_custom_prompt_guide') || '';
  });
  const [defaultPromptGuide, setDefaultPromptGuide] = useState<string>('');

  useEffect(() => {
    // Fetch default prompt guide once for comparison and reset
    fetch(`${API_BASE}/api/veo-prompt-guide/default`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.content) {
          setDefaultPromptGuide(data.content);
        }
      })
      .catch((err) => console.warn('Failed to load default prompt guide:', err));

    // Auto-authenticate if deployed behind Google Identity-Aware Proxy (IAP)
    let isMounted = true;
    fetch(`${API_BASE}/api/auth/me`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.authenticated && data.authMethod === 'iap' && data.user) {
          const validUser = {
            email: data.user.email,
            name: data.user.name || data.user.ldap,
            ldap: data.user.ldap,
          };
          setAuthUser(validUser);
          setCreatorLdap(data.user.ldap);
          localStorage.setItem('auth_user', JSON.stringify(validUser));
          if (localStorage.getItem('dismissed_welcome_guide') !== 'true') {
            setShowWelcomeGuide(true);
          }
        }
      })
      .catch((err) => console.warn('IAP session check:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveCustomPromptGuide = (newContent: string) => {
    localStorage.setItem('veo_custom_prompt_guide', newContent);
    setCustomPromptGuide(newContent);
  };

  const handleResetCustomPromptGuide = () => {
    localStorage.removeItem('veo_custom_prompt_guide');
    setCustomPromptGuide('');
  };

  // Multi-step Workflow State (1 to 5)
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Automatically trigger Google Blue step explainer for new stages
  useEffect(() => {
    if (currentStage === 2) {
      triggerStepGuideIfUnseen('step-2');
    } else if (currentStage === 3) {
      triggerStepGuideIfUnseen('step-4');
    }
  }, [currentStage]);
  const [brandName, setBrandName] = useState<string>('');
  const [companyUrl, setCompanyUrl] = useState<string>('');
  const [themeContext, setThemeContext] = useState<string>('');
  const [styleModifiers, setStyleModifiers] = useState<string>('');


  // Director Mode: 'express' (1-click autonomous autopilot) vs 'expert' (deep granular control)
  const [directorMode, setDirectorMode] = useState<'express' | 'expert'>(() => {
    try {
      const saved = localStorage.getItem('countdown_director_mode');
      if (saved === 'expert' || saved === 'express') return saved;
    } catch {}
    return 'express';
  });

  const handleDirectorModeChange = (mode: 'express' | 'expert') => {
    setDirectorMode(mode);
    try {
      localStorage.setItem('countdown_director_mode', mode);
    } catch {}
  };

  // YouTube Unlisted Auto-Upload State
  const [autoUploadYouTube, setAutoUploadYouTube] = useState<boolean>(() => {
    try {
      return localStorage.getItem('countdown_auto_upload_youtube') === 'true';
    } catch {
      return false;
    }
  });

  const handleAutoUploadYouTubeChange = (val: boolean) => {
    setAutoUploadYouTube(val);
    try {
      localStorage.setItem('countdown_auto_upload_youtube', String(val));
    } catch {}
  };

  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [isUploadingYouTube, setIsUploadingYouTube] = useState<boolean>(false);
  const [youtubeUploadError, setYoutubeUploadError] = useState<string | null>(null);
  const isAutopilotRunningRef = useRef<boolean>(false);

  const [creatorLdap, setCreatorLdap] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        const user = JSON.parse(saved);
        const email = (user.email || '').trim().toLowerCase();
        if (email && email.endsWith('@google.com') && email !== 'user@google.com') {
          return email;
        }
        if (user.ldap && user.ldap !== 'user' && !user.ldap.includes('@')) {
          return `${user.ldap}@google.com`;
        }
      }
    } catch {}
    return '';
  });

  // Feature Selectors & Deliverables State (Customer Meeting Package)
  const [includeCinemaWallpaper, setIncludeCinemaWallpaper] = useState<boolean>(true);
  const [includeBugdroidMascot, setIncludeBugdroidMascot] = useState<boolean>(true);
  const [includeCountdownVideo, setIncludeCountdownVideo] = useState<boolean>(true);

  const [cinemaWallpaperUri, setCinemaWallpaperUri] = useState<string | null>(null);
  const [bugdroidMascotUri, setBugdroidMascotUri] = useState<string | null>(null);
  const [isGeneratingWallpaper, setIsGeneratingWallpaper] = useState<boolean>(false);
  const [isGeneratingBugdroid, setIsGeneratingBugdroid] = useState<boolean>(false);
  const [wallpaperError, setWallpaperError] = useState<string | null>(null);
  const [bugdroidError, setBugdroidError] = useState<string | null>(null);
  const [customerIndustry, setCustomerIndustry] = useState<string>('');
  const [wallpaperPrompt, setWallpaperPrompt] = useState<string>('');
  const [bugdroidPrompt, setBugdroidPrompt] = useState<string>('');

  function createInitialSlots(): CountdownSlot[] {
    return Array.from({ length: 10 }, (_, i) => {
      const idx = 10 - i;
      return {
        index: idx,
        diegeticNumber: idx,
        sceneConcept: idx === 10 ? 'Shot #10' : `Pending (Shot #${idx})`,
        startImagePrompt: '',
        imagePrompt: '',
        endImagePrompt: '',
        videoPrompt: '',
        isPromptApproved: false,
        isPromptRecreating: false,
        currentImageUri: null,
        startImageUri: null,
        endImageUri: null,
        historyImageUri: null,
        isImageAccepted: false,
        isImageLoading: false,
        isEndImageLoading: false,
        imageError: null,
        endImageError: null,
        rawVideoUri: null,
        isVideoLoading: false,
        videoError: null,
        temporalConfig: getDefaultTemporalConfigForSlot(idx),
        processedVideoUri: null,
      };
    });
  }

  // Countdown Slots (10 down to 1)
  const [slots, setSlots] = useState<CountdownSlot[]>(createInitialSlots);
  const currentJobIdRef = useRef<string | null>(currentJobId);
  currentJobIdRef.current = currentJobId;
  const slotsRef = useRef<CountdownSlot[]>(slots);
  slotsRef.current = slots;

  // Global Loading States
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isBatchGeneratingImages, setIsBatchGeneratingImages] = useState(false);
  const [generationStatusText, setGenerationStatusText] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Modal States
  const [activeRefineSlot, setActiveRefineSlot] = useState<CountdownSlot | null>(null);
  const [previewVideoUri, setPreviewVideoUri] = useState<string | null>(null);
  const [isExportingMaster, setIsExportingMaster] = useState(false);
  const [masterVideoUri, setMasterVideoUri] = useState<string | null>(null);
  const [master720pUri, setMaster720pUri] = useState<string | null>(null);
  const [master4kUri, setMaster4kUri] = useState<string | null>(null);
  const [extendedMasterVideoUri, setExtendedMasterVideoUri] = useState<string | null>(null);
  const [extended720pUri, setExtended720pUri] = useState<string | null>(null);
  const [extended4kUri, setExtended4kUri] = useState<string | null>(null);
  const [isExportingExtendedMaster, setIsExportingExtendedMaster] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [projectRenderMetrics, setProjectRenderMetrics] = useState<RenderMetrics | undefined>(undefined);

  // Veo 3 Queue Status State (tracks server-side 2 parallel workers and waiting queue)
  const [veoQueueStatus, setVeoQueueStatus] = useState<VeoQueueStatus>({
    activeWorkers: [],
    activeCount: 0,
    maxWorkers: 2,
    queue: [],
    queueLength: 0,
  });

  // Google Search Grounding Metadata State
  const [groundingMetadata, setGroundingMetadata] = useState<GroundingMetadata | null>(null);
  const [geminiModelUsed, setGeminiModelUsed] = useState<string>('gemini-4-argon');

  const pollVeoQueueStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/veo-queue-status`);
      const data = await res.json();
      if (data.success) {
        setVeoQueueStatus({
          activeWorkers: data.activeWorkers || [],
          activeCount: data.activeCount || 0,
          maxWorkers: data.maxWorkers || 2,
          queue: data.queue || [],
          queueLength: data.queueLength || 0,
        });
      }
    } catch {
      // Ignore background poll errors
    }
  };

  useEffect(() => {
    const isAnyVideoLoading = slots.some((s) => s.isVideoLoading);
    const shouldPoll = isAnyVideoLoading || veoQueueStatus.activeCount > 0 || veoQueueStatus.queueLength > 0;

    pollVeoQueueStatus();
    if (!shouldPoll) return;

    const interval = setInterval(pollVeoQueueStatus, 1500);
    return () => clearInterval(interval);
  }, [slots, veoQueueStatus.activeCount, veoQueueStatus.queueLength]);

  // GCS Job Management Handlers
  const fetchJobsList = async () => {
    setIsLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE}/api/jobs`);
      const data = await res.json();
      if (data.success && data.jobs) {
        setJobsList(data.jobs);
        return data.jobs as JobSummary[];
      }
    } catch (e) {
      console.warn('Failed to fetch jobs from GCS:', e);
    } finally {
      setIsLoadingJobs(false);
    }
    return [];
  };

  const loadJob = async (jobIdToLoad: string) => {
    setIsLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobIdToLoad}`);
      const data = await res.json();
      if (data.success && data.job) {
        const j = data.job;
        setCurrentJobId(j.jobId);
        setBrandName(j.customerName || '');
        setCompanyUrl((j as any).companyUrl || '');
        setThemeContext(j.creativeTheme || '');
        if (j.creatorLdap) setCreatorLdap(j.creatorLdap);
        if (j.styleModifiers !== undefined) setStyleModifiers(j.styleModifiers);
        if (j.selectedModel) setSelectedModel(j.selectedModel);
        if (j.selectedVideoQuality) setSelectedVideoQuality(j.selectedVideoQuality);
        if (j.currentStage) setCurrentStage(j.currentStage);
        if (j.slots && j.slots.length > 0) setSlots(j.slots);
        setMasterVideoUri(j.masterVideoUri || null);
        setMaster720pUri(j.master720pUri || null);
        setMaster4kUri(j.master4kUri || null);
        setExtendedMasterVideoUri(j.extendedMasterVideoUri || null);
        setExtended720pUri(j.extended720pUri || null);
        setExtended4kUri(j.extended4kUri || null);
        setProjectRenderMetrics(j.renderMetrics);
        if (j.groundingMetadata) setGroundingMetadata(j.groundingMetadata);
        if (j.geminiModelUsed) setGeminiModelUsed(j.geminiModelUsed);

        // Update URL query parameter
        const url = new URL(window.location.href);
        url.searchParams.set('job', j.jobId);
        window.history.replaceState({}, '', url.toString());
        return true;
      }
    } catch (e) {
      console.error(`Failed to load job ${jobIdToLoad}:`, e);
    } finally {
      setIsLoadingJobs(false);
    }
    return false;
  };

  const createAndSelectNewJob = async (
    customer: string = '',
    theme: string = '',
    ldap: string = ''
  ) => {
    setIsLoadingJobs(true);
    try {
      const initialSlots: CountdownSlot[] = Array.from({ length: 10 }, (_, i) => {
        const idx = 10 - i;
        return {
          index: idx,
          diegeticNumber: idx,
          sceneConcept: `Diegetic scene for #${idx}`,
          imagePrompt: '',
          isPromptApproved: true,
          isPromptRecreating: false,
          currentImageUri: null,
          historyImageUri: null,
          isImageAccepted: false,
          isImageLoading: false,
          imageError: null,
          rawVideoUri: null,
          isVideoLoading: false,
          videoError: null,
          temporalConfig: getDefaultTemporalConfigForSlot(idx),
          processedVideoUri: null,
        };
      });

      const effectiveLdap = ldap || creatorLdap || '';
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer || 'New Project',
          creatorLdap: effectiveLdap,
          creativeTheme: theme,
          selectedModel,
          selectedVideoQuality,
          currentStage: 1,
          slots: initialSlots,
        }),
      });

      const data = await res.json();
      if (data.success && data.job) {
        setCurrentJobId(data.job.jobId);
        setBrandName(customer);
        setThemeContext(theme);
        if (effectiveLdap) setCreatorLdap(effectiveLdap);
        setCurrentStage(1);
        setSlots(initialSlots);
        setMasterVideoUri(null);
        setMaster720pUri(null);
        setMaster4kUri(null);
        setExtendedMasterVideoUri(null);
        setExtended720pUri(null);
        setExtended4kUri(null);
        setCinemaWallpaperUri(null);
        setBugdroidMascotUri(null);
        setIsGeneratingWallpaper(false);
        setIsGeneratingBugdroid(false);
        setWallpaperError(null);
        setBugdroidError(null);
        setCustomerIndustry('');
        setWallpaperPrompt('');
        setBugdroidPrompt('');
        setProjectRenderMetrics(undefined);
        setGlobalError(null);

        // Update URL query parameter
        const url = new URL(window.location.href);
        url.searchParams.set('job', data.job.jobId);
        window.history.replaceState({}, '', url.toString());

        await fetchJobsList();
        return data.job;
      }
    } catch (e) {
      console.error('Failed to create new job in GCS:', e);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Initial Load: URL Deep Linking or Clean Fresh Project
  useEffect(() => {
    const initAppJob = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlJobId = urlParams.get('job');
      await fetchJobsList();

      // Only load a past job if explicitly specified via ?job= query parameter
      if (urlJobId) {
        await loadJob(urlJobId);
      }
    };

    initAppJob();
  }, []);

  // Continuous Debounced Auto-Save to GCS
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!currentJobId) return;

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${currentJobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: brandName,
            companyUrl: companyUrl || undefined,
            creatorLdap,
            creativeTheme: themeContext,
            styleModifiers,
            selectedModel,
            selectedVideoQuality,
            currentStage,
            slots,
            masterVideoUri,
            master720pUri,
            master4kUri,
            extendedMasterVideoUri,
            extended720pUri,
            extended4kUri,
            renderMetrics: projectRenderMetrics || null,
            groundingMetadata,
            geminiModelUsed,
          }),
        });

        if (res.ok) {
          setSaveStatus('saved');
          setJobsList((prev) =>
            prev.map((j) =>
              j.jobId === currentJobId
                ? {
                    ...j,
                    customerName: brandName,
                    creatorLdap,
                    creativeTheme: themeContext,
                    currentStage,
                    readyImagesCount: slots.filter((s) => Boolean(s.currentImageUri)).length,
                    readyVideosCount: slots.filter((s) => Boolean(s.rawVideoUri)).length,
                    hasMasterVideo: Boolean(masterVideoUri || master720pUri || master4kUri),
                    updatedAt: new Date().toISOString(),
                  }
                : j
            )
          );
        } else {
          setSaveStatus('error');
        }
      } catch (e) {
        setSaveStatus('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    currentJobId,
    brandName,
    companyUrl,
    creatorLdap,
    themeContext,
    styleModifiers,
    selectedModel,
    selectedVideoQuality,
    currentStage,
    slots,
    masterVideoUri,
    master720pUri,
    master4kUri,
    extendedMasterVideoUri,
    extended720pUri,
    extended4kUri,
    projectRenderMetrics,
  ]);

  const handleSelectJob = (jobId: string) => {
    loadJob(jobId);
  };

  const handleCreateNewJob = () => {
    createAndSelectNewJob('', '', creatorLdap);
  };

  const handleDeleteJob = async (jobIdToDelete: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobIdToDelete}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setJobsList((prev) => prev.filter((j) => j.jobId !== jobIdToDelete));
        if (jobIdToDelete === currentJobId) {
          setCurrentJobId(null);
          setBrandName('');
          setThemeContext('');
          setCurrentStage(1);
          setMasterVideoUri(null);
          setSlots(
            Array.from({ length: 10 }, (_, i) => ({
              index: 10 - i,
              diegeticNumber: 10 - i,
              sceneConcept: `Diegetic scene for #${10 - i}`,
              imagePrompt: '',
              isPromptApproved: true,
              isPromptRecreating: false,
              currentImageUri: null,
              historyImageUri: null,
              isImageAccepted: false,
              isImageLoading: false,
              imageError: null,
              rawVideoUri: null,
              isVideoLoading: false,
              videoError: null,
              temporalConfig: getDefaultTemporalConfigForSlot(10 - i),
              processedVideoUri: null,
            }))
          );
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    } catch (err) {
      console.error(`Failed to delete job ${jobIdToDelete}:`, err);
    }
  };

  const handleBulkDeleteAllJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await fetchJobsList();
        setCurrentJobId(null);
        setCurrentStage(1);
        setBrandName('');
        setThemeContext('');
        setSlots(createInitialSlots());
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err) {
      console.error('Failed to bulk delete all jobs:', err);
    }
  };

  // Sync theme with document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme_mode', 'light');
    }
  }, [isDarkMode]);

  // Only expose bulk create option after user has generated the 1st video (Shot #10)
  const isSlot10VideoReady = Boolean(
    slots.find((s) => s.diegeticNumber === 10 || s.index === 10)?.rawVideoUri ||
    slots.find((s) => s.diegeticNumber === 10 || s.index === 10)?.processedVideoUri
  );

  const handleApiKeyChange = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('gemini_api_key', newKey);
  };

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Helper: Safely parse JSON responses or extract plain-text errors without SyntaxError
  const parseResponseJson = async (res: Response, fallbackError: string): Promise<any> => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || `${fallbackError} (HTTP ${res.status})`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text || fallbackError);
    }
  };

  // Helper: Bounded Parallel Worker Pool (Concurrency = 2)
  const runWorkerPool = async <T,>(
    items: T[],
    concurrency: number,
    workerFn: (item: T, itemIdx: number) => Promise<boolean>
  ): Promise<boolean> => {
    let cursor = 0;
    let hasFailure = false;

    const worker = async (): Promise<void> => {
      while (cursor < items.length && !hasFailure) {
        const itemIndex = cursor++;
        const item = items[itemIndex];
        const success = await workerFn(item, itemIndex);
        if (!success) {
          hasFailure = true;
          break;
        }
      }
    };

    const workerCount = Math.min(concurrency, items.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);
    return !hasFailure;
  };

  // 1. Initialize Countdown with Single-Shot #10 Prompt (Stage 1 -> Stage 2)
  const handleGeneratePrompts = async (brand: string, theme: string, styleAnchor: string, ldap: string, url?: string) => {
    setBrandName(brand);
    if (url) setCompanyUrl(url);
    setThemeContext(theme);
    setCreatorLdap(ldap);
    if (ldap && ldap.endsWith('@google.com')) {
      try {
        const updatedAuth = {
          email: ldap,
          name: ldap.split('@')[0],
          ldap: ldap.split('@')[0],
        };
        setAuthUser(updatedAuth);
        localStorage.setItem('auth_user', JSON.stringify(updatedAuth));
      } catch {}
    }
    setIsGeneratingPrompts(true);
    setGlobalError(null);
    setGenerationStatusText('Synthesizing Shot #10 Prompt Concept with Gemini...');

    // Reset slots (10 initialized, 9..1 pending)
    const freshSlots: CountdownSlot[] = Array.from({ length: 10 }, (_, i) => {
      const idx = 10 - i;
      return {
        index: idx,
        diegeticNumber: idx,
        sceneConcept: idx === 10 ? `Initializing Shot #10...` : `Pending (Shot #${idx})`,
        startImagePrompt: '',
        imagePrompt: '',
        endImagePrompt: '',
        videoPrompt: '',
        isPromptApproved: false,
        isPromptRecreating: idx === 10,
        currentImageUri: null,
        startImageUri: null,
        endImageUri: null,
        historyImageUri: null,
        isImageAccepted: false,
        isImageLoading: false,
        isEndImageLoading: false,
        imageError: null,
        endImageError: null,
        rawVideoUri: null,
        isVideoLoading: false,
        videoError: null,
        temporalConfig: getDefaultTemporalConfigForSlot(idx),
        processedVideoUri: null,
      };
    });
    setSlots(freshSlots);

    // Invalidate all previous master cut exports and benchmarks immediately upon prompt regeneration
    setMasterVideoUri(null);
    setMaster720pUri(null);
    setMaster4kUri(null);
    setExtendedMasterVideoUri(null);
    setExtended720pUri(null);
    setExtended4kUri(null);
    setProjectRenderMetrics(undefined);

    // Ensure Job ID matches the customer brand name so URL query param is accurate
    const sanitizedBrand = (brand || '').trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Project';
    if (!currentJobId || !currentJobId.startsWith(sanitizedBrand)) {
      try {
        const createRes = await fetch(`${API_BASE}/api/jobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: brand || 'Project',
            companyUrl: url || companyUrl || undefined,
            creatorLdap: ldap,
            creativeTheme: theme,
            selectedModel,
            selectedVideoQuality,
            currentStage: 1,
            slots: freshSlots,
          }),
        });
        const createData = await createRes.json();
        if (createData.success && createData.job) {
          const newJobId = createData.job.jobId;
          currentJobIdRef.current = newJobId;
          setCurrentJobId(newJobId);
          const urlObj = new URL(window.location.href);
          urlObj.searchParams.set('job', newJobId);
          window.history.replaceState({}, '', urlObj.toString());
          await fetchJobsList();
        }
      } catch (e) {
        console.warn('Failed to sync job ID for brand:', e);
      }
    } else {
      // Existing job for same brand: immediately flush invalidated master cut state to GCS
      try {
        await fetch(`${API_BASE}/api/jobs/${currentJobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: brand || 'Project',
            companyUrl: url || companyUrl || undefined,
            creatorLdap: ldap,
            creativeTheme: theme,
            currentStage: 2,
            slots: freshSlots,
            masterVideoUri: null,
            master720pUri: null,
            master4kUri: null,
            extendedMasterVideoUri: null,
            extended720pUri: null,
            extended4kUri: null,
            renderMetrics: null,
          }),
        });
      } catch (e) {
        console.warn('Failed to reset job state on GCS:', e);
      }
    }

    try {
      // Call unified 10-shot prompt generator (Option A) with Gemini 3.8 Flash & Google Search Grounding
      const res = await fetch(`${API_BASE}/api/generate-diegetic-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: brand,
          companyUrl: url || companyUrl || undefined,
          themeContext: theme,
          apiKey,
          customPromptRules: customPromptGuide || undefined,
        }),
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.prompts) && data.prompts.length > 0) {
        if (data.groundingMetadata) {
          setGroundingMetadata(data.groundingMetadata);
        }
        if (data.model) {
          setGeminiModelUsed(data.model);
        }

        const promptsMap = new Map<number, any>();
        data.prompts.forEach((p: any) => {
          const num = Number(p.diegeticNumber) || Number(p.index);
          promptsMap.set(num, p);
        });

        const updatedSlots = freshSlots.map((slot) => {
          const item = promptsMap.get(slot.diegeticNumber);
          if (!item) return slot;
          return {
            ...slot,
            sceneConcept: item.concept || `Shot #${slot.diegeticNumber} Scene`,
            objectEmbedding: item.objectEmbedding,
            revealMechanism: item.revealMechanism,
            startImagePrompt: item.startImagePrompt || item.imagePrompt,
            imagePrompt: item.startImagePrompt || item.imagePrompt,
            endImagePrompt: item.endImagePrompt,
            videoPrompt: item.videoPrompt,
            isPromptApproved: true,
            isPromptRecreating: false,
            rawVideoUri: null,
            processedVideoUri: null,
            videoAnalysis: undefined,
            videoError: null,
          };
        });

        slotsRef.current = updatedSlots;
        setSlots(updatedSlots);
        setCurrentStage(2); // Advance directly to Stage 2 (Bulk Video Generation)
        setActiveSequentialSlot(10);
        playPromptChime();
        // Immediately trigger bulk video generation with Veo 3.1 Fast (2 Parallel Workers) with forceAll = true
        handleGenerateAllVideos(selectedVideoQuality, updatedSlots, true);
      } else {
        setGlobalError(data.error || 'Failed to synthesize prompts for all 10 scenes');
      }
    } catch (err: any) {
      console.error('Failed to generate prompt for Shot #10:', err);
      setGlobalError(err.message);
    } finally {
      setIsGeneratingPrompts(false);
      setGenerationStatusText('');
    }
  };

  // Sequential Studio Active Slot (10 down to 1)
  const [activeSequentialSlot, setActiveSequentialSlot] = useState<number>(10);

  // 2. Prompt Review Handlers (Stage 2)
  const handleUpdatePrompt = (
    slotIndex: number,
    newPrompt: string,
    newConcept?: string,
    newVideoPrompt?: string,
    newEndPrompt?: string
  ) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? {
              ...s,
              imagePrompt: newPrompt,
              startImagePrompt: newPrompt,
              endImagePrompt: newEndPrompt !== undefined ? newEndPrompt : s.endImagePrompt,
              videoPrompt: newVideoPrompt !== undefined ? newVideoPrompt : s.videoPrompt,
              sceneConcept: newConcept || s.sceneConcept,
              isPromptApproved: true,
            }
          : s
      )
    );
  };

  const handleUpdateEndPrompt = (slotIndex: number, newEndPrompt: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? {
              ...s,
              endImagePrompt: newEndPrompt,
            }
          : s
      )
    );
  };

  const handleUpdateVideoPrompt = (slotIndex: number, newVideoPrompt: string) => {
    setMasterVideoUri(null);
    setMaster720pUri(null);
    setMaster4kUri(null);
    setExtendedMasterVideoUri(null);
    setExtended720pUri(null);
    setExtended4kUri(null);
    setProjectRenderMetrics(undefined);

    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? {
              ...s,
              videoPrompt: newVideoPrompt,
              processedVideoUri: null,
            }
          : s
      )
    );
  };

  const handleRecreatePrompt = async (slotIndex: number, customVisualIdea?: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isPromptRecreating: true } : s))
    );

    const previousShots = slots
      .filter((s) => s.diegeticNumber > slotIndex && s.videoPrompt && !s.videoPrompt.startsWith('Pending'))
      .map((s) => ({
        index: s.index,
        diegeticNumber: s.diegeticNumber,
        concept: s.sceneConcept,
        objectEmbedding: s.objectEmbedding,
        revealMechanism: s.revealMechanism,
        videoPrompt: s.videoPrompt,
        startImagePrompt: s.startImagePrompt,
        endImagePrompt: s.endImagePrompt,
      }));

    try {
      const res = await fetch(`${API_BASE}/api/recreate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diegeticNumber: slotIndex,
          brandName,
          themeContext,
          previousShots,
          customVisualIdea,
          apiKey,
          customPromptRules: customPromptGuide || undefined,
        }),
      });
      const data = await res.json();

      if (data.success && data.prompt) {
        const item = data.prompt;
        if (data.groundingMetadata) {
          setGroundingMetadata(data.groundingMetadata);
        }
        if (data.model) {
          setGeminiModelUsed(data.model);
        }
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? {
                  ...s,
                  sceneConcept: item.concept,
                  objectEmbedding: item.objectEmbedding,
                  revealMechanism: item.revealMechanism,
                  startImagePrompt: item.startImagePrompt || item.imagePrompt,
                  imagePrompt: item.startImagePrompt || item.imagePrompt,
                  endImagePrompt: item.endImagePrompt,
                  videoPrompt: item.videoPrompt,
                  isPromptApproved: true,
                  isPromptRecreating: false,
                }
              : s
          )
        );
      }
    } catch (err) {
      console.error('Failed to recreate prompt:', err);
      setSlots((prev) =>
        prev.map((s) => (s.index === slotIndex ? { ...s, isPromptRecreating: false } : s))
      );
    }
  };

  const handleToggleApprovePrompt = (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isPromptApproved: !s.isPromptApproved } : s))
    );
  };

  const handleRefinePromptWithComment = async (slotIndex: number, comment: string) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    if (!targetSlot) return;

    try {
      const res = await fetch(`${API_BASE}/api/refine-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIndex,
          currentPrompt: targetSlot.videoPrompt,
          feedback: comment,
          brandName,
          themeContext,
          apiKey,
        }),
      });
      const data = await res.json();
      if (data.success && data.updatedPrompt) {
        if (data.model) {
          setGeminiModelUsed(data.model);
        }
        playPromptChime();
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? {
                  ...s,
                  videoPrompt: data.updatedPrompt,
                  isPromptApproved: true,
                }
              : s
          )
        );
      }
    } catch (err) {
      console.error('Failed to refine prompt:', err);
    }
  };

  const handleRedoPromptFromScratch = async (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? {
              ...s,
              rawVideoUri: null,
              processedVideoUri: null,
              videoError: null,
            }
          : s
      )
    );
    await handleRecreatePrompt(slotIndex);
  };

  const handleApproveAllPrompts = () => {
    setSlots((prev) => prev.map((s) => ({ ...s, isPromptApproved: true })));
  };

  // Proceed to Image Generation (Stage 2 -> Stage 3: Synthesize Start & End Keyframes)
  const handleProceedToImageGeneration = async () => {
    setCurrentStage(3);
    setIsBatchGeneratingImages(true);
    setGlobalError(null);

    const sortedSlots = [...slots].sort((a, b) => b.diegeticNumber - a.diegeticNumber);
    setGenerationStatusText('Synthesizing Frame 1 (Start) & Frame N (End with Numeral) keyframe pairs with 2 parallel workers...');

    await runWorkerPool(sortedSlots, 2, async (slot, idx) => {
      setGenerationStatusText(`Synthesizing Keyframe Pair for Shot #${slot.diegeticNumber} (${idx + 1}/10)...`);
      const startPrompt = slot.startImagePrompt || slot.imagePrompt;
      const endPrompt = slot.endImagePrompt || `A tight cinematic hero shot focused on ${slot.objectEmbedding || 'carrier surface'}. The physical countdown numeral '${slot.diegeticNumber}' is authentically crafted in sharp center focus.`;

      const startOk = await generateImageForSlot(slot.diegeticNumber, startPrompt, brandName, 'start');
      const endOk = await generateImageForSlot(slot.diegeticNumber, endPrompt, brandName, 'end');
      return startOk && endOk;
    });

    setIsBatchGeneratingImages(false);
    setGenerationStatusText('');
  };

  // Single Slot Image Generation (Supports 'start' Frame 1 and 'end' Frame N)
  const generateImageForSlot = async (
    slotIndex: number,
    promptText?: string,
    brand?: string,
    frameType: 'start' | 'end' = 'start'
  ): Promise<boolean> => {
    const isEnd = frameType === 'end';
    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? isEnd
            ? { ...s, isEndImageLoading: true, endImageError: null }
            : { ...s, isImageLoading: true, imageError: null }
          : s
      )
    );

    const targetSlot = slots.find((s) => s.index === slotIndex);
    const effectivePrompt =
      promptText ||
      (isEnd
        ? targetSlot?.endImagePrompt || `Hero close-up shot revealing physical countdown numeral '${slotIndex}'`
        : targetSlot?.startImagePrompt || targetSlot?.imagePrompt || '');

    try {
      const res = await fetch(`${API_BASE}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIndex,
          prompt: effectivePrompt,
          brandName: brand || brandName,
          model: selectedModel,
          apiKey,
          authMode,
          jobId: currentJobId,
        }),
      });
      const data = await res.json();

      if (data.success && data.imageUri) {
        playStepSuccessChime();
        setSlots((prev) =>
          prev.map((s) => {
            if (s.index === slotIndex) {
              if (isEnd) {
                return {
                  ...s,
                  endImageUri: data.imageUri,
                  isEndImageLoading: false,
                  endImageError: null,
                };
              }
              return {
                ...s,
                historyImageUri: s.currentImageUri,
                currentImageUri: data.imageUri,
                startImageUri: data.imageUri,
                isImageLoading: false,
                imageError: null,
              };
            }
            return s;
          })
        );
        return true;
      } else {
        const errMsg = data.error || `Failed to generate ${frameType} image for Shot #${slotIndex}`;
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? isEnd
                ? { ...s, isEndImageLoading: false, endImageError: errMsg }
                : { ...s, isImageLoading: false, imageError: errMsg }
              : s
          )
        );
        setGlobalError(errMsg);
        return false;
      }
    } catch (err: any) {
      setSlots((prev) =>
        prev.map((s) =>
          s.index === slotIndex
            ? isEnd
              ? { ...s, isEndImageLoading: false, endImageError: err.message }
              : { ...s, isImageLoading: false, imageError: err.message }
            : s
        )
      );
      setGlobalError(err.message);
      return false;
    }
  };

  // Accept Shot & Auto-Generate Veo 3 Video Immediately
  const handleAcceptShot = async (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isImageAccepted: true } : s))
    );
    await handleGenerateVideoForSlot(slotIndex);
  };

  // Redo Start Shot
  const handleRedoShot = (slotIndex: number) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    generateImageForSlot(slotIndex, targetSlot?.startImagePrompt || targetSlot?.imagePrompt, brandName, 'start');
  };

  // Redo End Shot (with numeral)
  const handleRedoEndImage = (slotIndex: number) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    generateImageForSlot(slotIndex, targetSlot?.endImagePrompt, brandName, 'end');
  };

  // Rollback to N-1
  const handleRollbackShot = (slotIndex: number) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.index === slotIndex && s.historyImageUri) {
          return {
            ...s,
            currentImageUri: s.historyImageUri,
            historyImageUri: null,
          };
        }
        return s;
      })
    );
  };

  // Refine with custom prompt or 2nd brand reference image
  const handleRefineShot = async (slotIndex: number, customPrompt: string, brandRefFile?: File) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    const formData = new FormData();
    formData.append('slotIndex', slotIndex.toString());
    formData.append('customPrompt', customPrompt);
    formData.append('currentImageUri', targetSlot?.currentImageUri || '');
    formData.append('brandName', brandName);
    formData.append('apiKey', apiKey || '');
    formData.append('jobId', currentJobId || '');
    if (brandRefFile) {
      formData.append('brandReference', brandRefFile);
    }

    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isImageLoading: true, imageError: null } : s))
    );

    try {
      const res = await fetch(`${API_BASE}/api/refine-image`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.imageUri) {
        setSlots((prev) =>
          prev.map((s) => {
            if (s.index === slotIndex) {
              return {
                ...s,
                historyImageUri: s.currentImageUri,
                currentImageUri: data.imageUri,
                brandReferenceImageUri: data.brandReferenceUri,
                imagePrompt: customPrompt,
                isImageLoading: false,
                imageError: null,
              };
            }
            return s;
          })
        );
      } else {
        const errMsg = data.error || 'Failed to refine shot';
        setSlots((prev) =>
          prev.map((s) => (s.index === slotIndex ? { ...s, isImageLoading: false, imageError: errMsg } : s))
        );
      }
    } catch (err: any) {
      console.error('Failed to refine slot:', err);
      setSlots((prev) =>
        prev.map((s) => (s.index === slotIndex ? { ...s, isImageLoading: false, imageError: err.message } : s))
      );
    }
  };

  const handleSelectSequentialSlot = async (slotIndex: number) => {
    setActiveSequentialSlot(slotIndex);
    const targetSlot = slots.find((s) => s.diegeticNumber === slotIndex);
    if (!targetSlot?.videoPrompt || targetSlot?.sceneConcept?.includes('Pending') || targetSlot.videoPrompt.length < 10) {
      await handleRecreatePrompt(slotIndex);
    }
  };

  const handleProceedToNextShot = async () => {
    if (activeSequentialSlot > 1) {
      const nextNum = activeSequentialSlot - 1;
      setActiveSequentialSlot(nextNum);
      const nextSlot = slots.find((s) => s.diegeticNumber === nextNum);
      if (!nextSlot?.videoPrompt || nextSlot?.sceneConcept?.includes('Pending') || nextSlot.videoPrompt.length < 10) {
        await handleRecreatePrompt(nextNum);
      }
    }
  };

  const handlePreviewStitchedCountdown = async () => {
    setIsExportingMaster(true);
    setExportError(null);

    try {
      const res = await fetch(`${API_BASE}/api/export-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotsConfig: slots
            .filter((s) => Boolean(s.rawVideoUri || s.processedVideoUri))
            .map((s) => ({
              index: s.index,
              processedVideoUri: s.processedVideoUri,
              rawVideoUri: s.rawVideoUri,
              temporalConfig: s.temporalConfig,
            })),
          qualityMode: selectedVideoQuality,
          jobId: currentJobId,
        }),
      });
      const data = await parseResponseJson(res, 'Failed to preview stitched countdown');

      if (data.success && data.masterVideoUri) {
        setMasterVideoUri(data.masterVideoUri);
        setPreviewVideoUri(data.masterVideoUri);
      } else {
        setExportError(data.error || 'Failed to preview stitched countdown.');
      }
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setIsExportingMaster(false);
    }
  };

  // Active Parallel Video Workers State (tracks which 2 slots are actively being synthesized)
  const [activeVideoSlots, setActiveVideoSlots] = useState<{ workerId: number; slotIndex: number; concept: string }[]>([]);
  const [isBatchGeneratingVideos, setIsBatchGeneratingVideos] = useState(false);

  // 3. Direct Veo 3.1 Text-to-Video Generation for single slot (4.0s @ 60fps)
  const handleGenerateVideoForSlot = async (
    slotIndex: number,
    workerId: number = 1,
    qualityMode: VideoQualityMode = selectedVideoQuality,
    explicitPrompt?: string
  ) => {
    // Invalidate master cuts immediately because an individual scene is being synthesized anew
    setMasterVideoUri(null);
    setMaster720pUri(null);
    setMaster4kUri(null);
    setExtendedMasterVideoUri(null);
    setExtended720pUri(null);
    setExtended4kUri(null);
    setProjectRenderMetrics(undefined);

    const targetSlot = slots.find((s) => s.index === slotIndex);
    if (!targetSlot && !explicitPrompt) return;

    const effectivePrompt =
      explicitPrompt ||
      targetSlot?.videoPrompt ||
      `[0.0s-2.5s]: Dynamic wide cinematic camera tracking shot establishing ${targetSlot?.sceneConcept || themeContext || 'engineering facility'} for ${brandName || 'brand'}, focusing solely on moving machinery and ambient cinematic lighting. [2.5s-4.0s]: Camera rapidly zooms and macro-locks onto the center of ${targetSlot?.objectEmbedding || 'carrier surface'}, revealing the bold high-contrast physical numeral '${slotIndex}' laser-etched in glowing amber luminescence against a dark matte finish occupying the center of the frame in razor-sharp focus during the final second. Essential requirement: the physical numeral '${slotIndex}' must be clearly visible, centered, and unmistakably rendered in frame. Cinematography: 35mm anamorphic lens, macro depth of field, volumetric rim lighting, 8k photorealistic textures, 60fps.`;

    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? {
              ...s,
              isVideoLoading: true,
              activeWorkerId: workerId,
              videoError: null,
              processedVideoUri: null,
              videoAnalysis: undefined,
            }
          : s
      )
    );

    setActiveVideoSlots((prev) => [
      ...prev.filter((w) => w.workerId !== workerId),
      { workerId, slotIndex, concept: targetSlot?.sceneConcept || `Shot #${slotIndex}` },
    ]);

    try {
      const res = await fetch(`${API_BASE}/api/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIndex,
          videoPrompt: effectivePrompt,
          qualityMode,
          veoModel: selectedVeoModel,
          apiKey,
          authMode,
          jobId: currentJobIdRef.current || currentJobId,
        }),
      });
      const data = await res.json();

      if (data.success && data.rawVideoUri) {
        playStepSuccessChime();
        setSlots((prev) => {
          const next = prev.map((s) =>
            s.index === slotIndex
              ? {
                  ...s,
                  rawVideoUri: data.rawVideoUri,
                  processedVideoUri: null,
                  videoQuality: qualityMode,
                  isVideoLoading: false,
                  activeWorkerId: null,
                  videoError: null,
                }
              : s
          );
          slotsRef.current = next;
          return next;
        });
        // Ensure master cuts remain invalidated with new take
        setMasterVideoUri(null);
        setMaster720pUri(null);
        setMaster4kUri(null);
        setExtendedMasterVideoUri(null);
        setExtended720pUri(null);
        setExtended4kUri(null);
        setProjectRenderMetrics(undefined);

        // Trigger Veo AI Video Quality Inspector in background automatically
        handleAnalyzeVideoForSlot(slotIndex, data.rawVideoUri);
      } else {
        const errorMsg = data.error || (data.details ? JSON.stringify(data.details) : 'Video generation failed');
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? { ...s, isVideoLoading: false, activeWorkerId: null, videoError: errorMsg }
              : s
          )
        );
      }
    } catch (err: any) {
      setSlots((prev) =>
        prev.map((s) =>
          s.index === slotIndex ? { ...s, isVideoLoading: false, activeWorkerId: null, videoError: err.message } : s
        )
      );
    } finally {
      setActiveVideoSlots((prev) => prev.filter((w) => w.workerId !== workerId));
      setSlots((prev) =>
        prev.map((s) => (s.index === slotIndex ? { ...s, isVideoLoading: false, activeWorkerId: null } : s))
      );
    }
  };

  // 3b. Veo AI Video Quality Inspector with Gemini 3.8 Flash Multimodal Frame Analysis
  const handleAnalyzeVideoForSlot = async (slotIndex: number, specificVideoUri?: string) => {
    const targetSlot = slots.find((s) => s.index === slotIndex);
    if (!targetSlot) return;
    const videoUri = specificVideoUri || targetSlot.processedVideoUri || targetSlot.rawVideoUri;
    if (!videoUri) return;

    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, isAnalyzingVideo: true } : s))
    );

    try {
      const res = await fetch(`${API_BASE}/api/analyze-video-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotIndex,
          diegeticNumber: targetSlot.diegeticNumber,
          brandName: brandName || 'Brand',
          videoPrompt: targetSlot.videoPrompt || '',
          videoUri,
          apiKey,
          authMode,
          jobId: currentJobId,
        }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setSlots((prev) =>
          prev.map((s) =>
            s.index === slotIndex
              ? { ...s, isAnalyzingVideo: false, videoAnalysis: data.analysis }
              : s
          )
        );
      } else {
        setSlots((prev) =>
          prev.map((s) => (s.index === slotIndex ? { ...s, isAnalyzingVideo: false } : s))
        );
      }
    } catch {
      setSlots((prev) =>
        prev.map((s) => (s.index === slotIndex ? { ...s, isAnalyzingVideo: false } : s))
      );
    }
  };

  // 3c. 1-Click Apply AI Prompt Fix and Regenerate Video (Self-Improvement with Human in the Loop)
  const handleApplyAiPromptFixAndRegenerate = async (slotIndex: number, fixPrompt: string) => {
    setMasterVideoUri(null);
    setMaster720pUri(null);
    setMaster4kUri(null);
    setExtendedMasterVideoUri(null);
    setExtended720pUri(null);
    setExtended4kUri(null);
    setProjectRenderMetrics(undefined);

    setSlots((prev) =>
      prev.map((s) =>
        s.index === slotIndex
          ? {
              ...s,
              videoPrompt: fixPrompt,
              videoAnalysis: undefined,
              rawVideoUri: null,
              processedVideoUri: null,
            }
          : s
      )
    );
    await handleGenerateVideoForSlot(slotIndex, 1, selectedVideoQuality, fixPrompt);
  };

  // Batch Generate Veo 3 videos (Parallel 2-Worker Queue Dispatch)
  const handleGenerateAllVideos = async (
    qualityMode: VideoQualityMode = selectedVideoQuality,
    customSlots?: CountdownSlot[],
    forceAll: boolean = false
  ) => {
    setCurrentStage(2);
    requestNotificationPermission().catch(() => {});
    setIsBatchGeneratingVideos(true);
    setSelectedVideoQuality(qualityMode);

    if (forceAll) {
      setMasterVideoUri(null);
      setMaster720pUri(null);
      setMaster4kUri(null);
      setExtendedMasterVideoUri(null);
      setExtended720pUri(null);
      setExtended4kUri(null);
      setProjectRenderMetrics(undefined);
    }

    const baseSlots = customSlots || slots;
    const slotsToUse = forceAll
      ? baseSlots.map((s) => ({
          ...s,
          rawVideoUri: null,
          processedVideoUri: null,
          videoAnalysis: undefined,
          videoError: null,
        }))
      : baseSlots;

    if (forceAll) {
      setSlots(slotsToUse);
    }

    const missingSlots = forceAll
      ? [...slotsToUse]
      : [...slotsToUse].filter(
          (s) => !s.rawVideoUri && !s.processedVideoUri && !s.isVideoLoading
        );
    const sorted = [...missingSlots].sort((a, b) => b.diegeticNumber - a.diegeticNumber);

    // Dispatch all missing slots concurrently to backend VeoQueueManager.
    // Backend assigns Worker 1 & Worker 2 in parallel, pulling subsequent slots automatically.
    // Promise.allSettled guarantees that an individual slot error/timeout does not block the other worker.
    await Promise.allSettled(
      sorted.map((s) => handleGenerateVideoForSlot(s.index, 1, qualityMode, s.videoPrompt))
    );

    // In Express Director mode: autonomously proceed directly to 4K Extended Master Cut export!
    if (directorMode === 'express' || isAutopilotRunningRef.current) {
      // Set export loading flags BEFORE clearing batch video generating so isAnyActive NEVER drops
      setIsExportingExtendedMaster(true);
      setIsExportingMaster(true);
      setIsBatchGeneratingVideos(false);
      setActiveVideoSlots([]);

      const activeJobId = currentJobIdRef.current || currentJobId;
      const activeSlots = slotsRef.current || slots;
      await handleExportExtendedMaster('4k', activeJobId || undefined, activeSlots);
    } else {
      setIsBatchGeneratingVideos(false);
      setActiveVideoSlots([]);
      playStepSuccessChime();
      const customer = brandName.trim() || (currentJobIdRef.current ? currentJobIdRef.current.split('-')[0] : 'Client');
      startTitlePulsing(`🔔 ${customer} (10/10 Ready!)`, `${customer} • [10/10 Clips] Countdown`);
      sendDesktopNotification(`🎉 ${customer}: All 10 Countdown Videos Ready!`, {
        body: `Your 30-second AI countdown clips for ${customer} have finished generating. Click here to preview with audio!`,
      });
    }
  };

  // 4. Update Temporal Config for Slot
  const handleUpdateTemporalConfig = (slotIndex: number, config: SlotTemporalConfig) => {
    setSlots((prev) =>
      prev.map((s) => (s.index === slotIndex ? { ...s, temporalConfig: config } : s))
    );
  };

  // 5. Trigger Master ffmpeg Export (Supports Native 720p and Dual 4K Upscale Engines)
  const handleExportMaster = async (engine: UpscaleEngineType = 'LANCZOS_4K') => {
    setIsExportingMaster(true);
    setExportError(null);
    const is4K = engine !== 'FAST_720P';

    const userEmail = authUser?.email || localStorage.getItem('saved_google_email') || creatorLdap || '';
    const activeJobId = currentJobIdRef.current || currentJobId;
    const activeSlots = slotsRef.current || slots;

    requestNotificationPermission().catch(() => {});
    try {
      const res = await fetch(`${API_BASE}/api/export-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotsConfig: activeSlots.map((s) => ({
            index: s.index,
            processedVideoUri: s.processedVideoUri,
            rawVideoUri: s.rawVideoUri,
            temporalConfig: s.temporalConfig,
          })),
          qualityMode: is4K ? 'FULL_4K' : 'FAST_720P',
          upscaleEngine: engine,
          jobId: activeJobId,
          userEmail,
        }),
      });
      const data = await parseResponseJson(res, 'Failed to export master video');

      if (data.success && data.masterVideoUri) {
        setMasterVideoUri(data.masterVideoUri);
        if (is4K) {
          setMaster4kUri(data.masterVideoUri);
        } else {
          setMaster720pUri(data.masterVideoUri);
        }
        if (data.renderDurationSeconds) {
          setProjectRenderMetrics((prev) => ({
            ...(prev || {}),
            [is4K ? 'master4kRenderSeconds' : 'master720pRenderSeconds']: data.renderDurationSeconds,
            lastUpdated: new Date().toISOString(),
          }));
        }
        const customer = brandName.trim() || (activeJobId ? activeJobId.split('-')[0] : 'Client');
        playGrandFinaleChime();
        startTitlePulsing(`✨ ${customer} (Final Cut Ready!)`, `${customer} • [Final Cut Ready] Countdown`);
        sendDesktopNotification(`🎬 ${customer}: Final Cut Ready!`, {
          body: `Your 30-second countdown final cut for ${customer} has finished rendering and is ready to download.`,
        });
      } else {
        setExportError(data.error || 'Failed to export master video.');
      }
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setIsExportingMaster(false);
    }
  };

  // 6. Trigger Extended Master Export (+ Google I/O Outro with 2-second Fade Transition)
  const handleExportExtendedMaster = async (
    resolution: '720p' | '4k' = '4k',
    overrideJobId?: string,
    overrideSlots?: CountdownSlot[]
  ) => {
    const activeJobId = overrideJobId || currentJobIdRef.current || currentJobId;
    if (!activeJobId) {
      console.warn('[EXPORT] Cannot export extended master: missing activeJobId');
      return;
    }
    const activeSlots = overrideSlots || slotsRef.current || slots;

    setIsExportingExtendedMaster(true);
    setExportError(null);
    requestNotificationPermission().catch(() => {});

    const is4K = resolution === '4k';
    const userEmail = authUser?.email || localStorage.getItem('saved_google_email') || creatorLdap || '';
    let effectiveMasterUri = is4K ? (master4kUri || masterVideoUri) : (master720pUri || masterVideoUri);

    const latestTakeTs = getLatestSlotVideoTimestamp(activeSlots);
    const baseMasterTs = extractTimestampFromUri(effectiveMasterUri);
    const isBaseMasterOutdated = Boolean(latestTakeTs > 0 && baseMasterTs > 0 && latestTakeTs > baseMasterTs);

    try {
      // If 30s master has not been generated yet for this resolution OR is outdated compared to active scene takes, assemble it first
      if (!effectiveMasterUri || isBaseMasterOutdated) {
        setIsExportingMaster(true);
        const resMaster = await fetch(`${API_BASE}/api/export-master`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slotsConfig: activeSlots.map((s) => ({
              index: s.index,
              processedVideoUri: s.processedVideoUri,
              rawVideoUri: s.rawVideoUri,
              temporalConfig: s.temporalConfig,
            })),
            qualityMode: is4K ? 'FULL_4K' : 'FAST_720P',
            upscaleEngine: is4K ? 'LANCZOS_4K' : 'FAST_720P',
            jobId: activeJobId,
            userEmail,
          }),
        });
        const masterData = await parseResponseJson(resMaster, 'Failed to assemble base countdown master');
        setIsExportingMaster(false);
        if (masterData.success && masterData.masterVideoUri) {
          effectiveMasterUri = masterData.masterVideoUri;
          setMasterVideoUri(masterData.masterVideoUri);
          if (is4K) setMaster4kUri(masterData.masterVideoUri);
          else setMaster720pUri(masterData.masterVideoUri);
          if (masterData.renderDurationSeconds) {
            setProjectRenderMetrics((prev) => ({
              ...(prev || {}),
              [is4K ? 'master4kRenderSeconds' : 'master720pRenderSeconds']: masterData.renderDurationSeconds,
              lastUpdated: new Date().toISOString(),
            }));
          }
        } else {
          setExportError(masterData.error || 'Failed to assemble base countdown master.');
          setIsExportingExtendedMaster(false);
          return;
        }
      }

      const res = await fetch(`${API_BASE}/api/export-extended-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: activeJobId,
          masterVideoUri: effectiveMasterUri,
          resolution,
          qualityMode: is4K ? 'FULL_4K' : 'FAST_720P',
          userEmail,
        }),
      });
      const data = await parseResponseJson(res, 'Failed to export extended master video');

      if (data.success && data.extendedMasterVideoUri) {
        setExtendedMasterVideoUri(data.extendedMasterVideoUri);
        if (is4K) {
          setExtended4kUri(data.extendedMasterVideoUri);
        } else {
          setExtended720pUri(data.extendedMasterVideoUri);
        }
        if (data.renderDurationSeconds) {
          setProjectRenderMetrics((prev) => ({
            ...(prev || {}),
            [is4K ? 'extended4kRenderSeconds' : 'extended720pRenderSeconds']: data.renderDurationSeconds,
            lastUpdated: new Date().toISOString(),
          }));
        }
        const customer = brandName.trim() || (activeJobId ? activeJobId.split('-')[0] : 'Client');
        playGrandFinaleChime();
        startTitlePulsing(`✨ ${customer} (FULL VIDEO READY!)`, `${customer} • 🎉 [4K Ready!] Countdown`);
        sendDesktopNotification(`🎬 ${customer}: 2-Minute Full Video Ready!`, {
          body: `Your 2-minute video for ${customer} (30s countdown + Google I/O 2026 inspirational AI film) is ready to download.`,
        });

        // If auto-upload to YouTube is enabled, automatically upload the 4K video!
        if (autoUploadYouTube) {
          setTimeout(() => {
            handleUploadToYouTube(data.extendedMasterVideoUri);
          }, 800);
        }
      } else {
        setExportError(data.error || 'Failed to export extended master video.');
      }
    } catch (err: any) {
      setExportError(err.message);
    } finally {
      setIsExportingExtendedMaster(false);
      setIsExportingMaster(false);
      isAutopilotRunningRef.current = false;
    }
  };

  // 7. YouTube Upload Handler
  const handleUploadToYouTube = async (targetVideoUri?: string) => {
    const uri = targetVideoUri || extended4kUri || master4kUri;
    if (!uri) {
      setYoutubeUploadError('No 4K video ready to upload to YouTube.');
      return;
    }
    setIsUploadingYouTube(true);
    setYoutubeUploadError(null);
    try {
      const accessToken = await requestYouTubeAccessToken();
      const res = await fetch(`${API_BASE}/api/youtube/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUri: uri,
          title: `${brandName || 'Client'} - 4K Broadcast Countdown (Director's Cut)`,
          description: `4K 60fps Broadcast Countdown for ${brandName || 'Client'} generated with Magic Countdown Maker.`,
          privacyStatus: 'unlisted',
          accessToken,
        }),
      });
      const data = await res.json();
      if (data.success && data.youtubeUrl) {
        setYoutubeUrl(data.youtubeUrl);
        playGrandFinaleChime();
      } else {
        setYoutubeUploadError(data.error || 'Failed to upload video to YouTube.');
      }
    } catch (err: any) {
      console.error('YouTube upload failed:', err);
      setYoutubeUploadError(err.message || 'YouTube upload error');
    } finally {
      setIsUploadingYouTube(false);
    }
  };

  // Redo Deliverable Handlers
  const handleRedoWallpaper = async () => {
    const brand = brandName.trim() || 'Client';
    const promptToUse =
      wallpaperPrompt ||
      `Ultra-wide panoramic 32:9 cinema welcome wallpaper for ${brand} in ${customerIndustry || 'enterprise industry'}, panoramic wide angle landscape at golden hour sunset, dramatic warm sun flare, cinematic lighting, shot on 65mm anamorphic lens, 4k ultra-high resolution, clean expansive composition without text, 32:9 aspect ratio.`;
    setIsGeneratingWallpaper(true);
    setWallpaperError(null);
    try {
      const res = await fetch(`${API_BASE}/api/customer-meeting-package/generate-cinema-wallpaper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          brandName: brand,
          companyUrl,
          apiKey,
          jobId: currentJobId || 'global',
        }),
      });
      const data = await res.json();
      if (data.success && data.wallpaperUri) {
        setCinemaWallpaperUri(data.wallpaperUri);
        playStepSuccessChime();
      } else {
        setWallpaperError(data.error || 'Failed to regenerate 32:9 cinema wallpaper');
      }
    } catch (e: any) {
      setWallpaperError(e.message);
    } finally {
      setIsGeneratingWallpaper(false);
    }
  };

  const handleRedoBugdroid = async () => {
    const brand = brandName.trim() || 'Client';
    const promptToUse =
      bugdroidPrompt ||
      `A 3D render of a cute Android Bugdroid character standing centered on a solid pure black background (#000000). The Bugdroid is dressed as a worker in the ${customerIndustry || 'industry'} and wearing a clean crisp white t-shirt with the official ${brand} logo printed crisply in the center of the chest. High resolution 3D digital art, Pixar-quality studio lighting, sharp details, centered composition.`;
    setIsGeneratingBugdroid(true);
    setBugdroidError(null);
    try {
      const res = await fetch(`${API_BASE}/api/customer-meeting-package/generate-bugdroid-mascot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          brandName: brand,
          companyUrl,
          apiKey,
          jobId: currentJobId || 'global',
        }),
      });
      const data = await res.json();
      if (data.success && data.bugdroidUri) {
        setBugdroidMascotUri(data.bugdroidUri);
        playStepSuccessChime();
      } else {
        setBugdroidError(data.error || 'Failed to regenerate Bugdroid mascot');
      }
    } catch (e: any) {
      setBugdroidError(e.message);
    } finally {
      setIsGeneratingBugdroid(false);
    }
  };

  // 8. Express Director: Customer Meeting Package 1-Click Autonomous Generator
  const handleStartExpressAutopilot = async () => {
    if (!companyUrl.trim()) return;
    isAutopilotRunningRef.current = true;
    setYoutubeUrl(null);
    setYoutubeUploadError(null);
    setWallpaperError(null);
    setBugdroidError(null);

    // Extract brand name from domain if user did not provide one
    let brand = brandName.trim();
    if (!brand) {
      try {
        const parsed = new URL(companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`);
        brand = parsed.hostname.replace(/^www\./, '').split('.')[0];
        brand = brand.charAt(0).toUpperCase() + brand.slice(1);
        setBrandName(brand);
      } catch {
        brand = 'Client';
      }
    }

    // Step 1: Analyze Brand & Extract Meeting Package Prompts via Gemini 3.8 Flash
    let activeWallpaperPrompt = wallpaperPrompt;
    let activeBugdroidPrompt = bugdroidPrompt;

    try {
      const analyzeRes = await fetch(`${API_BASE}/api/customer-meeting-package/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyUrl,
          brandName: brand,
          apiKey,
        }),
      });
      if (analyzeRes.ok) {
        const analyzeData = await analyzeRes.json();
        if (analyzeData.success) {
          if (analyzeData.brandName) {
            brand = analyzeData.brandName;
            setBrandName(brand);
          }
          if (analyzeData.industry) {
            setCustomerIndustry(analyzeData.industry);
          }
          if (analyzeData.cinemaWallpaperPrompt) {
            activeWallpaperPrompt = analyzeData.cinemaWallpaperPrompt;
            setWallpaperPrompt(activeWallpaperPrompt);
          }
          if (analyzeData.bugdroidMascotPrompt) {
            activeBugdroidPrompt = analyzeData.bugdroidMascotPrompt;
            setBugdroidPrompt(activeBugdroidPrompt);
          }
        }
      }
    } catch (e) {
      console.warn('[MEETING_PACKAGE] Analysis non-fatal error:', e);
    }

    // Step 2: Trigger 32:9 Cinema Wallpaper if selected
    if (includeCinemaWallpaper && activeWallpaperPrompt) {
      setIsGeneratingWallpaper(true);
      fetch(`${API_BASE}/api/customer-meeting-package/generate-cinema-wallpaper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: activeWallpaperPrompt,
          brandName: brand,
          companyUrl,
          apiKey,
          jobId: currentJobId || 'global',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.wallpaperUri) {
            setCinemaWallpaperUri(data.wallpaperUri);
            playStepSuccessChime();
          } else {
            setWallpaperError(data.error || 'Failed to generate 32:9 cinema wallpaper');
          }
        })
        .catch((err) => setWallpaperError(err.message))
        .finally(() => setIsGeneratingWallpaper(false));
    }

    // Step 3: Trigger Branded Bugdroid Mascot if selected
    if (includeBugdroidMascot && activeBugdroidPrompt) {
      setIsGeneratingBugdroid(true);
      fetch(`${API_BASE}/api/customer-meeting-package/generate-bugdroid-mascot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: activeBugdroidPrompt,
          brandName: brand,
          companyUrl,
          apiKey,
          jobId: currentJobId || 'global',
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.bugdroidUri) {
            setBugdroidMascotUri(data.bugdroidUri);
            playStepSuccessChime();
          } else {
            setBugdroidError(data.error || 'Failed to render Bugdroid mascot');
          }
        })
        .catch((err) => setBugdroidError(err.message))
        .finally(() => setIsGeneratingBugdroid(false));
    }

    // Step 4: Trigger 2-Minute 4K Countdown Video if selected
    if (includeCountdownVideo) {
      if (autoUploadYouTube && !getCachedYouTubeToken()) {
        try {
          await requestYouTubeAccessToken();
        } catch (e: any) {
          console.warn('YouTube token request was cancelled or deferred:', e);
        }
      }

      await handleGeneratePrompts(
        brand,
        themeContext || `${brand} dynamic diegetic countdown, futuristic engineering, 60fps cinematic`,
        styleModifiers || 'Hyper-modern commercial cinematography, anamorphic lens',
        creatorLdap || '',
        companyUrl
      );
    }
  };

  const imagesCompletedCount = slots.filter((s) => Boolean(s.currentImageUri)).length;
  const allImagesReady = imagesCompletedCount === 10;
  const videosCompletedCount = slots.filter((s) => Boolean(s.rawVideoUri || s.processedVideoUri)).length;
  const allVideosReady = videosCompletedCount === 10;
  const generatedSlotsStream = slots.filter((s) => s.currentImageUri || s.isImageLoading);

  // Auto-advance from Stage 2 (Video Generation) to Stage 3 (30s Preview & Tuning) when all 10 videos are synthesized
  useEffect(() => {
    if (currentStage === 2 && videosCompletedCount === 10 && !isBatchGeneratingVideos) {
      const timer = setTimeout(() => {
        setCurrentStage(3);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentStage, videosCompletedCount, isBatchGeneratingVideos]);

  // Dynamically update document title with Customer name & stage status for multi-tab clarity
  useEffect(() => {
    const customer =
      brandName.trim() ||
      (companyUrl ? companyUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('.')[0] : '') ||
      (currentJobId ? currentJobId.split('-')[0] : '');
    const prefix = customer ? `${customer} • ` : '';

    let stageStatus = 'Meeting Package';
    if (extended4kUri || master4kUri || (cinemaWallpaperUri && bugdroidMascotUri && !includeCountdownVideo)) {
      stageStatus = '🎉 [Ready!]';
    } else if (isExportingExtendedMaster || isExportingMaster) {
      stageStatus = '[Mastering 4K]';
    } else if (isBatchGeneratingVideos || videosCompletedCount > 0) {
      stageStatus = `[${videosCompletedCount}/10 Clips]`;
    } else if (isGeneratingWallpaper || isGeneratingBugdroid) {
      stageStatus = '[Generating Assets]';
    } else if (isGeneratingPrompts) {
      stageStatus = '[Scripting]';
    } else if (directorMode === 'expert') {
      stageStatus = `Stage ${currentStage}`;
    }

    const fullTitle = `${prefix}${stageStatus} Executive Package`;
    document.title = fullTitle;
  }, [
    brandName,
    companyUrl,
    currentJobId,
    currentStage,
    directorMode,
    extended4kUri,
    master4kUri,
    cinemaWallpaperUri,
    bugdroidMascotUri,
    isGeneratingWallpaper,
    isGeneratingBugdroid,
    includeCountdownVideo,
    isExportingMaster,
    isExportingExtendedMaster,
    isBatchGeneratingVideos,
    isGeneratingPrompts,
    videosCompletedCount,
  ]);

  const handleAuthenticate = (user: { email: string; name: string; ldap?: string; picture?: string }) => {
    const rawEmail = (user.email || '').trim().toLowerCase();
    const cleanEmail = rawEmail === 'user@google.com' ? '' : rawEmail;
    const rawLdap = (user.ldap || '').trim();
    const cleanLdap = rawLdap === 'user' ? '' : rawLdap;
    const validUser = {
      email: cleanEmail,
      name: user.name || cleanLdap || 'Google User',
      ldap: cleanLdap,
      picture: user.picture,
    };
    setAuthUser(validUser);
    if (cleanEmail) {
      setCreatorLdap(cleanEmail);
    }
    localStorage.setItem('auth_user', JSON.stringify(validUser));

    // Open welcome guide after corporate authentication if user has not declined it
    if (localStorage.getItem('dismissed_welcome_guide') !== 'true') {
      setShowWelcomeGuide(true);
    }
  };

  // Listen for session expiration events from the API interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      setAuthUser(null);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const handleSignOut = () => {
    setAuthUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    const win = window as any;
    if (win.google?.accounts?.id) {
      try {
        win.google.accounts.id.disableAutoSelect();
      } catch {}
    }
  };

  const handleScrollToExportStudio = () => {
    if (currentStage < 3) {
      setCurrentStage(3);
    }
    setTimeout(() => {
      const el = document.getElementById('final-cut-export-studio');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 120);
  };

  if (!authUser) {
    return <GoogleAuthGate onAuthenticate={handleAuthenticate} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <Header
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        authMode={authMode}
        onAuthModeChange={setAuthMode}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        selectedVeoModel={selectedVeoModel}
        onVeoModelChange={setSelectedVeoModel}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        authUser={authUser}
        onSignOut={handleSignOut}
        currentJobId={currentJobId}
        jobs={jobsList}
        isLoadingJobs={isLoadingJobs}
        saveStatus={saveStatus}
        onSelectJob={handleSelectJob}
        onCreateNewJob={handleCreateNewJob}
        onDeleteJob={handleDeleteJob}
        onBulkDeleteAllJobs={handleBulkDeleteAllJobs}
        onRefreshJobs={fetchJobsList}
        onOpenPromptGuide={() => setShowPromptGuideModal(true)}
        hasCustomPromptGuide={Boolean(customPromptGuide && customPromptGuide.trim().length > 0)}
        onOpenWelcomeGuide={() => setShowWelcomeGuide(true)}
        directorMode={directorMode}
        onDirectorModeChange={handleDirectorModeChange}
        brandName={brandName}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {directorMode === 'express' ? (
          <ExpressDirectorView
            companyUrl={companyUrl}
            onCompanyUrlChange={setCompanyUrl}
            brandName={brandName}
            onBrandNameChange={setBrandName}
            themeContext={themeContext}
            onThemeContextChange={setThemeContext}
            industry={customerIndustry}
            includeCinemaWallpaper={includeCinemaWallpaper}
            onIncludeCinemaWallpaperChange={setIncludeCinemaWallpaper}
            includeBugdroidMascot={includeBugdroidMascot}
            onIncludeBugdroidMascotChange={setIncludeBugdroidMascot}
            includeCountdownVideo={includeCountdownVideo}
            onIncludeCountdownVideoChange={setIncludeCountdownVideo}
            cinemaWallpaperUri={cinemaWallpaperUri}
            bugdroidMascotUri={bugdroidMascotUri}
            isGeneratingWallpaper={isGeneratingWallpaper}
            isGeneratingBugdroid={isGeneratingBugdroid}
            wallpaperError={wallpaperError}
            bugdroidError={bugdroidError}
            onRedoWallpaper={handleRedoWallpaper}
            onRedoBugdroid={handleRedoBugdroid}
            isGeneratingPrompts={isGeneratingPrompts}
            isBatchGeneratingVideos={isBatchGeneratingVideos}
            isExportingMaster={isExportingMaster}
            isExportingExtendedMaster={isExportingExtendedMaster}
            slots={slots}
            veoQueueStatus={veoQueueStatus}
            extended4kUri={extended4kUri}
            master4kUri={master4kUri}
            youtubeUrl={youtubeUrl}
            isUploadingYouTube={isUploadingYouTube}
            youtubeUploadError={youtubeUploadError}
            autoUploadYouTube={autoUploadYouTube}
            onAutoUploadYouTubeChange={handleAutoUploadYouTubeChange}
            onStartAutopilot={handleStartExpressAutopilot}
            onSwitchToExpert={() => handleDirectorModeChange('expert')}
            onUploadToYouTube={() => handleUploadToYouTube()}
            onResetProject={handleCreateNewJob}
            onExportExtended={handleExportExtendedMaster}
            exportError={exportError}
          />
        ) : (
          <>
            {/* Customer & Stage Breadcrumb Bar */}
            <div className="max-w-4xl mx-auto flex items-center justify-between px-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer:</span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-black">
                    {brandName && brandName.trim() ? brandName.trim() : 'New Client Project'}
                  </span>
                  {currentJobId && (
                    <span className="text-xs font-mono text-slate-400 font-normal">
                      ({currentJobId})
                    </span>
                  )}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Stage {currentStage} of 4 • {videosCompletedCount}/10 clips ready
              </span>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="flex items-center justify-between max-w-4xl mx-auto px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          {[
            { num: 1, label: '1. Visual Concepts' },
            { num: 2, label: '2. Scene Generation' },
            { num: 3, label: '3. Preview & Scene Tuning' },
            { num: 4, label: '4. Final Cut Export' },
          ].map((st, idx) => (
            <React.Fragment key={st.num}>
              <button
                type="button"
                onClick={() => {
                  if (st.num <= currentStage || videosCompletedCount > 0) {
                    if (st.num === 4) {
                      handleScrollToExportStudio();
                    } else {
                      setCurrentStage(st.num);
                    }
                  }
                }}
                disabled={st.num > currentStage && videosCompletedCount === 0}
                className="flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all ${
                    currentStage >= st.num
                      ? 'bg-[#4285F4] text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {currentStage > st.num ? '✓' : st.num}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    currentStage >= st.num
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {st.label}
                </span>
              </button>
              {idx < 3 && (
                <div
                  className={`h-0.5 flex-1 mx-3 rounded transition-all ${
                    currentStage > st.num
                      ? 'bg-[#4285F4]'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* STAGE 1: Customer Brand & Aesthetic Settings */}
        {currentStage === 1 && (
          <div className="space-y-6">
            {videosCompletedCount > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    You have {videosCompletedCount}/10 clips ready in this project.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStage(3)}
                  className="px-4 py-2 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-blue-500/20"
                >
                  <span>Go to 30s Preview (Step 4) →</span>
                </button>
              </div>
            )}

            <ThemeInputForm
              onGeneratePrompts={handleGeneratePrompts}
              isLoading={isGeneratingPrompts}
              initialBrandName={brandName}
              initialCompanyUrl={companyUrl}
              onChangeCompanyUrl={setCompanyUrl}
              initialThemeContext={themeContext}
              initialCreatorLdap={creatorLdap}
              onOpenStepGuide={() => handleOpenStepGuide('step-1')}
              onOpenPromptGuide={() => setShowPromptGuideModal(true)}
            />
          </div>
        )}

        {/* Global Error Banner */}
        {globalError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider">Generation Notice:</span>
              <span>{globalError}</span>
            </div>
            <button
              type="button"
              onClick={() => handleGenerateVideoForSlot(activeSequentialSlot)}
              className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* STAGE 2: Bulk Video Generation (Veo 3.1 Fast - 2 Parallel Workers with Dynamic ETA) */}
        {currentStage === 2 && (
          <BulkVideoProgressPanel
            slots={slots}
            veoQueueStatus={veoQueueStatus}
            isBatchGenerating={isBatchGeneratingVideos}
            onSelectSlot={handleSelectSequentialSlot}
            onPlayVideo={setPreviewVideoUri}
            onProceedToPreview={() => setCurrentStage(3)}
            onRetrySlot={(idx) => handleGenerateVideoForSlot(idx, 1, selectedVideoQuality)}
            onRetryAllFailed={() => handleGenerateAllVideos(selectedVideoQuality)}
            onRegenerateAll={() => handleGenerateAllVideos(selectedVideoQuality, undefined, true)}
            onOpenStepGuide={() => handleOpenStepGuide('step-2')}
            currentJobId={currentJobId}
            brandName={brandName}
          />
        )}

        {/* STAGE 3: Step 4 (30s Audio/Video Timeline Preview) & Step 5 (Fix Single Clips / Master Video) */}
        {currentStage >= 3 && (
          <div className="space-y-8 animate-fadeIn">
            {/* Step 4: 30-Second Video Preview over Countdown Track */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-[#4285F4] border border-blue-500/20">
                      Step 4
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      30-Second Video Preview over Countdown Track
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleOpenStepGuide('step-4')}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-[#4285F4] border border-blue-500/30 hover:bg-blue-500/20 transition-colors cursor-pointer ml-1"
                      title="Open Step 4 Guide"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Guide</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Preview your synchronized countdown video over the 30-second countdown MP3 music and adjust scene timing.
                  </p>
                </div>
              </div>

              <SimplifiedAudioPreview
                slots={slots}
                audioTrackUri="/countdown/countdown_track.mp3"
                masterVideoUri={masterVideoUri || master720pUri || master4kUri}
                onProceedToMaster={handleScrollToExportStudio}
                onSelectSlot={handleSelectSequentialSlot}
              />
            </div>

            {/* Step 5: Fine-Tune Individual Scenes (5a) or Create Master Video (5b) */}
            <SingleClipFixer
              slots={slots}
              activeSlotIndex={activeSequentialSlot}
              onSelectSlot={handleSelectSequentialSlot}
              onUpdateVideoPrompt={handleUpdateVideoPrompt}
              onRecreatePrompt={handleRecreatePrompt}
              onRedoVideo={(idx) => handleGenerateVideoForSlot(idx, 1, selectedVideoQuality)}
              onPlayVideo={setPreviewVideoUri}
              onProceedToMaster={handleScrollToExportStudio}
              veoQueueStatus={veoQueueStatus}
            />
          </div>
        )}

        {/* Step 4: Inline Final Cut & Full Video Assembly Studio */}
        {currentStage >= 2 && videosCompletedCount > 0 && (
          <FinalCutExportStudio
            slots={slots}
            masterVideoUri={masterVideoUri}
            master720pUri={master720pUri}
            master4kUri={master4kUri}
            extendedMasterVideoUri={extendedMasterVideoUri}
            extended720pUri={extended720pUri}
            extended4kUri={extended4kUri}
            isExporting={isExportingMaster}
            isExportingExtended={isExportingExtendedMaster}
            projectRenderMetrics={projectRenderMetrics}
            onExport={handleExportMaster}
            onExportExtended={handleExportExtendedMaster}
            onPlayVideo={setPreviewVideoUri}
            onOpenStepGuide={() => handleOpenStepGuide('step-6')}
            youtubeUrl={youtubeUrl}
            isUploadingYouTube={isUploadingYouTube}
            onUploadToYouTube={() => handleUploadToYouTube()}
          />
        )}
          </>
        )}

        {/* Recent Master Countdowns Carousel */}
        <RecentMastersCarousel
          onPlayVideo={setPreviewVideoUri}
          onOpenProject={loadJob}
          currentJobId={currentJobId}
          refreshTrigger={masterVideoUri ? 1 : 0}
        />
      </main>

      {/* Dual-Image Refinement Modal */}
      {activeRefineSlot && (
        <RefineModal
          slot={activeRefineSlot}
          brandName={brandName}
          onClose={() => setActiveRefineSlot(null)}
          onRefine={handleRefineShot}
        />
      )}

      {/* Video Preview Modal */}
      {previewVideoUri && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-4 shadow-2xl space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Video Preview</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs font-mono">
                  {previewVideoUri.split('/').pop()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={`${getMediaUrl(previewVideoUri)}?download=1`}
                  download
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all active:scale-95"
                  title="Download full resolution MP4"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4</span>
                </a>
                <button
                  onClick={() => setPreviewVideoUri(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Close Preview"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
              <video
                src={getMediaUrl(previewVideoUri)}
                autoPlay
                loop
                playsInline
                controls
                controlsList="nodownload"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Veo Prompt Engineering Guide Modal */}
      <PromptGuideModal
        isOpen={showPromptGuideModal}
        onClose={() => setShowPromptGuideModal(false)}
        customGuide={customPromptGuide}
        defaultGuide={defaultPromptGuide}
        onSaveGuide={handleSaveCustomPromptGuide}
        onResetGuide={handleResetCustomPromptGuide}
      />

      {/* Welcome Onboarding Guide Modal (Google Blue Background) */}
      <WelcomeGuideModal
        isOpen={showWelcomeGuide}
        onClose={handleCloseWelcomeGuide}
      />

      {/* Step Guide Modal (Google Blue background explainer for each step) */}
      <StepGuideModal
        isOpen={Boolean(activeStepGuideId)}
        stepId={activeStepGuideId}
        onClose={handleCloseStepGuide}
      />

      {/* Lower Right GitHub Project Link */}
      <div className="fixed bottom-4 right-4 z-30">
        <a
          href="https://github.com/aosterloh/CountdownMaker"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] font-semibold backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95 group"
          title="View GitHub Repository"
        >
          <svg className="w-3.5 h-3.5 fill-current text-slate-400 group-hover:text-white transition-colors" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>GitHub</span>
        </a>
      </div>
    </div>
  );
};

export default App;
