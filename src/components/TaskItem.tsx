import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Check, 
  Clock, 
  Calendar, 
  Star, 
  Trash2, 
  Edit3, 
  CalendarPlus, 
  CheckCircle2, 
  CloudCheck,
  CloudOff,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { TaskItem as TaskItemType, TaskList, Priority } from '../types';

interface TaskItemProps {
  task: TaskItemType;
  lists: TaskList[];
  hasGoogleCalendarAuth: boolean;
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
      // Fire subtle confetti from the clicked position
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { x, y },
        colors: ['#6366f1', '#10b981', '#38bdf8', '#fbbf24'],
        disableForReducedMotion: true,
      });
    }

    onToggleComplete(task.id, nextCompleted);
  };

  const getDueBadge = () => {
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
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
        isOverdue
          ? 'bg-rose-950/40 text-rose-400 border-rose-800/50'
          : isToday
          ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
          : 'bg-slate-800/80 text-slate-300 border-slate-700/60'
      }`}>
        <Calendar className="w-3 h-3" />
        <span>{text}</span>
      </span>
    );
  };

  const priorityConfig: Record<Priority, { label: string; badge: string }> = {
    low: { label: 'Low', badge: 'bg-slate-800 text-slate-400 border-slate-700' },
    medium: { label: 'Med', badge: 'bg-blue-950/50 text-blue-400 border-blue-800/40' },
    high: { label: 'High', badge: 'bg-amber-950/50 text-amber-400 border-amber-800/40' },
    urgent: { label: 'Urgent', badge: 'bg-rose-950/50 text-rose-400 border-rose-800/50 font-bold' },
  };

  return (
    <div className={`group rounded-xl border transition-all duration-150 p-3 select-none ${
      task.completed
        ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-md'
    }`}>
      <div className="flex items-start gap-3">
        {/* Animated Checkbox */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center transition-all duration-150 shrink-0 ${
            task.completed
              ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
              : 'border-slate-600 hover:border-indigo-400 bg-slate-800/60'
          }`}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Content Area */}
        <div className="flex-1 min-w-0" onClick={() => onEdit(task)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium leading-snug break-words ${
              task.completed ? 'line-through text-slate-400' : 'text-slate-100 hover:text-indigo-300'
            }`}>
              {task.title}
            </span>

            {/* Star icon if starred */}
            {task.starred && (
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
            )}
          </div>

          {/* Metadata badges row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* List pill */}
            {list && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800/80">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: list.color || '#6366f1' }}
                />
                <span>{list.title}</span>
              </span>
            )}

            {/* Due date badge */}
            {getDueBadge()}

            {/* Priority tag */}
            {task.priority !== 'medium' && (
              <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${priorityConfig[task.priority].badge}`}>
                {priorityConfig[task.priority].label}
              </span>
            )}

            {/* Google Tasks Sync Indicator */}
            {task.googleTaskId ? (
              <span 
                className="inline-flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-950/40 border border-indigo-900/40 px-1.5 py-0.5 rounded" 
                title="Synced with Google Tasks"
              >
                <CheckCircle2 className="w-2.5 h-2.5 text-indigo-400" />
                <span>Google Tasks</span>
              </span>
            ) : task.syncStatus === 'local_only' ? (
              <span 
                className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800"
                title="Stored locally (offline ready)"
              >
                <span>Local</span>
              </span>
            ) : null}

            {/* Calendar Scheduled indicator */}
            {task.calendarEventId && (
              <span 
                className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.5 rounded font-medium"
                title="Scheduled on Google Calendar"
              >
                <Calendar className="w-2.5 h-2.5" />
                <span>On Calendar</span>
              </span>
            )}

            {/* Has notes badge */}
            {task.notes && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotes(!showNotes);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                <span>{showNotes ? 'Hide notes' : 'Notes'}</span>
              </button>
            )}
          </div>

          {/* Expanded Notes preview */}
          {showNotes && task.notes && (
            <div className="mt-2.5 p-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {task.notes}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
          {/* Schedule to Calendar Button */}
          {!task.calendarEventId && !task.completed && (
            <button
              type="button"
              onClick={() => onScheduleToCalendar(task)}
              title={hasGoogleCalendarAuth ? "Schedule on Google Calendar" : "Sign in to schedule on Google Calendar"}
              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
            >
              <CalendarPlus className="w-4 h-4" />
            </button>
          )}

          {/* Star toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(task.id);
            }}
            title={task.starred ? "Unstar task" : "Star task"}
            className={`p-1.5 rounded-lg transition ${
              task.starred
                ? 'text-amber-400 hover:bg-amber-950/30'
                : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800'
            }`}
          >
            <Star className={`w-4 h-4 ${task.starred ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => onEdit(task)}
            title="Edit task"
            className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Delete (Workspace requirement: explicit confirmation modal!) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id, task.title);
            }}
            title="Delete task"
            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
