import React from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'N', desc: 'Create a new task (opens New Task modal)' },
    { key: 'T', desc: 'Switch to Today view' },
    { key: 'U', desc: 'Switch to Upcoming agenda view' },
    { key: 'C', desc: 'Switch to Calendar / Schedule view' },
    { key: 'A', desc: 'Switch to All Tasks view' },
    { key: 'S', desc: 'Switch to Starred tasks view' },
    { key: 'X', desc: 'Toggle multi-task Selection Mode' },
    { key: '1 - 7', desc: 'Jump to navigation views 01 through 07 (Trends)' },
    { key: '⌘K / Ctrl+K', desc: 'Focus Quick Add task bar' },
    { key: '⌘Enter / Ctrl+Enter', desc: 'Save task in editor modal' },
    { key: 'Esc', desc: 'Clear selection or close modals & drawers' },
    { key: '?', desc: 'Toggle this keyboard shortcuts cheatsheet' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl p-5 text-neutral-900 dark:text-neutral-100 max-h-[85vh] flex flex-col overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between pt-2 first:pt-0">
              <span className="text-xs text-neutral-600 dark:text-neutral-300">
                {sc.desc}
              </span>
              <kbd className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-[11px] font-mono text-neutral-800 dark:text-neutral-200 font-semibold shadow-2xs shrink-0 ml-3">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <span>Shortcuts disabled while typing</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded text-xs font-medium cursor-pointer"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
