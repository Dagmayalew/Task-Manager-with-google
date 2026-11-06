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
  Layers
} from 'lucide-react';
import { ExtensionDisplayMode } from '../types';

interface NavbarProps {
  user: User | null;
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  displayMode: ExtensionDisplayMode;
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
  onSetDisplayMode,
  onLogin,
  onLogout,
  onSyncNow,
  onOpenExtensionModal,
  onOpenSyncQueueModal,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 text-sm tracking-tight">Chronotask</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Extension
            </span>
          </div>
        </div>
      </div>

      {/* Simulator Mode Selector */}
      <div className="hidden md:flex items-center p-0.5 bg-slate-950/80 rounded-lg border border-slate-800">
        <button
          onClick={() => onSetDisplayMode('desktop')}
          title="Full Desktop Dashboard"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition ${
            displayMode === 'desktop'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Full App</span>
        </button>
        <button
          onClick={() => onSetDisplayMode('popup')}
          title="Simulate Chrome Extension Popup (380x560px)"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition ${
            displayMode === 'popup'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Popup (Ext)</span>
        </button>
        <button
          onClick={() => onSetDisplayMode('sidepanel')}
          title="Simulate Chrome Extension Side Panel (360px)"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition ${
            displayMode === 'sidepanel'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SidebarIcon className="w-3.5 h-3.5" />
          <span>Side Panel</span>
        </button>
      </div>

      {/* Right Controls: Sync status, Extension Export, Google Auth */}
      <div className="flex items-center gap-2.5">
        {/* Offline / Online Status Pill */}
        <div 
          onClick={onOpenSyncQueueModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition ${
            isOnline 
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900/40' 
              : 'bg-amber-950/40 text-amber-400 border-amber-800/50 hover:bg-amber-900/40'
          }`}
          title={isOnline ? 'Online - All changes ready to sync' : 'Offline Mode - Saving locally'}
        >
          {isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Online</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline</span>
            </>
          )}

          {pendingSyncCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
              {pendingSyncCount}
            </span>
          )}
        </div>

        {/* Sync Now Button */}
        {user && (
          <button
            onClick={onSyncNow}
            disabled={isSyncing || !isOnline}
            title="Sync with Google Tasks & Calendar"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        )}

        {/* Extension Package Modal Button */}
        <button
          onClick={onOpenExtensionModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition shadow-xs"
          title="View Chrome Extension files & Download Unpacked Package"
        >
          <Puzzle className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Extension Setup</span>
        </button>

        {/* Google Authentication */}
        {user ? (
          <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Google Account'}
                className="w-7 h-7 rounded-full border border-slate-700 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'G'}
              </div>
            )}
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-200 truncate max-w-[110px]">
                {user.displayName || 'Google User'}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
                {user.email}
              </span>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Official Google Sign-in button */
          <button
            onClick={onLogin}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium transition shadow-sm border border-slate-200 active:scale-98"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span className="font-semibold text-slate-700">Sign in with Google</span>
          </button>
        )}
      </div>
    </header>
  );
};
