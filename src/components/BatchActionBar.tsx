import React, { useState } from 'react';
import { 
  Check, 
  RotateCcw, 
  FolderInput, 
  Trash2, 
  X, 
  CheckSquare
} from 'lucide-react';
import { TaskList } from '../types';

interface BatchActionBarProps {
  selectedCount: number;
  totalCount: number;
  lists: TaskList[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchComplete: (completed: boolean) => void;
  onBatchMove: (folderId: string) => void;
  onBatchDelete: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  totalCount,
  lists,
  onSelectAll,
  onDeselectAll,
  onBatchComplete,
  onBatchMove,
  onBatchDelete,
}) => {
  const [isMoveOpen, setIsMoveOpen] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[90%] sm:w-auto animate-in fade-in slide-in-from-bottom-3 duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 shadow-xl rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-800 dark:text-neutral-200">
        {/* Selection count & toggle */}
        <div className="flex items-center gap-2 pr-3 border-r border-neutral-200 dark:border-neutral-800">
          <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
            {selectedCount}
          </span>
          <span className="text-neutral-600 dark:text-neutral-400 font-medium">selected</span>
          
          {selectedCount < totalCount ? (
            <button
              onClick={onSelectAll}
              className="ml-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-mono"
            >
              (Select All {totalCount})
            </button>
          ) : (
            <button
              onClick={onDeselectAll}
              className="ml-1 text-[11px] text-neutral-400 hover:underline cursor-pointer font-mono"
            >
              (Deselect)
            </button>
          )}
        </div>

        {/* Batch actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Mark Done */}
          <button
            onClick={() => onBatchComplete(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition cursor-pointer shadow-2xs text-xs"
            title="Mark selected tasks as complete"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark Complete</span>
          </button>

          {/* Mark Incomplete */}
          <button
            onClick={() => onBatchComplete(false)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 bg-stone-50 dark:bg-neutral-800 rounded font-medium transition cursor-pointer text-xs"
            title="Mark selected tasks as active"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Mark Active</span>
          </button>

          {/* Move to Folder Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMoveOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 bg-stone-50 dark:bg-neutral-800 rounded font-medium transition cursor-pointer text-xs"
              title="Move selected tasks to a folder"
            >
              <FolderInput className="w-3.5 h-3.5 text-neutral-500" />
              <span>Move to Folder</span>
            </button>

            {isMoveOpen && (
              <div className="absolute bottom-full mb-1 left-0 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg py-1 z-50">
                <div className="px-3 py-1 text-[10px] font-mono text-neutral-400 uppercase">
                  Select destination:
                </div>
                {lists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => {
                      onBatchMove(list.id);
                      setIsMoveOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 truncate cursor-pointer"
                  >
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: list.color || '#2563eb' }} 
                    />
                    <span className="truncate">{list.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete Batch */}
          <button
            onClick={onBatchDelete}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded font-medium transition cursor-pointer text-xs"
            title="Delete selected tasks"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          {/* Dismiss / Deselect */}
          <button
            onClick={onDeselectAll}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer ml-1"
            title="Clear selection (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
