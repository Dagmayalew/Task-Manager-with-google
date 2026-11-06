import React from 'react';
import { User } from 'firebase/auth';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Puzzle, 
  Monitor, 
  Smartphone, 
  Sidebar as SidebarIcon,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { ExtensionDisplayMode } from '../types';

interface NavbarProps {
  user: User | null;
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  displayMode: ExtensionDisplayMode;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSetDisplayMode: (mode: ExtensionDisplayMode) => void;
  onLogin: () => void;
  onLogout: () => void;
  onSyncNow: () => void;
  onOpenExtensionModal: () => void;
  onOpenSyncQueueModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  isOnline,
  isSyncing,
  pendingSyncCount,
  displayMode,
  theme,
  onToggleTheme,
  onSetDisplayMode,
  onLogin,
  onLogout,
  onSyncNow,
  onOpenExtensionModal,
  onOpenSyncQueueModal,
}) => {
  return (
    <header className="h-13 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-stone-50/90 dark:bg-neutral-950/90 backdrop-blur-md px-5 flex items-center justify-between sticky top-0 z-40 select-none transition-colors">
      {/* Brand logo & title - Swiss Grotesque typography */}
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-xs bg-blue-600 flex items-center justify-center text-white font-mono text-xs font-bold tracking-tighter">
          C
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 text-sm">
            Chronotask
          </span>
          <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest font-semibold">
            Studio
          </span>
        </div>
      </div>

      {/* Simulator Mode Segmented Control - Architectural minimal tabs */}
      <div className="hidden md:flex items-center border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-0.5 rounded-md text-xs font-medium">
        <button
          onClick={() => onSetDisplayMode('desktop')}
          title="Full Studio Workspace"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-sm transition-all ${
            displayMode === 'desktop'
              ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Full App</span>
        </button>
        <button
          onClick={() => onSetDisplayMode('popup')}
          title="Simulate Chrome Extension Popup (380 × 580 px)"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-sm transition-all ${
            displayMode === 'popup'
              ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Popup (380px)</span>
        </button>
        <button
          onClick={() => onSetDisplayMode('sidepanel')}
          title="Simulate Chrome Extension Side Panel (360 px)"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-sm transition-all ${
            displayMode === 'sidepanel'
              ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <SidebarIcon className="w-3.5 h-3.5" />
          <span>Side Panel</span>
        </button>
      </div>

      {/* Right Controls: Sync status, Theme toggle, Extension Export, Google Auth */}
      <div className="flex items-center gap-3">
        {/* Offline / Online Status - 2-color indicator */}
        <button
          onClick={onOpenSyncQueueModal}
          className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition py-1 px-1.5"
          title={isOnline ? 'Online - Local data synced' : 'Offline - Queued locally'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-blue-600' : 'bg-rose-600'}`} />
          <span className="font-mono text-[11px] tracking-wide uppercase">
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {pendingSyncCount > 0 && (
            <span className="font-mono text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
              ({pendingSyncCount})
            </span>
          )}
        </button>

        {/* Sync Now Button */}
        {user && (
          <button
            onClick={onSyncNow}
            disabled={isSyncing || !isOnline}
            title="Synchronize Google Tasks & Calendar"
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-neutral-900 dark:text-neutral-100' : ''}`} />
          </button>
        )}

        {/* Theme Mode Toggle (Sun / Moon) */}
        <button
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
          className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 rounded transition hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Extension Package Modal Button - Minimalist border */}
        <button
          onClick={onOpenExtensionModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          title="Download Chrome Extension package"
        >
          <Puzzle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Extension</span>
        </button>

        {/* Google Authentication */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-neutral-200 dark:border-neutral-800">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Google Account'}
                className="w-6 h-6 rounded-full border border-neutral-200 dark:border-neutral-700 object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 flex items-center justify-center text-[10px] font-bold">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'G'}
              </div>
            )}
            <span className="hidden lg:inline text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[100px]">
              {user.displayName?.split(' ')[0] || 'User'}
            </span>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Official Google Sign-in button with minimalist frame */
          <button
            onClick={onLogin}
            className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-md text-xs font-medium transition border border-neutral-300 dark:border-neutral-700 active:scale-98 shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span className="font-medium">Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
};
