import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  CheckCircle2, 
  ExternalLink,
  Layers,
  Sparkles,
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

  // Date shifting
  const shiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Hours array from 08:00 to 20:00 (8 AM to 8 PM)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  // Filter events for the selected day
  const dayEvents = events.filter((ev) => {
    const startStr = ev.start.dateTime || ev.start.date;
    if (!startStr) return false;
    return startStr.startsWith(selectedDate);
  });

  // Filter tasks with scheduled calendar time or due date on this day
  const dayTasks = tasks.filter((t) => {
    if (t.calendarScheduledTime?.start?.startsWith(selectedDate)) return true;
    return t.due === selectedDate;
  });

  // Unscheduled tasks (due today or unassigned)
  const unscheduledTasks = tasks.filter((t) => !t.completed && !t.calendarEventId);

  const formatHourLabel = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:00 ${period}`;
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => shiftDate(-1)}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                isToday ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => shiftDate(1)}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
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
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none cursor-pointer"
            />
            <span className="text-sm font-semibold text-slate-200">
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition"
              title="Refresh Google Calendar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Refresh Calendar</span>
            </button>
          )}

          <button
            onClick={() => setShowBlockModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Block Focus Time</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar Timeline + Unscheduled Tasks Drawer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {hours.map((hour) => {
            const hourPrefix = String(hour).padStart(2, '0');
            // Events starting in this hour
            const hourEvents = dayEvents.filter((ev) => {
              const dt = ev.start.dateTime;
              if (!dt) return false;
              const evHour = new Date(dt).getHours();
              return evHour === hour;
            });

            // Tasks scheduled in this hour
            const hourTasks = dayTasks.filter((t) => {
              if (t.calendarScheduledTime?.start) {
                const dt = new Date(t.calendarScheduledTime.start);
                return dt.getHours() === hour;
              }
              if (t.dueTime) {
                return t.dueTime.startsWith(hourPrefix);
              }
              return false;
            });

            return (
              <div key={hour} className="flex gap-4 group">
                {/* Hour label */}
                <div className="w-20 pt-1 text-right text-xs font-mono font-medium text-slate-500 group-hover:text-slate-400 select-none shrink-0">
                  {formatHourLabel(hour)}
                </div>

                {/* Hour slot content */}
                <div className="flex-1 min-h-[64px] border-t border-slate-800/80 pt-1 pb-2 flex flex-col gap-2">
                  {hourEvents.length === 0 && hourTasks.length === 0 && (
                    <div 
                      onClick={() => {
                        setQuickBlockHour(`${hourPrefix}:00`);
                        setShowBlockModal(true);
                      }}
                      className="h-full min-h-[48px] rounded-lg border border-dashed border-transparent hover:border-slate-800 hover:bg-slate-900/40 cursor-pointer flex items-center px-3 text-xs text-slate-600 hover:text-slate-400 transition"
                    >
                      <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Click to block {hourPrefix}:00
                      </span>
                    </div>
                  )}

                  {/* Render Google Calendar Events */}
                  {hourEvents.map((ev) => {
                    const startTime = ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const endTime = ev.end.dateTime ? new Date(ev.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    return (
                      <div
                        key={ev.id}
                        className="bg-indigo-950/70 border border-indigo-700/60 rounded-xl p-2.5 text-slate-100 shadow-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                          <div>
                            <div className="text-xs font-semibold text-indigo-100">{ev.title}</div>
                            <div className="text-[10px] text-indigo-300 font-mono">
                              {startTime} - {endTime}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/50">
                          Google Calendar
                        </span>
                      </div>
                    );
                  })}

                  {/* Render Tasks scheduled for this hour */}
                  {hourTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`rounded-xl p-2.5 border flex items-center justify-between transition ${
                        t.completed
                          ? 'bg-slate-900/50 border-slate-800 text-slate-400 line-through'
                          : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-100 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className={`w-4 h-4 ${t.completed ? 'text-slate-500' : 'text-emerald-400'}`} />
                        <div>
                          <div className="text-xs font-semibold">{t.title}</div>
                          {t.dueTime && (
                            <div className="text-[10px] text-emerald-300 font-mono">
                              Due: {t.dueTime}
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-[10px] font-medium text-emerald-300 bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-700/50">
                        Task Item
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Unscheduled Tasks Drawer on the right */}
        <div className="w-72 border-l border-slate-800 bg-slate-900/40 p-4 hidden lg:flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Ready to Time-Block
            </span>
            <span className="text-[11px] text-slate-400">
              {unscheduledTasks.length} tasks
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pt-3 space-y-2">
            {unscheduledTasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                All tasks scheduled or completed!
              </div>
            ) : (
              unscheduledTasks.slice(0, 15).map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition space-y-2"
                >
                  <div className="text-xs font-medium text-slate-200 line-clamp-2">
                    {task.title}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      {task.due ? `Due ${task.due}` : 'No due date'}
                    </span>
                    <button
                      onClick={() => {
                        const defaultStart = `${selectedDate}T10:00:00`;
                        onScheduleTask(task, defaultStart, 30);
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold text-indigo-300 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 rounded transition"
                      title="Schedule on Google Calendar for 10:00 AM"
                    >
                      + Block 30m
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100">
            <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Block Focus Session on Google Calendar</span>
            </h3>

            <form onSubmit={handleAddBlock} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Focus Activity Title</label>
                <input
                  type="text"
                  value={quickBlockTitle}
                  onChange={(e) => setQuickBlockTitle(e.target.value)}
                  placeholder="e.g., Deep Work: Product Architecture"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={quickBlockHour}
                    onChange={(e) => setQuickBlockHour(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Duration</label>
                  <select
                    value={quickBlockDuration}
                    onChange={(e) => setQuickBlockDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 outline-none cursor-pointer"
                  >
                    <option value={25}>25 min (Pomodoro)</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min (Deep Work)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickBlockTitle.trim()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg shadow-sm"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
