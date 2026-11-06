import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  RefreshCw
} from 'lucide-react';
import { CalendarEvent, TaskItem } from '../types';

interface CalendarScheduleViewProps {
  events: CalendarEvent[];
  tasks: TaskItem[];
  hasGoogleCalendarAuth: boolean;
  isSyncing: boolean;
  onRefreshEvents: () => void;
  onScheduleTask: (task: TaskItem, startTime: string, durationMinutes: number) => void;
  onQuickAddCalendarBlock: (title: string, startTime: string, durationMinutes: number) => void;
}

export const CalendarScheduleView: React.FC<CalendarScheduleViewProps> = ({
  events,
  tasks,
  hasGoogleCalendarAuth,
  isSyncing,
  onRefreshEvents,
  onScheduleTask,
  onQuickAddCalendarBlock,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [quickBlockTitle, setQuickBlockTitle] = useState('');
  const [quickBlockHour, setQuickBlockHour] = useState('09:00');
  const [quickBlockDuration, setQuickBlockDuration] = useState(45);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  const dayEvents = events.filter((ev) => {
    const startStr = ev.start.dateTime || ev.start.date;
    if (!startStr) return false;
    return startStr.startsWith(selectedDate);
  });

  const dayTasks = tasks.filter((t) => {
    if (t.calendarScheduledTime?.start?.startsWith(selectedDate)) return true;
    return t.due === selectedDate;
  });

  const unscheduledTasks = tasks.filter((t) => !t.completed && !t.calendarEventId);

  const formatHourLabel = (hour: number) => {
    return `${String(hour).padStart(2, '0')}:00`;
  };

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBlockTitle.trim()) return;
    const startIso = `${selectedDate}T${quickBlockHour}:00`;
    onQuickAddCalendarBlock(quickBlockTitle.trim(), startIso, quickBlockDuration);
    setQuickBlockTitle('');
    setShowBlockModal(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-50 dark:bg-neutral-950 transition-colors">
      {/* Top Header - Swiss Timetable Bar */}
      <div className="px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-md p-0.5 bg-neutral-100/50 dark:bg-neutral-950">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className={`px-2.5 py-0.5 text-xs font-mono font-medium rounded transition ${
                isToday
                  ? 'bg-blue-600 text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => shiftDate(1)}
              className="p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border border-neutral-200 dark:border-neutral-800 rounded px-2 py-0.5 text-xs text-neutral-700 dark:text-neutral-300 font-mono outline-none"
            />
            <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {hasGoogleCalendarAuth && (
            <button
              onClick={onRefreshEvents}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}

          <button
            onClick={() => setShowBlockModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Block Time</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Swiss Timetable + Unscheduled Tasks Drawer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {hours.map((hour) => {
            const hourPrefix = String(hour).padStart(2, '0');
            const hourEvents = dayEvents.filter((ev) => {
              const dt = ev.start.dateTime;
              if (!dt) return false;
              return new Date(dt).getHours() === hour;
            });

            const hourTasks = dayTasks.filter((t) => {
              if (t.calendarScheduledTime?.start) {
                return new Date(t.calendarScheduledTime.start).getHours() === hour;
              }
              if (t.dueTime) {
                return t.dueTime.startsWith(hourPrefix);
              }
              return false;
            });

            return (
              <div key={hour} className="flex gap-4 group">
                {/* 24-Hour Monospace label */}
                <div className="w-14 pt-1 text-right font-mono text-xs text-neutral-400 dark:text-neutral-600 tabular-nums select-none shrink-0">
                  {formatHourLabel(hour)}
                </div>

                {/* Hour slot row */}
                <div className="flex-1 min-h-[56px] border-t border-neutral-200/80 dark:border-neutral-800/80 pt-1.5 pb-2 flex flex-col gap-2">
                  {hourEvents.length === 0 && hourTasks.length === 0 && (
                    <div 
                      onClick={() => {
                        setQuickBlockHour(`${hourPrefix}:00`);
                        setShowBlockModal(true);
                      }}
                      className="h-full min-h-[40px] rounded border border-dashed border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer flex items-center px-2 text-xs text-neutral-400 transition"
                    >
                      <span className="opacity-0 group-hover:opacity-100 font-mono text-[11px]">
                        + Schedule at {hourPrefix}:00
                      </span>
                    </div>
                  )}

                  {/* Render Google Calendar Events - Cobalt Blue indicator */}
                  {hourEvents.map((ev) => {
                    const startTime = ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const endTime = ev.end.dateTime ? new Date(ev.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <div
                        key={ev.id}
                        className="bg-white dark:bg-neutral-900 border border-neutral-300/80 dark:border-neutral-700/80 rounded-md p-2.5 text-neutral-900 dark:text-neutral-100 flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-6 rounded-xs bg-blue-600 shrink-0" />
                          <div>
                            <div className="text-xs font-semibold tracking-tight">{ev.title}</div>
                            <div className="text-[11px] text-neutral-500 font-mono tabular-nums">
                              {startTime} – {endTime}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">
                          Calendar
                        </span>
                      </div>
                    );
                  })}

                  {/* Render Tasks scheduled for this hour - Swiss Vermilion indicator */}
                  {hourTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`rounded-md p-2.5 border flex items-center justify-between transition ${
                        t.completed
                          ? 'bg-neutral-100/50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 text-neutral-400 line-through'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-1.5 h-6 rounded-xs bg-rose-600 shrink-0" />
                        <div>
                          <div className="text-xs font-medium">{t.title}</div>
                          {t.dueTime && (
                            <div className="text-[10px] text-neutral-400 font-mono tabular-nums">
                              Due: {t.dueTime}
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold">
                        Task
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Unscheduled Tasks Drawer on the right */}
        <div className="w-68 border-l border-neutral-200/80 dark:border-neutral-800/80 bg-white/50 dark:bg-neutral-900/50 p-4 hidden lg:flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Unscheduled
            </span>
            <span className="text-xs font-mono tabular-nums text-neutral-500">
              {unscheduledTasks.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pt-3 space-y-2">
            {unscheduledTasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-neutral-400">
                All tasks scheduled.
              </div>
            ) : (
              unscheduledTasks.slice(0, 15).map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-md space-y-2 transition shadow-2xs"
                >
                  <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
                    {task.title}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono text-neutral-400">
                      {task.due ? task.due : 'No date'}
                    </span>
                    <button
                      onClick={() => {
                        const defaultStart = `${selectedDate}T10:00:00`;
                        onScheduleTask(task, defaultStart, 30);
                      }}
                      className="px-2 py-0.5 text-[10px] font-medium text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition"
                    >
                      + 30m
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Focus Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 shadow-xl text-neutral-900 dark:text-neutral-100">
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-500 mb-3">
              Block Focus Time on Google Calendar
            </h3>

            <form onSubmit={handleAddBlock} className="space-y-3">
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Focus Title</label>
                <input
                  type="text"
                  value={quickBlockTitle}
                  onChange={(e) => setQuickBlockTitle(e.target.value)}
                  placeholder="e.g., Deep Work: Architecture Design"
                  autoFocus
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-md px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={quickBlockHour}
                    onChange={(e) => setQuickBlockHour(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-md px-2.5 py-1 text-xs text-neutral-900 dark:text-neutral-100 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">Duration</label>
                  <select
                    value={quickBlockDuration}
                    onChange={(e) => setQuickBlockDuration(Number(e.target.value))}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1 text-xs text-neutral-900 dark:text-neutral-100 outline-none cursor-pointer"
                  >
                    <option value={25}>25 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-3 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickBlockTitle.trim()}
                  className="px-3 py-1 text-xs font-semibold text-white dark:text-neutral-900 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 disabled:opacity-40 rounded-md"
                >
                  Create Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
