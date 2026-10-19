import { Storage } from '@google-cloud/storage';
import { OAuth2Client } from 'google-auth-library';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'magic-countdown-generator-aosterloh-cs-muc';
const PROJECT_ID = process.env.GCP_PROJECT || 'aosterloh-cs-muc';

export interface JobMetadata {
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

export interface RenderMetrics {
  master720pRenderSeconds?: number;
  master4kRenderSeconds?: number;
  extended720pRenderSeconds?: number;
  extended4kRenderSeconds?: number;
  lastUpdated?: string;
}

export interface StoredJobState {
  jobId: string;
  customerName: string;
  companyUrl?: string;
  creatorLdap?: string;
  creativeTheme: string;
  styleModifiers?: string;
  selectedModel?: string;
  selectedVideoQuality?: string;
  currentStage: number;
  slots: any[];
  masterVideoUri?: string;
  master720pUri?: string;
  master4kUri?: string;
  extendedMasterVideoUri?: string;
  extended720pUri?: string;
  extended4kUri?: string;
  renderMetrics?: RenderMetrics;
  createdAt: string;
  updatedAt: string;
}


/**
 * Dynamically resolves the best GCS Bucket instance:
 * 1. On Cloud Run: Uses default ADC automatically.
 * 2. On Local Machine: Bridges the active gcloud OAuth token (e.g. aosterloh@cloudspace.goog) to avoid permission mismatches.
 */
export function getStorageBucket() {
  if (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_RUN) {
    const storage = new Storage({ projectId: PROJECT_ID });
    return storage.bucket(BUCKET_NAME);
  }

  try {
    const env = {
      ...process.env,
      PATH: `/Users/aosterloh/google-cloud-sdk/bin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ''}`,
    };
    let account = '';
    try {
      account = execSync('gcloud config get-value account', { encoding: 'utf8', env }).trim();
    } catch {}

    if (account) {
      let token = '';
      try {
        token = execSync(`gcloud auth print-access-token --account=${account}`, { encoding: 'utf8', env }).trim();
      } catch {
        try {
          token = execSync('gcloud auth application-default print-access-token', { encoding: 'utf8', env }).trim();
        } catch {}
      }

      if (token) {
        const authClient = new OAuth2Client();
        authClient.setCredentials({ access_token: token });
        const storage = new Storage({
          projectId: PROJECT_ID,
          authClient,
        });
        return storage.bucket(BUCKET_NAME);
      }
    }
  } catch (err: any) {
    console.warn('[GCS_STORAGE] Local auth bridge fallback to default ADC:', err.message);
  }

  const storage = new Storage({ projectId: PROJECT_ID });
  return storage.bucket(BUCKET_NAME);
}

// Generate random 5-character alphanumeric uppercase code
export function generateRandomCode(length: number = 5): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Sanitize customer name for clean job identifier
export function sanitizeCustomerName(name: string): string {
  const clean = name
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return clean || 'Countdown';
}

// Calculate the next versioned customer project name (e.g. Infineon -> Infineon v2 -> Infineon v3)
export function resolveNextCustomerProjectName(
  baseName: string,
  existingJobs: { customerName: string }[]
): string {
  const clean = baseName.trim();
  if (!clean) return 'Project';

  // Extract root name without trailing v\d+
  const rootMatch = clean.match(/^(.*?)(?:\s+v(\d+))?$/i);
  const rootName = (rootMatch ? rootMatch[1] : clean).trim();

  const regex = new RegExp(`^${rootName}(?:\\s+v(\\d+))?$`, 'i');
  let maxVersion = 0;
  let hasBaseMatch = false;

  for (const job of existingJobs) {
    const name = (job.customerName || '').trim();
    const match = name.match(regex);
    if (match) {
      hasBaseMatch = true;
      if (match[1]) {
        const v = parseInt(match[1], 10);
        if (v > maxVersion) maxVersion = v;
      } else {
        if (maxVersion < 1) maxVersion = 1;
      }
    }
  }

  if (!hasBaseMatch) {
    return clean;
  }

  const nextVersion = Math.max(maxVersion + 1, 2);
  return `${rootName} v${nextVersion}`;
}

// Create a new unique Job ID
export function generateJobId(customerName: string): string {
  const prefix = sanitizeCustomerName(customerName);
  const code = generateRandomCode(5);
  return `${prefix}-${code}`;
}

// Save Full Job State to GCS (jobs/{jobId}/state.json)
export async function saveJobStateToGcs(state: StoredJobState): Promise<void> {
  const bucket = getStorageBucket();
  const file = bucket.file(`jobs/${state.jobId}/state.json`);
  const payload = JSON.stringify(state, null, 2);
  await file.save(payload, {
    contentType: 'application/json',
    resumable: false,
  });
}

// Load Full Job State from GCS (jobs/{jobId}/state.json)
export async function loadJobStateFromGcs(jobId: string): Promise<StoredJobState | null> {
  try {
    const bucket = getStorageBucket();
    const file = bucket.file(`jobs/${jobId}/state.json`);
    const [exists] = await file.exists();
    if (!exists) return null;

    const [contents] = await file.download();
    return JSON.parse(contents.toString('utf-8')) as StoredJobState;
  } catch (err: any) {
    console.error(`[GCS_STORAGE] Error loading job ${jobId}:`, err.message);
    return null;
  }
}

// List all jobs in GCS sorted by updatedAt descending
export async function listAllJobsFromGcs(): Promise<JobMetadata[]> {
  try {
    const bucket = getStorageBucket();
    const [files] = await bucket.getFiles({ prefix: 'jobs/' });
    const stateFiles = files.filter((f) => f.name.endsWith('/state.json'));

    const jobs: JobMetadata[] = [];

    await Promise.all(
      stateFiles.map(async (file) => {
        try {
          const [contents] = await file.download();
          const state = JSON.parse(contents.toString('utf-8')) as StoredJobState;
          const slots = state.slots || [];
          let thumbnail = slots.find((s: any) => Boolean(s.currentImageUri))?.currentImageUri
            || slots.find((s: any) => Boolean(s.rawVideoUri))?.rawVideoUri
            || state.masterVideoUri
            || state.extendedMasterVideoUri
            || '';

          if (thumbnail && state.jobId) {
            thumbnail = thumbnail.replace(/\/api\/jobs\/null\//g, `/api/jobs/${state.jobId}/`);
          }

          jobs.push({
            jobId: state.jobId,
            customerName: state.customerName || 'Untitled',
            creatorLdap: state.creatorLdap || '',
            creativeTheme: state.creativeTheme || '',
            currentStage: state.currentStage || 1,
            totalSlots: slots.length,
            readyImagesCount: slots.filter((s: any) => Boolean(s.currentImageUri)).length,
            readyVideosCount: slots.filter((s: any) => Boolean(s.rawVideoUri)).length,
            hasMasterVideo: Boolean(state.masterVideoUri || state.extendedMasterVideoUri),
            masterVideoUri: state.masterVideoUri || state.master720pUri || state.master4kUri,
            master720pUri: state.master720pUri,
            master4kUri: state.master4kUri,
            extendedMasterVideoUri: state.extendedMasterVideoUri || state.extended720pUri || state.extended4kUri,
            extended720pUri: state.extended720pUri,
            extended4kUri: state.extended4kUri,
            thumbnailUri: thumbnail || undefined,
            createdAt: state.createdAt || new Date().toISOString(),
            updatedAt: state.updatedAt || state.createdAt || new Date().toISOString(),
          });
        } catch (e: any) {
          console.warn(`[GCS_STORAGE] Skipped corrupted state file ${file.name}:`, e.message);
        }
      })
    );

    return jobs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err: any) {
    console.error('[GCS_STORAGE] Error listing jobs from GCS:', err.message);
    return [];
  }
}

// Upload a local asset file to GCS
export async function uploadAssetToGcs(
  jobId: string,
  localFilePath: string,
  subfolder: 'images' | 'videos' | 'master' | 'extended-master' | 'uploads',
  filename: string
): Promise<string> {
  const bucket = getStorageBucket();
  const destination = `jobs/${jobId}/${subfolder}/${filename}`;
  const file = bucket.file(destination);

  let contentType = 'application/octet-stream';
  if (filename.endsWith('.png')) contentType = 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
  if (filename.endsWith('.mp4')) contentType = 'video/mp4';
  if (filename.endsWith('.mp3')) contentType = 'audio/mpeg';

  await bucket.upload(localFilePath, {
    destination,
    contentType,
    resumable: false,
  });

  return `/api/jobs/${jobId}/assets/${subfolder}/${filename}`;
}

// Upload and ensure a shared static asset (e.g. google-io.mp4) exists in GCS and locally
export async function ensureStaticAsset(
  staticFilename: string,
  localRelativePath: string
): Promise<string> {
  const localFullPath = path.join(process.cwd(), localRelativePath);

  const getContentType = (filename: string): string => {
    if (filename.endsWith('.mp3')) return 'audio/mpeg';
    if (filename.endsWith('.mp4')) return 'video/mp4';
    if (filename.endsWith('.png')) return 'image/png';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  };

  // If local file exists, check if it needs to be uploaded/synced to GCS static/
  if (fs.existsSync(localFullPath)) {
    try {
      const bucket = getStorageBucket();
      const gcsFile = bucket.file(`static/${staticFilename}`);
      const [exists] = await gcsFile.exists();
      if (!exists) {
        console.log(`[GCS_STORAGE] Uploading static asset ${staticFilename} to gs://${bucket.name}/static/...`);
        await bucket.upload(localFullPath, {
          destination: `static/${staticFilename}`,
          contentType: getContentType(staticFilename),
          resumable: false,
        });
        console.log(`[GCS_STORAGE] Static asset ${staticFilename} uploaded successfully.`);
      }
    } catch (err: any) {
      console.warn(`[GCS_STORAGE] Could not sync static asset ${staticFilename} to GCS:`, err.message);
    }
    return localFullPath;
  }

  // Fallback: If not in local repo directory, download directly from GCS static/ into target location
  const parentDir = path.dirname(localFullPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  try {
    const bucket = getStorageBucket();
    const gcsFile = bucket.file(`static/${staticFilename}`);
    const [exists] = await gcsFile.exists();
    if (exists) {
      console.log(`[GCS_STORAGE] Downloading static/${staticFilename} from GCS into ${localRelativePath}...`);
      await gcsFile.download({ destination: localFullPath });
      console.log(`[GCS_STORAGE] Static asset ${staticFilename} successfully downloaded to ${localFullPath}`);
      return localFullPath;
    }
  } catch (err: any) {
    console.warn(`[GCS_STORAGE] Could not download static asset ${staticFilename} from GCS:`, err.message);
  }

  // Secondary fallback: check cache dir
  const cachedDir = path.join(process.cwd(), 'public', 'output');
  if (!fs.existsSync(cachedDir)) {
    fs.mkdirSync(cachedDir, { recursive: true });
  }
  const cachedPath = path.join(cachedDir, staticFilename);
  if (fs.existsSync(cachedPath)) {
    return cachedPath;
  }

  return localFullPath;
}

// In-memory lookup cache to eliminate full GCS bucket scanning delays
const gcsFileLookupCache = new Map<string, string>();

// Download and ensure an asset exists locally in the container cache
export async function ensureLocalAssetFile(
  uri: string,
  workspaceRoot: string,
  outputDir: string
): Promise<string> {
  const cleanUri = uri.replace(/^\//, '');
  const localDirect = path.join(workspaceRoot, cleanUri);
  if (fs.existsSync(localDirect)) {
    return localDirect;
  }

  const filename = path.basename(cleanUri);
  const localOutput = path.join(outputDir, filename);
  if (fs.existsSync(localOutput)) {
    return localOutput;
  }

  const bucket = getStorageBucket();

  // 1. Direct path if uri is /api/jobs/:jobId/assets/:subfolder/:filename
  const match = cleanUri.match(/^api\/jobs\/([^\/]+)\/assets\/([^\/]+)\/(.+)$/);
  if (match) {
    const [, jobId, subfolder, filePart] = match;
    const gcsPath = `jobs/${jobId}/${subfolder}/${filePart}`;
    const gcsFile = bucket.file(gcsPath);
    const [exists] = await gcsFile.exists();
    if (exists) {
      gcsFileLookupCache.set(filename, gcsPath);
      await gcsFile.download({ destination: localOutput });
      return localOutput;
    }
  }

  // 2. Check in-memory cached GCS path
  const cachedGcsPath = gcsFileLookupCache.get(filename);
  if (cachedGcsPath) {
    try {
      const gcsFile = bucket.file(cachedGcsPath);
      const [exists] = await gcsFile.exists();
      if (exists) {
        await gcsFile.download({ destination: localOutput });
        return localOutput;
      }
    } catch {}
  }

  // 3. Fast direct check for common subfolders before scanning
  const commonSubfolders = ['videos', 'master', 'extended-master', 'images', 'uploads'];
  for (const sub of commonSubfolders) {
    // If filename has a jobId prefix e.g. countdown_extended_master_JOBID_...
    const potentialMatch = filename.match(/^(?:countdown_extended_master|master_countdown)_([a-zA-Z0-9_\-]+?)_/);
    if (potentialMatch) {
      const parsedJob = potentialMatch[1];
      const directCandidate = `jobs/${parsedJob}/${sub}/${filename}`;
      const gcsFile = bucket.file(directCandidate);
      const [exists] = await gcsFile.exists();
      if (exists) {
        gcsFileLookupCache.set(filename, directCandidate);
        await gcsFile.download({ destination: localOutput });
        return localOutput;
      }
    }
  }

  // 4. Fallback: search GCS bucket by filename
  try {
    const [files] = await bucket.getFiles({ prefix: 'jobs/' });
    const targetFile = files.find((f) => f.name.endsWith(`/${filename}`));
    if (targetFile) {
      gcsFileLookupCache.set(filename, targetFile.name);
      await targetFile.download({ destination: localOutput });
      return localOutput;
    }
  } catch (e: any) {
    console.warn(`[GCS_STORAGE] Failed to find ${filename} in GCS:`, e.message);
  }

  return localDirect;
}

// Delete an entire job and all its assets from GCS (jobs/{jobId}/) and local cache
export async function deleteJobFromGcs(jobId: string): Promise<boolean> {
  try {
    const bucket = getStorageBucket();
    const [files] = await bucket.getFiles({ prefix: `jobs/${jobId}` });
    if (files.length > 0) {
      await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })));
    }

    // Clean up local container cached files for this job
    const outputDir = path.join(process.cwd(), 'public', 'output');
    if (fs.existsSync(outputDir)) {
      const localFiles = fs.readdirSync(outputDir);
      for (const file of localFiles) {
        if (file.includes(jobId)) {
          try {
            fs.unlinkSync(path.join(outputDir, file));
          } catch {}
        }
      }
    }

    return true;
  } catch (err: any) {
    console.error(`[GCS_STORAGE] Error deleting job ${jobId}:`, err.message);
    return false;
  }
}

// Bulk delete ALL jobs and all assets from GCS (jobs/) and local cache
export async function bulkDeleteAllJobsFromGcs(): Promise<boolean> {
  try {
    const bucket = getStorageBucket();
    const [files] = await bucket.getFiles({ prefix: 'jobs/' });
    if (files.length > 0) {
      await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })));
    }

    // Clean up local container cached files
    const outputDir = path.join(process.cwd(), 'public', 'output');
    if (fs.existsSync(outputDir)) {
      const localFiles = fs.readdirSync(outputDir);
      for (const file of localFiles) {
        if (file.endsWith('.png') || file.endsWith('.mp4') || file.endsWith('.jpg')) {
          try {
            fs.unlinkSync(path.join(outputDir, file));
          } catch {}
        }
      }
    }

    return true;
  } catch (err: any) {
    console.error('[GCS_STORAGE] Error bulk deleting all jobs from GCS:', err.message);
    return false;
  }
}

export interface GlobalRenderBenchmarks {
  countdown_30s_720p: number;
  countdown_30s_4k: number;
  full_2min_720p: number;
  full_2min_4k: number;
  sampleCount?: {
    countdown_30s_720p: number;
    countdown_30s_4k: number;
    full_2min_720p: number;
    full_2min_4k: number;
  };
  lastUpdated: string;
}

const DEFAULT_BENCHMARKS: GlobalRenderBenchmarks = {
  countdown_30s_720p: 18,
  countdown_30s_4k: 48,
  full_2min_720p: 35,
  full_2min_4k: 110,
  sampleCount: {
    countdown_30s_720p: 5,
    countdown_30s_4k: 5,
    full_2min_720p: 3,
    full_2min_4k: 3,
  },
  lastUpdated: new Date().toISOString(),
};

let memoryBenchmarks: GlobalRenderBenchmarks = { ...DEFAULT_BENCHMARKS };
let benchmarksLoadedFromGcs = false;

export async function getGlobalRenderBenchmarks(): Promise<GlobalRenderBenchmarks> {
  if (benchmarksLoadedFromGcs) {
    return memoryBenchmarks;
  }

  try {
    const bucket = getStorageBucket();
    const file = bucket.file('system/render_benchmarks.json');
    const [exists] = await file.exists();
    if (exists) {
      const [contents] = await file.download();
      const parsed = JSON.parse(contents.toString('utf-8')) as GlobalRenderBenchmarks;
      memoryBenchmarks = {
        ...DEFAULT_BENCHMARKS,
        ...parsed,
        sampleCount: {
          countdown_30s_720p: parsed.sampleCount?.countdown_30s_720p ?? DEFAULT_BENCHMARKS.sampleCount!.countdown_30s_720p,
          countdown_30s_4k: parsed.sampleCount?.countdown_30s_4k ?? DEFAULT_BENCHMARKS.sampleCount!.countdown_30s_4k,
          full_2min_720p: parsed.sampleCount?.full_2min_720p ?? DEFAULT_BENCHMARKS.sampleCount!.full_2min_720p,
          full_2min_4k: parsed.sampleCount?.full_2min_4k ?? DEFAULT_BENCHMARKS.sampleCount!.full_2min_4k,
        },
      };
    }
    benchmarksLoadedFromGcs = true;
  } catch (e: any) {
    // Non-fatal, fallback to memory benchmarks
    console.warn('[BENCHMARKS] Using default in-memory render benchmarks:', e.message);
  }

  return memoryBenchmarks;
}

export async function recordRenderBenchmark(
  profile: 'countdown_30s_720p' | 'countdown_30s_4k' | 'full_2min_720p' | 'full_2min_4k',
  durationSeconds: number
): Promise<GlobalRenderBenchmarks> {
  if (durationSeconds <= 0) return memoryBenchmarks;

  // Load existing if not already loaded
  await getGlobalRenderBenchmarks();

  const currentVal = memoryBenchmarks[profile] || DEFAULT_BENCHMARKS[profile];
  const samples = memoryBenchmarks.sampleCount?.[profile] || 1;

  // Weighted moving average giving 35% weight to newest observation, 65% to historical
  const updatedVal = Math.max(3, Math.round(currentVal * 0.65 + durationSeconds * 0.35));

  memoryBenchmarks = {
    ...memoryBenchmarks,
    [profile]: updatedVal,
    sampleCount: {
      ...memoryBenchmarks.sampleCount!,
      [profile]: samples + 1,
    },
    lastUpdated: new Date().toISOString(),
  };

  // Asynchronously persist to GCS
  (async () => {
    try {
      const bucket = getStorageBucket();
      const file = bucket.file('system/render_benchmarks.json');
      await file.save(JSON.stringify(memoryBenchmarks, null, 2), {
        contentType: 'application/json',
        resumable: false,
      });
      console.log(`[BENCHMARKS] Persisted benchmark for ${profile}: ${durationSeconds}s (new average: ${updatedVal}s)`);
    } catch (err: any) {
      console.warn('[BENCHMARKS] Failed to persist system/render_benchmarks.json to GCS:', err.message);
    }
  })().catch(() => {});

  return memoryBenchmarks;
}

