import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, ShieldAlert, AlertCircle } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface AuthErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorCode?: string;
  errorMessage?: string;
}

export const AuthErrorModal: React.FC<AuthErrorModalProps> = ({
  isOpen,
  onClose,
  errorCode,
  errorMessage,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'task-manager-with-google.vercel.app';
  const projectId = firebaseConfig.projectId || 'gen-lang-client-0242553286';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
  const gcpCredentialsUrl = `https://console.cloud.google.com/apis/credentials?project=${projectId}`;

  const isUnauthorizedDomain = errorCode === 'auth/unauthorized-domain' || (errorMessage && errorMessage.includes('authorized domain'));
  const isPopupBlocked = errorCode === 'auth/popup-blocked';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl p-5 text-neutral-900 dark:text-neutral-100 max-h-[90vh] flex flex-col overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                {isUnauthorizedDomain ? 'Authorize Domain in Firebase Console' : 'Sign-In Error'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs">
          {isUnauthorizedDomain ? (
            <>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded text-neutral-800 dark:text-neutral-200 leading-relaxed space-y-1.5">
                <p className="font-semibold text-rose-700 dark:text-rose-400">
                  Firebase Error: auth/unauthorized-domain
                </p>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  Google and Firebase Authentication block sign-in attempts from domains that have not been explicitly authorized in your project settings.
                </p>
              </div>

              {/* Step by step fix */}
              <div className="space-y-2">
                <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider block">
                  Quick Fix (Takes 60 seconds):
                </span>

                {/* Step 1: Copy domain */}
                <div className="p-2.5 bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] text-blue-600 block">STEP 1. COPY DOMAIN</span>
                    <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate block">
                      {currentDomain}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-xs font-mono hover:border-blue-600 transition shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Step 2: Open Firebase settings */}
                <div className="p-2.5 bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded space-y-1.5">
                  <span className="font-mono text-[10px] text-blue-600 block">STEP 2. ADD TO FIREBASE CONSOLE</span>
                  <p className="text-neutral-600 dark:text-neutral-400 text-[11px]">
                    Go to <strong>Authentication → Settings → Authorized domains</strong> in your Firebase Console, click <strong>"Add domain"</strong>, and paste <code>{currentDomain}</code>.
                  </p>
                  <a
                    href={firebaseSettingsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition cursor-pointer mt-1"
                  >
                    <span>Open Firebase Auth Settings</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Step 3: Google Cloud Credentials */}
                <div className="p-2.5 bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 rounded space-y-1.5">
                  <span className="font-mono text-[10px] text-neutral-500 block">STEP 3 (OPTIONAL / VERIFY). GOOGLE CLOUD CREDENTIALS</span>
                  <p className="text-neutral-600 dark:text-neutral-400 text-[11px]">
                    If needed, also add <code>https://{currentDomain}</code> to <strong>Authorized JavaScript origins</strong> on your OAuth 2.0 Client ID in Google Cloud Console.
                  </p>
                  <a
                    href={gcpCredentialsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <span>Open Google Cloud Credentials</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </>
          ) : isPopupBlocked ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded text-neutral-800 dark:text-neutral-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
                <AlertCircle className="w-4 h-4" />
                <span>Pop-up Blocked by Browser</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Your browser blocked the Google Sign-In window. Please allow pop-ups for <code>{currentDomain}</code> in your browser address bar and try again.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded space-y-1.5">
              <p className="font-semibold text-rose-700 dark:text-rose-400">
                {errorCode || 'Authentication Error'}
              </p>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-mono">
                {errorMessage || 'An error occurred during Google Sign-In.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-400">
            Project: {projectId}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
