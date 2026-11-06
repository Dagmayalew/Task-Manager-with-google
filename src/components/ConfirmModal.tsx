import React from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl p-5 text-neutral-900 dark:text-neutral-100 relative"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="pr-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
            {isDestructive ? 'Notice' : 'Confirmation'}
          </span>
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2">
            {title}
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-medium rounded transition ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
