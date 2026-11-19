import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Puzzle,
  Monitor,
  Smartphone,
  PanelRight,
  LogOut,
  Sun,
  Moon,
  Keyboard,
  Check,
  Download,
  SlidersHorizontal,
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
  onOpenShortcuts?: () => void;
}

const modeOptions: Array<{
  id: ExtensionDisplayMode;
  label: string;
  hint: string;
  icon: React.ElementType;
}> = [
  { id: 'desktop', label: 'Full workspace', hint: 'Desktop', icon: Monitor },
  { id: 'popup', label: 'Extension popup', hint: '380px', icon: Smartphone },
  { id: 'sidepanel', label: 'Side panel', hint: '360px', icon: PanelRight },
];

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
  onOpenShortcuts,
}) => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toolsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToolsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toolsOpen]);

  const iconButton =
    'grid h-8 w-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-subtle hover:text-ink';

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-line bg-paper/85 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-5">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-ink font-serif text-[16px] leading-none text-paper">
            C
          </div>
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[13px] font-semibold tracking-tight text-ink">
              Chronotask
            </span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3 sm:inline">
              Studio
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            onClick={onOpenSyncQueueModal}
            className="hidden items-center gap-2 rounded-md px-2 py-1.5 text-ink-2 transition-colors hover:bg-subtle hover:text-ink sm:flex"
            title={isOnline ? 'Online — changes are saved and synced' : 'Offline — changes are queued locally'}
          >
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-danger" />
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {pendingSyncCount > 0 && (
              <span className="rounded bg-danger-soft px-1 font-mono text-[10px] font-semibold text-danger tabular-nums">
                {pendingSyncCount}
              </span>
            )}
          </button>

          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className={iconButton}
            title={isSyncing ? 'Syncing…' : 'Sync now'}
            aria-label="Sync now"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-accent' : ''}`} />
          </button>

          <button
            onClick={onToggleTheme}
            className={iconButton}
            title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          <span className="mx-1.5 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />

          {/* Tools menu */}
          <div className="relative" ref={wrapRef}>
            <button
              onClick={() => setToolsOpen((open) => !open)}
              className={`${iconButton} ${toolsOpen ? 'bg-subtle text-ink' : ''}`}
              title="Tools & extension"
              aria-label="Tools and extension"
              aria-haspopup="menu"
              aria-expanded={toolsOpen}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            {toolsOpen && (
              <>
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  aria-label="Close menu"
                  tabIndex={-1}
                  onClick={() => setToolsOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)]"
                >
                  <p className="px-2.5 pb-1 pt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">
                    Preview as
                  </p>
                  {modeOptions.map((option) => {
                    const Icon = option.icon;
                    const active = displayMode === option.id;
                    return (
                      <button
                        key={option.id}
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => {
                          onSetDisplayMode(option.id);
                          setToolsOpen(false);
                        }}
                        className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12px] transition-colors ${
                          active ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-subtle hover:text-ink'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="flex-1 font-medium">{option.label}</span>
                        <span className="font-mono text-[9px] text-ink-3">{option.hint}</span>
                        {active && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })}

                  <div className="my-1.5 h-px bg-line" />

                  <button
                    role="menuitem"
                    onClick={() => {
                      onOpenExtensionModal();
                      setToolsOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12px] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="flex-1">Download extension</span>
                    <span className="font-mono text-[9px] text-ink-3">.zip</span>
                  </button>

                  <button
                    role="menuitem"
                    onClick={() => {
                      onOpenSyncQueueModal();
                      setToolsOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12px] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="flex-1">Sync queue</span>
                    <span className="font-mono text-[10px] text-ink-3 tabular-nums">
                      {pendingSyncCount}
                    </span>
                  </button>

                  {onOpenShortcuts && (
                    <button
                      role="menuitem"
                      onClick={() => {
                        onOpenShortcuts();
                        setToolsOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[12px] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
                    >
                      <Keyboard className="h-3.5 w-3.5" />
                      <span className="flex-1">Keyboard shortcuts</span>
                      <kbd className="rounded border border-line px-1 font-mono text-[9px] text-ink-3">?</kbd>
                    </button>
                  )}

                  <div className="mt-1 flex items-center gap-2 rounded-md bg-paper px-2.5 py-2">
                    <Puzzle className="h-3 w-3 shrink-0 text-ink-3" />
                    <p className="text-[10px] leading-snug text-ink-3">
                      Chrome extension syncs this workspace with any tab.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />

          {/* Account */}
          {user ? (
            <div className="flex items-center gap-1.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google account'}
                  className="h-7 w-7 rounded-full border border-line object-cover"
                />
              ) : (
                <div className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[10px] font-bold text-paper">
                  {(user.displayName || 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden max-w-[110px] truncate text-[12px] font-medium text-ink-2 md:inline">
                {user.displayName?.split(' ')[0] || 'User'}
              </span>
              <button
                onClick={onLogout}
                className="grid h-8 w-8 place-items-center rounded-md text-ink-3 transition-colors hover:bg-subtle hover:text-danger"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-subtle"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
