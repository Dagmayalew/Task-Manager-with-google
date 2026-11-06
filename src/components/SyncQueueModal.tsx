import React from 'react';
import { 
  X, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Wifi, 
  WifiOff, 
  Database,
  ArrowRight
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
    CREATE_TASK: 'Create Task in Google Tasks',
    UPDATE_TASK: 'Update Task in Google Tasks',
    DELETE_TASK: 'Delete Task in Google Tasks',
    CREATE_LIST: 'Create List in Google Tasks',
    DELETE_LIST: 'Delete List in Google Tasks',
    SCHEDULE_CALENDAR_EVENT: 'Create Event in Google Calendar',
    DELETE_CALENDAR_EVENT: 'Delete Event in Google Calendar',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[85vh] flex flex-col overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Offline Storage & Sync Manager</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  isOnline 
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' 
                    : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                }`}>
                  {isOnline ? 'Connected' : 'Offline Mode'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                All data is cached locally for instant access anywhere.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Storage stats */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">Local Tasks</span>
            <span className="text-lg font-bold text-slate-100 font-mono">{tasksCount}</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">Task Lists</span>
            <span className="text-lg font-bold text-slate-100 font-mono">{listsCount}</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">Pending Queue</span>
            <span className={`text-lg font-bold font-mono ${queue.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {queue.length}
            </span>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-slate-300">
              Pending Sync Operations
            </span>
            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="text-[11px] text-rose-400 hover:text-rose-300 transition"
              >
                Clear Queue
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-semibold text-slate-200">Everything is in sync</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                No pending offline mutations. Your local data matches Google Tasks & Calendar.
              </p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300">
                    {actionLabels[item.action] || item.action}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Target: {item.payload?.title || item.payload?.taskId || item.payload?.id || 'Data update'}
                </div>
                {item.retries > 0 && (
                  <div className="text-[10px] text-amber-400">
                    Retried {item.retries} times
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-800">
          <span className="text-xs text-slate-500">
            Auto-syncs automatically when connection restores.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={onSyncNow}
              disabled={isSyncing || !isOnline}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg shadow-sm transition"
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
