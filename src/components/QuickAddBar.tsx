import React, { useState, useRef, useEffect } from 'react';
import { Plus, Calendar, Clock, CalendarDays, CornerDownLeft } from 'lucide-react';
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
  const [selectedListId, setSelectedListId] = useState(
    activeListId === 'all' ? lists[0]?.id || 'default_my_tasks' : activeListId
  );
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState<string>('');
  const [scheduleToCalendar, setScheduleToCalendar] = useState<boolean>(false);
  const [calendarDuration, setCalendarDuration] = useState<number>(30);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeListId !== 'all') {
      setSelectedListId(activeListId);
    } else if (lists.length > 0 && !lists.some((l) => l.id === selectedListId)) {
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
    inputRef.current?.focus();
  };

  const fieldClass =
    'flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] text-ink-2 transition-colors hover:bg-subtle';
  const selectClass =
    'cursor-pointer bg-transparent text-[11.5px] font-medium text-ink outline-none';
  const labelClass =
    'font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3';

  return (
    <div className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(20,20,20,0.04)] transition-all focus-within:border-line-strong focus-within:shadow-[0_2px_12px_-4px_rgba(20,20,20,0.12)]">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Plus className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="Add a task…"
            aria-label="New task title"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
          />
          <span className="hidden items-center gap-1 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-3 sm:flex">
            <CornerDownLeft className="h-2.5 w-2.5" />
            Enter
          </span>
          <button
            type="submit"
            disabled={!title.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-[11.5px] font-semibold text-paper transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </button>
        </div>

        {isExpanded && (
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 border-t border-line px-3 py-2">
            <label className={fieldClass}>
              <span className={labelClass}>List</span>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className={`${selectClass} max-w-[130px]`}
                aria-label="Task list"
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </label>

            <label className={fieldClass}>
              <Calendar className="h-3.5 w-3.5 text-ink-3" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`${selectClass} font-mono text-[11px]`}
                aria-label="Due date"
              />
            </label>

            <label className={fieldClass}>
              <Clock className="h-3.5 w-3.5 text-ink-3" />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className={`${selectClass} font-mono text-[11px]`}
                aria-label="Due time"
              />
            </label>

            <label className={fieldClass}>
              <span className={labelClass}>Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={selectClass}
                aria-label="Priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>

            <label className="ml-auto flex cursor-pointer select-none items-center gap-1.5 rounded-md px-1.5 py-1 text-[11.5px] text-ink-2 transition-colors hover:bg-subtle">
              <input
                type="checkbox"
                checked={scheduleToCalendar}
                onChange={(e) => setScheduleToCalendar(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-line accent-accent"
              />
              <CalendarDays className="h-3.5 w-3.5 text-ink-3" />
              <span>Calendar block</span>
              {scheduleToCalendar && (
                <select
                  value={calendarDuration}
                  onChange={(e) => setCalendarDuration(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="ml-0.5 cursor-pointer rounded bg-subtle px-1.5 py-0.5 text-[10.5px] text-ink outline-none"
                  aria-label="Calendar block duration"
                >
                  <option value={15}>15m</option>
                  <option value={30}>30m</option>
                  <option value={45}>45m</option>
                  <option value={60}>1h</option>
                  <option value={90}>1.5h</option>
                </select>
              )}
            </label>

            {!hasGoogleCalendarAuth && scheduleToCalendar && (
              <span className="w-full font-mono text-[9px] uppercase tracking-wide text-warn">
                Sign in to block time on Google Calendar
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
