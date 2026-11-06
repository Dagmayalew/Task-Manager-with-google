import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  CalendarDays
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

  useEffect(() => {
    if (activeListId !== 'all') {
      setSelectedListId(activeListId);
    } else if (lists.length > 0 && !lists.some(l => l.id === selectedListId)) {
      setSelectedListId(lists[0].id);
    }
  }, [activeListId, lists]);

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
  };

  return (
    <div className="border border-neutral-200/80 dark:border-neutral-800/80 focus-within:border-blue-600 dark:focus-within:border-blue-500 bg-white dark:bg-neutral-900 rounded-lg p-3 transition-colors shadow-2xs">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="Add new task... (Press Enter to save, ⌘K)"
            className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 outline-none font-sans"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-2xs cursor-pointer"
          >
            Add Task
          </button>
        </div>

        {/* Minimalist Options Drawer */}
        {isExpanded && (
          <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
            {/* List selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 font-mono text-[10px] uppercase">List:</span>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="bg-transparent text-neutral-800 dark:text-neutral-200 outline-none cursor-pointer text-xs"
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id} className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
                    {list.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-transparent text-neutral-800 dark:text-neutral-200 outline-none text-xs font-mono"
              />
            </div>

            {/* Due Time */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="bg-transparent text-neutral-800 dark:text-neutral-200 outline-none text-xs font-mono"
              />
            </div>

            {/* Priority */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 font-mono text-[10px] uppercase">Priority:</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="bg-transparent outline-none cursor-pointer text-xs font-medium text-neutral-800 dark:text-neutral-200"
              >
                <option value="low" className="bg-white dark:bg-neutral-900">Low</option>
                <option value="medium" className="bg-white dark:bg-neutral-900">Medium</option>
                <option value="high" className="bg-white dark:bg-neutral-900">High</option>
                <option value="urgent" className="bg-white dark:bg-neutral-900">Urgent</option>
              </select>
            </div>

            {/* Block on Google Calendar */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none ml-auto">
              <input
                type="checkbox"
                checked={scheduleToCalendar}
                onChange={(e) => setScheduleToCalendar(e.target.checked)}
                className="rounded-xs border-neutral-300 dark:border-neutral-700 accent-neutral-900 dark:accent-white"
              />
              <CalendarDays className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-xs">Schedule on Calendar</span>
              {scheduleToCalendar && (
                <select
                  value={calendarDuration}
                  onChange={(e) => setCalendarDuration(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded px-1.5 py-0.5 text-[11px] ml-1 outline-none"
                >
                  <option value={15}>15m</option>
                  <option value={30}>30m</option>
                  <option value={45}>45m</option>
                  <option value={60}>1h</option>
                  <option value={90}>1.5h</option>
                </select>
              )}
            </label>
          </div>
        )}
      </form>
    </div>
  );
};
