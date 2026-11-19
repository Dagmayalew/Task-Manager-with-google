import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Check,
  Calendar,
  Star,
  Trash2,
  Pencil,
  CalendarPlus,
  FileText,
  Copy,
  MoreHorizontal,
  CalendarCheck2,
  Cloud,
} from 'lucide-react';
import { TaskItem as TaskItemType, TaskList } from '../types';

interface TaskItemProps {
  task: TaskItemType;
  lists: TaskList[];
  hasGoogleCalendarAuth: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onToggleStar: (id: string) => void;
  onEdit: (task: TaskItemType) => void;
  onCopy: (task: TaskItemType) => void;
  onDelete: (id: string, title: string) => void;
  onScheduleToCalendar: (task: TaskItemType) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  lists,
  hasGoogleCalendarAuth,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onToggleComplete,
  onToggleStar,
  onEdit,
  onCopy,
  onDelete,
  onScheduleToCalendar,
}) => {
  const [showNotes, setShowNotes] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const list = lists.find((l) => l.id === (task.folderId || task.listId));

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextCompleted = !task.completed;

    if (nextCompleted) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      confetti({
        particleCount: 22,
        spread: 42,
        startVelocity: 22,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: ['#1e4fd8', '#b42318'],
        disableForReducedMotion: true,
      });
    }

    onToggleComplete(task.id, nextCompleted);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const dueDate = task.due?.slice(0, 10);
  const isOverdue = Boolean(dueDate && dueDate < todayStr && !task.completed);
  const isToday = dueDate === todayStr;

  const dueLabel = (() => {
    if (!dueDate) return null;
    let label: string;
    if (isToday) {
      label = 'Today';
    } else if (dueDate === new Date(Date.now() + 86_400_000).toISOString().split('T')[0]) {
      label = 'Tomorrow';
    } else {
      const parsed = new Date(`${dueDate}T00:00:00`);
      label = Number.isNaN(parsed.getTime())
        ? dueDate
        : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    if (isOverdue) label = `Overdue · ${label}`;
    return task.dueTime ? `${label}, ${task.dueTime}` : label;
  })();

  const priorityTone =
    task.priority === 'urgent' || task.priority === 'high'
      ? 'text-danger'
      : task.priority === 'medium'
        ? 'text-accent'
        : 'text-ink-3';

  const menuItem =
    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink';

  return (
    <div
      className={`group relative flex items-start gap-3 border-b border-line px-2 py-3.5 transition-colors last:border-b-0 ${
        isSelected
          ? 'bg-accent-soft'
          : task.completed
            ? 'opacity-55'
            : 'hover:bg-subtle/50'
      }`}
    >
      {isSelectionMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(task.id);
          }}
          aria-label={isSelected ? 'Deselect task' : 'Select task'}
          className={`mt-0.5 grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[4px] border transition-colors ${
            isSelected
              ? 'border-accent bg-accent text-accent-ink'
              : 'border-line-strong bg-surface hover:border-accent'
          }`}
        >
          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
        </button>
      )}

      {/* Complete */}
      <button
        type="button"
        onClick={handleCheckboxClick}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        className={`mt-0.5 grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[4px] border transition-all ${
          task.completed
            ? 'border-accent bg-accent text-accent-ink'
            : 'border-line-strong bg-transparent hover:border-accent hover:bg-accent-soft'
        }`}
      >
        {task.completed && <Check className="h-3 w-3 stroke-[3]" />}
      </button>

      {/* Content */}
      <div
        className="min-w-0 flex-1 cursor-pointer"
        onClick={() => (isSelectionMode ? onToggleSelect?.(task.id) : onEdit(task))}
      >
        <div className="flex items-start gap-2">
          <p
            className={`text-[13.5px] font-medium leading-[1.45] tracking-[-0.005em] ${
              task.completed ? 'text-ink-3 line-through' : 'text-ink'
            }`}
          >
            {task.title}
          </p>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-3">
          {dueLabel && (
            <span
              className={`inline-flex items-center gap-1 font-mono text-[10.5px] tabular-nums ${
                isOverdue ? 'font-semibold text-danger' : isToday ? 'text-ink-2' : ''
              }`}
            >
              <Calendar className="h-3 w-3 opacity-70" />
              {dueLabel}
            </span>
          )}

          {list && (
            <span className="inline-flex items-center gap-1.5">
              {dueLabel && <span aria-hidden="true" className="opacity-40">·</span>}
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: list.color || 'var(--ink-3)' }}
                aria-hidden="true"
              />
              <span className="max-w-[140px] truncate">{list.title}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="opacity-40">·</span>
            <span
              className={`font-mono text-[9px] font-semibold uppercase tracking-[0.1em] ${priorityTone}`}
            >
              {task.priority}
            </span>
          </span>

          {task.notes && (
            <>
              <span aria-hidden="true" className="opacity-40">·</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotes((v) => !v);
                }}
                className="inline-flex items-center gap-1 transition-colors hover:text-ink"
                aria-expanded={showNotes}
              >
                <FileText className="h-3 w-3" />
                {showNotes ? 'Hide note' : 'Note'}
              </button>
            </>
          )}

          {(task.googleTaskId || task.calendarEventId) && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="opacity-40">·</span>
              {task.googleTaskId && (
                <span title="Synced with Google Tasks" className="inline-flex items-center gap-1">
                  <Cloud className="h-3 w-3 text-accent/70" />
                  Google
                </span>
              )}
              {task.calendarEventId && (
                <span
                  title="Time-blocked on Google Calendar"
                  className="inline-flex items-center gap-1"
                >
                  <CalendarCheck2 className="h-3 w-3 text-accent/70" />
                  Scheduled
                </span>
              )}
            </span>
          )}
        </div>

        {showNotes && task.notes && (
          <p className="mt-2 whitespace-pre-wrap border-l border-line-strong pl-2.5 text-[12px] leading-relaxed text-ink-2">
            {task.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(task.id);
          }}
          title={task.starred ? 'Unstar task' : 'Star task'}
          aria-label={task.starred ? 'Unstar task' : 'Star task'}
          className={`grid h-7 w-7 place-items-center rounded-md transition-all hover:bg-surface ${
            task.starred
              ? 'text-warn'
              : 'text-ink-3 opacity-0 hover:text-warn group-hover:opacity-100 focus-visible:opacity-100'
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${task.starred ? 'fill-warn' : ''}`} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            title="More actions"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`grid h-7 w-7 place-items-center rounded-md text-ink-3 transition-all hover:bg-surface hover:text-ink focus-visible:opacity-100 ${
              menuOpen ? 'bg-surface text-ink opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              <button
                className="fixed inset-0 z-20 cursor-default"
                aria-label="Close task menu"
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+6px)] z-30 w-48 rounded-lg border border-line bg-surface p-1 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.3)]"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(task);
                  }}
                  className={menuItem}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit details
                </button>
                {!task.calendarEventId && !task.completed && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onScheduleToCalendar(task);
                    }}
                    className={menuItem}
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    {hasGoogleCalendarAuth ? 'Block on calendar' : 'Schedule (sign in)'}
                  </button>
                )}
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleStar(task.id);
                  }}
                  className={menuItem}
                >
                  <Star className={`h-3.5 w-3.5 ${task.starred ? 'fill-warn text-warn' : ''}`} />
                  {task.starred ? 'Remove star' : 'Star task'}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onCopy(task);
                  }}
                  className={menuItem}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy task
                </button>
                <div className="my-1 h-px bg-line" />
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(task.id, task.title);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium text-danger transition-colors hover:bg-danger-soft"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete task
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
