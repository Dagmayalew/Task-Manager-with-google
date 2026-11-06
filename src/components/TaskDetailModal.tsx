import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Star, 
  Check, 
  Trash2, 
  CalendarPlus 
} from 'lucide-react';
import { TaskItem, TaskList, Priority } from '../types';

interface TaskDetailModalProps {
  task: TaskItem | null;
  lists: TaskList[];
  hasGoogleCalendarAuth: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: TaskItem) => void;
  onDelete: (id: string, title: string) => void;
  onScheduleToCalendar: (task: TaskItem, startTime: string, durationMinutes: number) => void;
  onRemoveFromCalendar: (task: TaskItem) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  lists,
  hasGoogleCalendarAuth,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onScheduleToCalendar,
  onRemoveFromCalendar,
}) => {
  if (!isOpen || !task) return null;

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');
  const [listId, setListId] = useState(task.listId);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [due, setDue] = useState(task.due || '');
  const [dueTime, setDueTime] = useState(task.dueTime || '');
  const [starred, setStarred] = useState(task.starred || false);
  const [completed, setCompleted] = useState(task.completed);

  const [calendarDate, setCalendarDate] = useState(task.due || new Date().toISOString().split('T')[0]);
  const [calendarStartTime, setCalendarStartTime] = useState(task.dueTime || '10:00');
  const [calendarDuration, setCalendarDuration] = useState<number>(30);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes || '');
      setListId(task.listId);
      setPriority(task.priority);
      setDue(task.due || '');
      setDueTime(task.dueTime || '');
      setStarred(task.starred || false);
      setCompleted(task.completed);
      setCalendarDate(task.due || new Date().toISOString().split('T')[0]);
      setCalendarStartTime(task.dueTime || '10:00');
    }
  }, [task]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      ...task,
      title: title.trim(),
      notes: notes.trim(),
      listId,
      priority,
      due: due || undefined,
      dueTime: dueTime || undefined,
      starred,
      completed,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleTriggerScheduleCalendar = () => {
    if (!calendarDate || !calendarStartTime) return;
    const startIso = `${calendarDate}T${calendarStartTime}:00`;
    onScheduleToCalendar(task, startIso, calendarDuration);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl p-5 text-neutral-900 dark:text-neutral-100 max-h-[90vh] flex flex-col overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompleted(!completed)}
              className={`w-4.5 h-4.5 rounded-xs border flex items-center justify-center transition ${
                completed
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
            >
              {completed && <Check className="w-3 h-3 stroke-[2.5]" />}
            </button>
            <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              {completed ? 'Completed' : 'Task Detail'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStarred(!starred)}
              className="p-1 rounded transition text-neutral-400 hover:text-rose-600"
              title="Star task"
            >
              <Star className={`w-4 h-4 ${starred ? 'fill-rose-600 text-rose-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details, notes, links..."
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none leading-relaxed resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">List</label>
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-2.5 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none cursor-pointer"
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-2.5 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none cursor-pointer font-medium"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">Due Date</label>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-2.5 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">Due Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-2.5 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 font-mono outline-none"
              />
            </div>
          </div>

          {/* Google Calendar Section */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                Google Calendar
              </span>
              {task.calendarEventId && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  Synced
                </span>
              )}
            </div>

            {task.calendarEventId ? (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-neutral-500">Scheduled on primary calendar</span>
                <button
                  type="button"
                  onClick={() => onRemoveFromCalendar(task)}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Remove Event
                </button>
              </div>
            ) : hasGoogleCalendarAuth ? (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400">Date</label>
                    <input
                      type="date"
                      value={calendarDate}
                      onChange={(e) => setCalendarDate(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400">Time</label>
                    <input
                      type="time"
                      value={calendarStartTime}
                      onChange={(e) => setCalendarStartTime(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400">Duration</label>
                    <select
                      value={calendarDuration}
                      onChange={(e) => setCalendarDuration(Number(e.target.value))}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-xs"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerScheduleCalendar}
                  className="w-full py-1.5 px-3 border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded text-xs font-medium transition cursor-pointer"
                >
                  + Block Time on Calendar
                </button>
              </div>
            ) : (
              <p className="text-xs text-neutral-400">
                Sign in with Google in the top bar to block this task on your Google Calendar.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-200/80 dark:border-neutral-800/80">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(task.id, task.title);
            }}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-2xs cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
