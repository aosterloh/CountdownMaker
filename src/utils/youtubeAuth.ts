import { getApps, initializeApp, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { firebaseConfig } from '../components/GoogleAuthGate';

const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const YOUTUBE_TOKEN_KEY = 'countdown_youtube_oauth_token';

function getFirebaseAuth() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return getAuth(app);
}

/**
 * Retrieve cached YouTube OAuth access token from sessionStorage
 */
export function getCachedYouTubeToken(): string | null {
  try {
    return sessionStorage.getItem(YOUTUBE_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Cache YouTube OAuth access token in sessionStorage
 */
export function setCachedYouTubeToken(token: string): void {
  try {
    sessionStorage.setItem(YOUTUBE_TOKEN_KEY, token);
  } catch {}
}

/**
 * Clear cached YouTube token
 */
export function clearCachedYouTubeToken(): void {
  try {
    sessionStorage.removeItem(YOUTUBE_TOKEN_KEY);
  } catch {}
}

/**
 * Interactive Google OAuth popup requesting youtube.upload permission
 */
export async function requestYouTubeAccessToken(): Promise<string> {
  const cached = getCachedYouTubeToken();
  if (cached) return cached;

  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope(YOUTUBE_UPLOAD_SCOPE);
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline',
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) {
    throw new Error('Could not retrieve YouTube OAuth access token from Google sign-in.');
  }

  setCachedYouTubeToken(token);
  return token;
}
