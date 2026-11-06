import React from 'react';
import { 
  X, 
  RefreshCw, 
  CheckCircle2
} from 'lucide-react';
import { SyncQueueItem } from '../types';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: SyncQueueItem[];
  isOnline: boolean;
  isSyncing: boolean;
  onSyncNow: () => void;
  onClearQueue: () => void;
  tasksCount: number;
  listsCount: number;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({
  isOpen,
  onClose,
  queue,
  isOnline,
  isSyncing,
  onSyncNow,
  onClearQueue,
  tasksCount,
  listsCount,
}) => {
  if (!isOpen) return null;

  const actionLabels: Record<string, string> = {
    CREATE_TASK: 'Create Task',
    UPDATE_TASK: 'Update Task',
    DELETE_TASK: 'Delete Task',
    CREATE_LIST: 'Create List',
    DELETE_LIST: 'Delete List',
    SCHEDULE_CALENDAR_EVENT: 'Schedule Calendar Event',
    DELETE_CALENDAR_EVENT: 'Delete Calendar Event',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl p-5 text-neutral-900 dark:text-neutral-100 max-h-[85vh] flex flex-col overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              Offline Storage
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Sync Manager
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Storage Metrics */}
        <div className="grid grid-cols-3 gap-2 my-3">
          <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-0.5">Local Tasks</span>
            <span className="text-base font-semibold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">{tasksCount}</span>
          </div>
          <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-0.5">Lists</span>
            <span className="text-base font-semibold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">{listsCount}</span>
          </div>
          <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-0.5">Pending</span>
            <span className="text-base font-semibold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">{queue.length}</span>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 py-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 pb-1">
            <span className="font-mono uppercase text-[10px]">Queue Items</span>
            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="text-neutral-400 hover:text-rose-600 transition"
              >
                Clear
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-neutral-300 dark:text-neutral-700" />
              <span>All changes in sync with Google Workspace.</span>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="p-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded text-xs space-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    {actionLabels[item.action] || item.action}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400 tabular-nums">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {item.payload?.title || item.payload?.taskId || item.payload?.id || 'Data record'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-neutral-200/80 dark:border-neutral-800/80">
          <span className="text-[11px] font-mono text-neutral-400">
            {isOnline ? 'Online mode' : 'Offline mode'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
            >
              Close
            </button>
            <button
              onClick={onSyncNow}
              disabled={isSyncing || !isOnline}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-md transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
