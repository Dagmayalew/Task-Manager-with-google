import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  Flag, 
  ChevronDown, 
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { Priority, TaskList } from '../types';

interface QuickAddBarProps {
  lists: TaskList[];
  activeListId: string;
  hasGoogleCalendarAuth: boolean;
  onAddTask: (task: {
    title: string;
    notes?: string;
    listId: string;
    priority: Priority;
    due?: string;
    dueTime?: string;
    scheduleToCalendar?: boolean;
    calendarDurationMinutes?: number;
  }) => void;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  lists,
  activeListId,
  hasGoogleCalendarAuth,
  onAddTask,
}) => {
  const [title, setTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedListId, setSelectedListId] = useState(activeListId === 'all' ? (lists[0]?.id || 'default_my_tasks') : activeListId);
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState<string>('');
  const [scheduleToCalendar, setScheduleToCalendar] = useState<boolean>(false);
  const [calendarDuration, setCalendarDuration] = useState<number>(30);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync selectedListId when activeListId changes (if valid)
  useEffect(() => {
    if (activeListId !== 'all') {
      setSelectedListId(activeListId);
    } else if (lists.length > 0 && !lists.some(l => l.id === selectedListId)) {
      setSelectedListId(lists[0].id);
    }
  }, [activeListId, lists]);

  // Global shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsExpanded(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      listId: selectedListId,
      priority,
      due: dueDate || undefined,
      dueTime: dueTime || undefined,
      scheduleToCalendar: scheduleToCalendar && hasGoogleCalendarAuth,
      calendarDurationMinutes: calendarDuration,
    });

    setTitle('');
    setDueTime('');
    setScheduleToCalendar(false);
    if (!title.trim()) {
      setIsExpanded(false);
    }
  };

  const priorityColors: Record<Priority, { label: string; text: string; bg: string }> = {
    low: { label: 'Low', text: 'text-slate-400', bg: 'bg-slate-800' },
    medium: { label: 'Medium', text: 'text-blue-400', bg: 'bg-blue-950/60' },
    high: { label: 'High', text: 'text-amber-400', bg: 'bg-amber-950/60' },
    urgent: { label: 'Urgent', text: 'text-rose-400', bg: 'bg-rose-950/60' },
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition focus-within:border-indigo-500/70 focus-within:ring-2 focus-within:ring-indigo-500/20">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md text-indigo-400 bg-indigo-500/10">
            <Plus className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="Add task... (Press Enter to save, ⌘K to focus)"
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm transition shrink-0"
          >
            Add Task
          </button>
        </div>

        {/* Expandable Options Row */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            {/* List Picker */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300">
              <span className="text-slate-500">List:</span>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer"
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id} className="bg-slate-900 text-slate-200">
                    {list.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date Picker */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer"
              />
            </div>

            {/* Due Time Picker */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                placeholder="Time"
                className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer"
              />
            </div>

            {/* Priority Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <Flag className={`w-3.5 h-3.5 ${priorityColors[priority].text}`} />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={`bg-transparent outline-none cursor-pointer font-medium ${priorityColors[priority].text}`}
              >
                <option value="low" className="bg-slate-900 text-slate-400">Low Priority</option>
                <option value="medium" className="bg-slate-900 text-blue-400">Medium Priority</option>
                <option value="high" className="bg-slate-900 text-amber-400">High Priority</option>
                <option value="urgent" className="bg-slate-900 text-rose-400">Urgent</option>
              </select>
            </div>

            {/* Google Calendar Time Block Toggle */}
            <label className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer select-none transition ${
              scheduleToCalendar
                ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}>
              <input
                type="checkbox"
                checked={scheduleToCalendar}
                onChange={(e) => setScheduleToCalendar(e.target.checked)}
                className="accent-indigo-500 rounded"
              />
              <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
              <span>Block on Calendar</span>
              {scheduleToCalendar && (
                <select
                  value={calendarDuration}
                  onChange={(e) => setCalendarDuration(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-900 text-indigo-200 border border-indigo-800 rounded px-1 py-0.5 text-[11px] ml-1 outline-none"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hour</option>
                </select>
              )}
            </label>
          </div>
        )}
      </form>
    </div>
  );
};
