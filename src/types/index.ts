export type TemporalMode = 'SPEED_UP' | 'PASSTHROUGH' | 'TRUNCATE_FRONT' | 'TRUNCATE_BACK';

export type ImageModelType =
  | 'gemini-nano-banana-2.1'
  | 'gemini-3.1-flash-image'
  | 'imagen-3.0-generate-002'
  | 'imagen-3.0-fast-generate-001'
  | 'procedural-diegetic';

export type VeoModelType =
  | 'veo-3.1-fast-generate-preview'
  | 'veo-3.1-generate-preview';

export type AuthMode = 'ADC' | 'API_KEY';

export interface SlotTemporalConfig {
  mode: TemporalMode;
  targetDurationSeconds: number; // Clamped in [0.5, 4.0]
  trimStartSeconds: number;
  trimEndSeconds: number;
}

export type VideoQualityMode = 'FAST_720P' | 'FULL_4K';

export type UpscaleEngineType = 'LANCZOS_4K' | 'REAL_ESRGAN_4K' | 'FAST_720P';

export interface VideoAnalysisResult {
  score: number; // 1 to 10
  hasCorrectNumber: boolean;
  exactCharactersRead?: string; // Exact text characters visibly read from the frame
  characterLocation?: string; // Location of the numeral in frame
  numberVisibility: 'CLEAR_IN_FINAL_FRAMES' | 'ALWAYS_VISIBLE' | 'MISSING' | 'DISTORTED';
  timingVerdict: 'PERFECT_REVEAL' | 'APPEARED_TOO_EARLY' | 'NO_NUMBER' | 'DISTORTED';
  critique: string;
  suggestedPromptFix?: string | null;
  frameUris?: string[]; // 4 extracted thumbnail URLs
  analyzedAt?: string;
}

export interface CountdownSlot {
  index: number; // 10 down to 1
  diegeticNumber: number;
  sceneConcept: string;
  objectEmbedding?: string;
  revealMechanism?: string; // How the camera transitions from Start to End
  imagePrompt: string;      // Frame 1 (Start Image Prompt - Clean Establishing Shot)
  startImagePrompt?: string;
  endImagePrompt?: string;  // Frame N (End Image Prompt - Hero Shot with Number)
  videoPrompt?: string;     // Coordinated Veo 3 camera motion connecting Start to End

  // Prompt Review State
  isPromptApproved: boolean;
  isPromptRecreating?: boolean;

  // Image Generation State (Frame 1 Start & Frame N End)
  currentImageUri: string | null;  // Frame 1 Start Image URI
  startImageUri?: string | null;
  endImageUri?: string | null;     // Frame N End Hero Image URI
  historyImageUri: string | null;  // N-1 rollback
  isImageAccepted: boolean;
  isImageLoading: boolean;
  isEndImageLoading?: boolean;
  imageError: string | null;
  endImageError?: string | null;

  // Refinement Parameters
  customPromptOverride?: string;
  brandReferenceImageUri?: string;

  // Video Generation State
  rawVideoUri: string | null; // 4.0s raw Veo output
  videoQuality?: VideoQualityMode;
  isVideoLoading: boolean;
  activeWorkerId?: number | null;
  videoError: string | null;

  // Veo AI Video Quality Inspector State
  videoAnalysis?: VideoAnalysisResult;
  isAnalyzingVideo?: boolean;

  // Temporal Alignment
  temporalConfig: SlotTemporalConfig;
  processedVideoUri: string | null;
}

export interface ProjectConfig {
  brandName: string;
  themeContext: string;
  universalStyleAnchor: string;
  selectedModel: ImageModelType;
  selectedVeoModel?: VeoModelType;
  authMode: AuthMode;
  gcpProject: string;
  gcpRegion: string;
  apiKey?: string;
}

export interface JobSummary {
  jobId: string;
  customerName: string;
  creatorLdap?: string;
  creativeTheme: string;
  currentStage: number;
  totalSlots: number;
  readyImagesCount: number;
  readyVideosCount: number;
  hasMasterVideo: boolean;
  masterVideoUri?: string;
  master720pUri?: string;
  master4kUri?: string;
  extendedMasterVideoUri?: string;
  extended720pUri?: string;
  extended4kUri?: string;
  thumbnailUri?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MasterVideoEntry {
  jobId: string;
  customerName: string;
  creatorLdap?: string;
  creativeTheme: string;
  hasMasterVideo: boolean;
  masterVideoUri?: string;
  master720pUri?: string;
  master4kUri?: string;
  extendedMasterVideoUri?: string;
  extended720pUri?: string;
  extended4kUri?: string;
  thumbnailUri?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface GroundingMetadata {
  searchQueries?: string[];
  sources?: GroundingSource[];
}

export interface RenderMetrics {
  master720pRenderSeconds?: number;
  master4kRenderSeconds?: number;
  extended720pRenderSeconds?: number;
  extended4kRenderSeconds?: number;
  lastUpdated?: string;
}

export interface RenderBenchmarks {
  countdown_30s_720p: number;
  countdown_30s_4k: number;
  full_2min_720p: number;
  full_2min_4k: number;
  lastUpdated?: string;
}

export interface CountdownJobState {
  jobId: string;
  customerName: string;
  creatorLdap?: string;
  creativeTheme: string;
  styleModifiers?: string;
  selectedModel?: ImageModelType;
  selectedVeoModel?: VeoModelType;
  selectedVideoQuality?: VideoQualityMode;
  currentStage: number;
  slots: CountdownSlot[];
  masterVideoUri?: string;
  master720pUri?: string;
  master4kUri?: string;
  extendedMasterVideoUri?: string;
  extended720pUri?: string;
  extended4kUri?: string;
  renderMetrics?: RenderMetrics;
  groundingMetadata?: GroundingMetadata;
  geminiModelUsed?: string;
  createdAt: string;
  updatedAt: string;
}


export interface VeoActiveWorker {
  workerId: 1 | 2;
  taskId: string;
  jobId: string;
  slotIndex: number;
  model: string;
  qualityMode: VideoQualityMode;
  startedAt?: number;
  elapsedSeconds: number;
}

export interface VeoQueuedItem {
  position: number;
  taskId: string;
  jobId: string;
  slotIndex: number;
  model: string;
  qualityMode: VideoQualityMode;
  queuedAt: number;
  waitingSeconds: number;
}

export interface VeoQueueStatus {
  activeWorkers: VeoActiveWorker[];
  activeCount: number;
  maxWorkers: number;
  queue: VeoQueuedItem[];
  queueLength: number;
  avgVideoDurationSeconds?: number;
  estimatedRemainingSeconds?: number;
  lastClipDurationSeconds?: number | null;
}

export interface CustomerMeetingPackageConfig {
  includeCinemaWallpaper: boolean;
  includeBugdroidMascot: boolean;
  includeCountdownVideo: boolean;
}

export interface WallpaperPillar {
  division: string;
  prompt: string;
}

export interface CustomerMeetingDeliverables {
  brandName?: string;
  industry?: string;
  businessSummary?: string;
  cinemaWallpaperUri?: string | null;
  cinemaWallpaperPrompt?: string;
  wallpaperPillars?: WallpaperPillar[];
  currentPillarIndex?: number;
  wallpaperAspectRatio?: '32:9' | '16:9';
  isGeneratingWallpaper?: boolean;
  wallpaperError?: string | null;
  bugdroidMascotUri?: string | null;
  bugdroidWorkerUri?: string | null;
  bugdroidSpeakerUri?: string | null;
  bugdroidWorkerPrompt?: string;
  bugdroidSpeakerPrompt?: string;
  bugdroidMascotPrompt?: string;
  isGeneratingBugdroid?: boolean;
  isGeneratingSpeakerBugdroid?: boolean;
  bugdroidError?: string | null;
  speakerBugdroidError?: string | null;
}
