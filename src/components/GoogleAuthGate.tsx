import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

export const firebaseConfig = {
  apiKey: "AIzaSyBDfu44ElID27cy2lvozY2BD1izTq7AIuo",
  authDomain: "aosterloh-cs-muc.firebaseapp.com",
  projectId: "aosterloh-cs-muc",
  storageBucket: "aosterloh-cs-muc.appspot.com",
  appId: "1:557450838719:web:5e51f"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

interface GoogleAuthGateProps {
  onAuthenticate: (user: { email: string; name: string; ldap?: string; picture?: string }) => void;
}

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({ onAuthenticate }) => {
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const email = currentUser.email || '';
        if (email.toLowerCase().endsWith('@google.com')) {
          try {
            const token = await currentUser.getIdToken();
            const ldap = email.split('@')[0];
            const userData = {
              email,
              name: currentUser.displayName || ldap,
              ldap,
              picture: currentUser.photoURL || undefined
            };
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_user', JSON.stringify(userData));
            onAuthenticate(userData);
          } catch (e: any) {
            setError('Failed to fetch authentication credentials.');
          }
        } else {
          await signOut(auth);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setError(`Access Denied: You authenticated with ${email}. Only @google.com accounts are permitted.`);
        }
      }
      setIsVerifying(false);
    });

    return () => unsubscribe();
  }, [onAuthenticate]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsVerifying(true);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      hd: 'google.com',
      prompt: 'select_account'
    });

    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setIsVerifying(false);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Authentication failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        {/* Google Bar */}
        <div className="flex h-1.5 w-full rounded-full overflow-hidden mb-6">
          <div className="bg-[#4285F4] flex-1"></div>
          <div className="bg-[#EA4335] flex-1"></div>
          <div className="bg-[#FBBC05] flex-1"></div>
          <div className="bg-[#34A853] flex-1"></div>
        </div>

        <div className="inline-flex p-3 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">CountdownMaker</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Corporate Google Workspace Authentication Gateway
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
          <span>🔒</span> Restricted to @google.com
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm text-left flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>
              <div className="font-semibold">Authentication Restricted</div>
              <div className="text-xs mt-0.5">{error}</div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={handleGoogleSignIn}
            disabled={isVerifying}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-medium text-sm transition-all shadow-sm hover:shadow disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
