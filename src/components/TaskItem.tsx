import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Check, 
  Calendar, 
  Star, 
  Trash2, 
  Edit3, 
  CalendarPlus, 
  FileText
} from 'lucide-react';
import { TaskItem as TaskItemType, TaskList, Priority } from '../types';

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
  onDelete,
  onScheduleToCalendar,
}) => {
  const [showNotes, setShowNotes] = useState(false);

  const list = lists.find(l => l.id === task.listId);
  const todayStr = new Date().toISOString().split('T')[0];

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextCompleted = !task.completed;
    
    if (nextCompleted) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 24,
        spread: 45,
        origin: { x, y },
        colors: ['#2563eb', '#e11d48'], // Strict 2-color confetti: Cobalt & Vermilion
        disableForReducedMotion: true,
      });
    }

    onToggleComplete(task.id, nextCompleted);
  };

  const getDueLabel = () => {
    if (!task.due) return null;
    const isOverdue = task.due < todayStr && !task.completed;
    const isToday = task.due === todayStr;

    let text = task.due;
    if (isToday) text = 'Today';
    else if (task.due === new Date(Date.now() + 86400000).toISOString().split('T')[0]) {
      text = 'Tomorrow';
    }

    if (task.dueTime) {
      text += ` ${task.dueTime}`;
    }

    return (
      <span className={`font-mono text-[11px] tabular-nums ${
        isOverdue || isToday ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-neutral-500'
      }`}>
        {text}
      </span>
    );
  };

  return (
    <div className={`group border-b border-neutral-200/60 dark:border-neutral-800/60 py-3 px-2 transition-colors select-none ${
      isSelected 
        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60' 
        : task.completed 
        ? 'opacity-40' 
        : 'hover:bg-neutral-100/50 dark:hover:bg-neutral-900/40'
    }`}>
      <div className="flex items-start gap-3">
        {/* Multi-selection Checkbox in Selection Mode */}
        {isSelectionMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(task.id);
            }}
            className={`w-4.5 h-4.5 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-neutral-300 dark:border-neutral-600 hover:border-blue-500 bg-white dark:bg-neutral-800'
            }`}
            aria-label={isSelected ? 'Deselect task' : 'Select task'}
            title={isSelected ? 'Deselect' : 'Select for batch action'}
          >
            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
          </button>
        )}

        {/* Architectural Minimal Checkbox - Cobalt Blue when checked */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          className={`w-4.5 h-4.5 mt-0.5 rounded-xs border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
            task.completed
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-600 bg-transparent'
          }`}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
        </button>

        {/* Content area */}
        <div 
          className="flex-1 min-w-0 cursor-pointer" 
          onClick={() => isSelectionMode ? onToggleSelect?.(task.id) : onEdit(task)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {/* Visual Folder / List Badge */}
            {list && (
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono tracking-wide border transition-colors shrink-0 ${
                  list.folderType === 'urgent' || list.id === 'default_urgent'
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 font-semibold'
                    : list.folderType === 'work' || list.id === 'default_work'
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 font-semibold'
                    : 'bg-stone-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 font-medium'
                }`}
                title={`Category / Folder: ${list.title}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: list.color || (list.folderType === 'urgent' ? '#e11d48' : '#2563eb') }}
                />
                <span className="truncate max-w-[150px]">{list.title}</span>
              </span>
            )}

            <span className={`text-sm tracking-tight leading-snug font-medium ${
              task.completed 
                ? 'line-through text-neutral-400 dark:text-neutral-500 font-normal' 
                : 'text-neutral-900 dark:text-neutral-100'
            }`}>
              {task.title}
            </span>

            {task.starred && (
              <Star className="w-3.5 h-3.5 text-rose-600 fill-rose-600 shrink-0" />
            )}
          </div>

          {/* Zero-Pill Unboxed Metadata Line with typographic separators */}
          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            {task.due && (
              <>
                {getDueLabel()}
                <span aria-hidden="true">·</span>
              </>
            )}

            <span className={`font-mono uppercase text-[10px] font-semibold ${
              task.priority === 'urgent' 
                ? 'text-rose-600 dark:text-rose-400 font-bold' 
                : task.priority === 'high' 
                ? 'text-rose-600/90 dark:text-rose-400/90' 
                : task.priority === 'medium'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-neutral-400'
            }`}>
              {task.priority}
            </span>

            {task.googleTaskId && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">Google Tasks</span>
              </>
            )}

            {task.calendarEventId && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">Scheduled</span>
              </>
            )}

            {task.notes && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotes(!showNotes);
                  }}
                  className="hover:text-blue-600 inline-flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  <span>{showNotes ? 'Hide note' : 'Note'}</span>
                </button>
              </>
            )}
          </div>

          {/* Notes display */}
          {showNotes && task.notes && (
            <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-300 font-normal leading-relaxed whitespace-pre-wrap pl-2 border-l border-neutral-300 dark:border-neutral-700">
              {task.notes}
            </div>
          )}
        </div>

        {/* Minimal Actions Bar */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!task.calendarEventId && !task.completed && (
            <button
              type="button"
              onClick={() => onScheduleToCalendar(task)}
              title={hasGoogleCalendarAuth ? "Block on Google Calendar" : "Sign in to schedule"}
              className="p-1 text-neutral-400 hover:text-blue-600 transition"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(task.id);
            }}
            title={task.starred ? "Unstar" : "Star"}
            className="p-1 text-neutral-400 hover:text-rose-600 transition"
          >
            <Star className={`w-3.5 h-3.5 ${task.starred ? 'fill-rose-600 text-rose-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onEdit(task)}
            title="Edit task"
            className="p-1 text-neutral-400 hover:text-blue-600 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id, task.title);
            }}
            title="Delete task"
            className="p-1 text-neutral-400 hover:text-rose-600 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
