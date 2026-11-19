import React from 'react';
import { ArrowUpRight, CalendarDays, Circle } from 'lucide-react';
import { CalendarEvent, TaskItem } from '../types';

interface ContextRailProps {
  tasks: TaskItem[];
  calendarEvents: CalendarEvent[];
  onOpenTask: (task: TaskItem) => void;
  onOpenCalendar: () => void;
}

const priorityDot: Record<string, string> = {
  urgent: 'bg-danger',
  high: 'bg-warn',
  medium: 'bg-accent',
  low: 'bg-ink-3',
};

export const ContextRail: React.FC<ContextRailProps> = ({
  tasks,
  calendarEvents,
  onOpenTask,
  onOpenCalendar,
}) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const todayTasks = tasks.filter(
    (t) => t.due?.slice(0, 10) === todayStr || (!t.due && t.createdAt?.startsWith(todayStr))
  );
  const doneToday = todayTasks.filter((t) => t.completed).length;
  const progress = todayTasks.length ? Math.round((doneToday / todayTasks.length) * 100) : 0;

  const upNext = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      return 0;
    })
    .slice(0, 3);

  const nextEvent = [...calendarEvents]
    .filter((e) => {
      const start = e.start.dateTime || e.start.date;
      return start ? start.slice(0, 10) >= todayStr : false;
    })
    .sort((a, b) => (a.start.dateTime || a.start.date || '').localeCompare(b.start.dateTime || b.start.date || ''))[0];

  const eventTime = (() => {
    if (!nextEvent) return null;
    if (nextEvent.start.dateTime) {
      return new Date(nextEvent.start.dateTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return 'All day';
  })();

  const dueHint = (due?: string) => {
    if (!due) return 'Anytime';
    const datePart = due.slice(0, 10);
    if (datePart === todayStr) return 'Today';
    if (datePart === new Date(Date.now() + 86_400_000).toISOString().split('T')[0]) {
      return 'Tomorrow';
    }
    const parsed = new Date(`${datePart}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? datePart
      : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <aside className="hidden xl:flex xl:flex-col xl:gap-5">
      {/* Date + progress */}
      <section className="rounded-xl border border-line bg-surface p-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">
          {now.toLocaleDateString(undefined, { weekday: 'long' })}
        </p>
        <div className="mt-1 flex items-end justify-between">
          <p className="font-serif text-[52px] leading-[0.9] tracking-tight text-ink">
            {now.getDate()}
          </p>
          <p className="pb-1 text-right text-[11px] leading-tight text-ink-3">
            {now.toLocaleDateString(undefined, { month: 'long' })}
            <br />
            {now.getFullYear()}
          </p>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-medium text-ink-2">Today's progress</span>
            <span className="font-mono text-[10px] text-ink-3 tabular-nums">
              {doneToday}/{todayTasks.length}
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-subtle">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-snug text-ink-3">
            {todayTasks.length === 0
              ? 'A clear day. Add something worth doing.'
              : progress === 100
                ? 'Everything closed out. Well done.'
                : `${todayTasks.length - doneToday} left to close out the day.`}
          </p>
        </div>
      </section>

      {/* Up next */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">Up next</p>
          <span className="font-mono text-[9px] text-ink-3">{upNext.length}</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {upNext.length === 0 && (
            <p className="px-4 py-5 text-[12px] leading-relaxed text-ink-3">
              Nothing queued. Enjoy the quiet.
            </p>
          )}
          {upNext.map((task) => (
            <button
              key={task.id}
              onClick={() => onOpenTask(task)}
              className="group flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-subtle/60"
            >
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot[task.priority] || 'bg-ink-3'}`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-ink">{task.title}</span>
                <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-wide text-ink-3">
                  {task.dueTime || dueHint(task.due)}
                </span>
              </span>
              <ArrowUpRight className="mt-1 h-3 w-3 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>

      {/* Calendar */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">Calendar</p>
          <button
            onClick={onOpenCalendar}
            className="font-mono text-[9px] uppercase tracking-wide text-ink-3 transition-colors hover:text-ink"
          >
            Open →
          </button>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          {nextEvent ? (
            <div className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-ink">{nextEvent.title}</p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-3">{eventTime}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
              <Circle className="h-2 w-2" />
              No time blocks scheduled
            </div>
          )}
        </div>
      </section>
    </aside>
  );
};
