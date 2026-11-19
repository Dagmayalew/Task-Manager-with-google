import React, { useState } from 'react';
import { 
  Check, 
  RotateCcw, 
  FolderInput, 
  Trash2, 
  X, 
  Copy
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
  onBatchCopy?: () => void;
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
  onBatchCopy,
}) => {
  const [isMoveOpen, setIsMoveOpen] = useState(false);

  if (selectedCount === 0) return null;

  const secondary =
    'flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink';

  return (
    <div className="fixed bottom-6 left-1/2 z-40 w-[90%] max-w-xl -translate-x-1/2 animate-in fade-in slide-in-from-bottom-3 duration-150 sm:w-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-[11.5px] text-ink shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)]">
        {/* Selection count */}
        <div className="flex items-center gap-2 border-r border-line pr-3">
          <span className="font-mono text-[12px] font-semibold text-accent tabular-nums">
            {selectedCount}
          </span>
          <span className="font-medium text-ink-2">selected</span>

          {selectedCount < totalCount ? (
            <button
              onClick={onSelectAll}
              className="ml-1 font-mono text-[10px] text-accent hover:underline"
            >
              (all {totalCount})
            </button>
          ) : (
            <button
              onClick={onDeselectAll}
              className="ml-1 font-mono text-[10px] text-ink-3 hover:underline"
            >
              (deselect)
            </button>
          )}
        </div>

        {/* Batch actions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onBatchComplete(true)}
            className="flex items-center gap-1.5 rounded-md bg-ink px-2.5 py-1.5 text-[11px] font-semibold text-paper transition-opacity hover:opacity-90"
            title="Mark selected tasks as complete"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Complete</span>
          </button>

          <button
            onClick={() => onBatchComplete(false)}
            className={secondary}
            title="Mark selected tasks as active"
          >
            <RotateCcw className="h-3.5 w-3.5 text-ink-3" />
            <span className="hidden sm:inline">Reopen</span>
          </button>

          {/* Move to collection */}
          <div className="relative">
            <button
              onClick={() => setIsMoveOpen((prev) => !prev)}
              className={secondary}
              title="Move selected tasks to a collection"
            >
              <FolderInput className="h-3.5 w-3.5 text-ink-3" />
              <span>Move</span>
            </button>

            {isMoveOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-1.5 w-48 rounded-lg border border-line bg-surface py-1 shadow-xl">
                <div className="px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
                  Move to
                </div>
                {lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => {
                      onBatchMove(list.id);
                      setIsMoveOpen(false);
                    }}
                    className="flex w-full items-center gap-2 truncate px-3 py-1.5 text-left text-[11.5px] text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: list.color || 'var(--ink-3)' }}
                    />
                    <span className="truncate">{list.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {onBatchCopy && (
            <button onClick={onBatchCopy} className={secondary} title="Copy selected tasks">
              <Copy className="h-3.5 w-3.5 text-ink-3" />
              <span>Copy</span>
            </button>
          )}

          <button
            onClick={onBatchDelete}
            className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] font-medium text-danger transition-colors hover:border-danger/40 hover:bg-danger-soft"
            title="Delete selected tasks"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>

          <button
            onClick={onDeselectAll}
            className="ml-1 grid h-7 w-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
            title="Clear selection (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
