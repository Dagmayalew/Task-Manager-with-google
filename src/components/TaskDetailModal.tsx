import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Flag, 
  Trash2, 
  CalendarPlus, 
  Star, 
  CheckCircle2, 
  ExternalLink 
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

  // Calendar scheduling local state
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompleted(!completed)}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                completed
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'border-slate-600 bg-slate-800 hover:border-indigo-400'
              }`}
            >
              {completed && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {completed ? 'Completed Task' : 'Edit Task'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStarred(!starred)}
              className={`p-1.5 rounded-lg transition ${
                starred ? 'text-amber-400 bg-amber-950/30' : 'text-slate-400 hover:text-amber-400'
              }`}
              title="Star task"
            >
              <Star className={`w-4 h-4 ${starred ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm outline-none transition"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Notes / Description</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details, markdown notes, URLs, checklists..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm outline-none transition resize-none"
            />
          </div>

          {/* List & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">List</label>
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-xs outline-none cursor-pointer"
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-xs outline-none cursor-pointer"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-xs outline-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Due Time (Optional)</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 text-xs outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Google Calendar Time-Blocking Section */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">Google Calendar Schedule</span>
              </div>
              {task.calendarEventId ? (
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  Synced to Calendar
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Time-block focus session</span>
              )}
            </div>

            {task.calendarEventId ? (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-slate-400">
                  Event created on primary Google Calendar.
                </p>
                <button
                  type="button"
                  onClick={() => onRemoveFromCalendar(task)}
                  className="text-xs text-rose-400 hover:text-rose-300 transition hover:underline"
                >
                  Remove from Calendar
                </button>
              </div>
            ) : hasGoogleCalendarAuth ? (
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">Date</label>
                    <input
                      type="date"
                      value={calendarDate}
                      onChange={(e) => setCalendarDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Start Time</label>
                    <input
                      type="time"
                      value={calendarStartTime}
                      onChange={(e) => setCalendarStartTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Duration</label>
                    <select
                      value={calendarDuration}
                      onChange={(e) => setCalendarDuration(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hour</option>
                      <option value={90}>1.5 hours</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerScheduleCalendar}
                  className="w-full py-1.5 px-3 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Block Time on Google Calendar</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Sign in with Google in the top bar to block this task directly on your live Google Calendar.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(task.id, task.title);
            }}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 px-3 py-2 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Task</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
