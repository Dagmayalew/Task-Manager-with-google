import React, { useMemo, useState } from 'react';
import { 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  Award, 
  Check, 
  ArrowUpRight,
  Folder,
  Layers,
  Clock
} from 'lucide-react';
import { TaskItem, TaskList, Priority } from '../types';

interface TrendsDashboardProps {
  tasks: TaskItem[];
  lists: TaskList[];
}

interface DayData {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // "Mon", "Tue", etc.
  displayDate: string; // "Nov 8"
  isToday: boolean;
  completedTasks: TaskItem[];
  count: number;
}

export const TrendsDashboard: React.FC<TrendsDashboardProps> = ({ tasks, lists }) => {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  // Compute trailing 7 days data
  const { 
    trailing7Days, 
    totalCompleted7d, 
    dailyAverage, 
    completionRate, 
    topFolder,
    priorityBreakdown,
    recentCompletedTasks
  } = useMemo(() => {
    const days: DayData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
      const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const isToday = i === 0;

      // Match tasks completed on this date
      const completedOnDay = tasks.filter(t => {
        if (!t.completed) return false;
        if (t.completedAt && t.completedAt.startsWith(dateStr)) return true;
        // Fallback for v1 tasks without completedAt: check updatedAt or due
        if (!t.completedAt && t.updatedAt && t.updatedAt.startsWith(dateStr)) return true;
        return false;
      });

      days.push({
        dateStr,
        dayLabel,
        displayDate,
        isToday,
        completedTasks: completedOnDay,
        count: completedOnDay.length,
      });
    }

    const totalCompleted7d = days.reduce((sum, d) => sum + d.count, 0);
    const dailyAverage = (totalCompleted7d / 7).toFixed(1);

    const totalTasksCount = tasks.length;
    const allCompletedCount = tasks.filter(t => t.completed).length;
    const completionRate = totalTasksCount > 0 
      ? Math.round((allCompletedCount / totalTasksCount) * 100) 
      : 0;

    // Folder breakdown for 7-day completed tasks
    const folderCounts: Record<string, number> = {};
    const priorityCounts: Record<Priority, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const completed7dTasks: TaskItem[] = [];
    days.forEach(d => {
      d.completedTasks.forEach(t => {
        completed7dTasks.push(t);
        const fId = t.folderId || t.listId || 'default';
        folderCounts[fId] = (folderCounts[fId] || 0) + 1;
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      });
    });

    // Find top folder
    let maxFolderCount = 0;
    let topFolderId = '';
    Object.entries(folderCounts).forEach(([fId, cnt]) => {
      if (cnt > maxFolderCount) {
        maxFolderCount = cnt;
        topFolderId = fId;
      }
    });

    const topFolderMatch = lists.find(l => l.id === topFolderId);
    const topFolderName = topFolderMatch ? topFolderMatch.title : 'General';

    // Sort recent completed tasks by completion date desc
    completed7dTasks.sort((a, b) => {
      const da = a.completedAt || a.updatedAt;
      const db = b.completedAt || b.updatedAt;
      return new Date(db).getTime() - new Date(da).getTime();
    });

    return {
      trailing7Days: days,
      totalCompleted7d,
      dailyAverage,
      completionRate,
      topFolder: { name: topFolderName, count: maxFolderCount },
      priorityBreakdown: priorityCounts,
      recentCompletedTasks: completed7dTasks,
    };
  }, [tasks, lists]);

  // Chart max value for scaling SVG bars
  const maxBarValue = Math.max(5, ...trailing7Days.map(d => d.count));
  const chartHeight = 160;
  const chartWidth = 560;
  const barWidth = 36;
  const barGap = (chartWidth - (barWidth * 7)) / 8;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-stone-50/40 dark:bg-neutral-950 transition-colors px-6 py-6 max-w-4xl w-full mx-auto space-y-6">
      {/* Editorial Header */}
      <div className="border-b border-neutral-200/80 dark:border-neutral-800/80 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 dark:text-neutral-500">
              07 · Productivity Analytics
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mt-1 flex items-center gap-2">
              <span>7-Day Task Completion Trends</span>
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Visualizing focus velocity, daily completion cadence, and category distribution.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 px-3 py-1.5 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{trailing7Days[0]?.displayDate} – {trailing7Days[6]?.displayDate}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 p-4 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">7-Day Completed</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {totalCompleted7d}
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">tasks</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1">
            <span className="text-blue-600 dark:text-blue-400 font-medium">Cadence</span>
            <span>across last 7 days</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 p-4 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">Daily Average</span>
            <TrendingUp className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {dailyAverage}
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">tasks / day</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Consistent completion pace
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 p-4 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">Completion Rate</span>
            <Award className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
              {completionRate}%
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">all-time</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {tasks.filter(t => t.completed).length} of {tasks.length} total tasks
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 p-4 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider">Top Focus Folder</span>
            <Folder className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100 truncate max-w-[140px]" title={topFolder.name}>
              {topFolder.name}
            </span>
            {topFolder.count > 0 && (
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                ({topFolder.count})
              </span>
            )}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Highest completion volume
          </div>
        </div>
      </div>

      {/* Main Interactive 7-Day Completion Bar Chart */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-lg p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Daily Completed Tasks
            </h2>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Hover column for details
          </span>
        </div>

        {/* SVG Chart Container */}
        <div className="w-full overflow-x-auto">
          <svg 
            viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} 
            className="w-full h-48 select-none"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = chartHeight - (chartHeight * ratio) + 10;
              const val = Math.round(maxBarValue * ratio);
              return (
                <g key={idx}>
                  <line 
                    x1="30" 
                    y1={y} 
                    x2={chartWidth - 10} 
                    y2={y} 
                    stroke="currentColor" 
                    strokeDasharray="2 3" 
                    className="text-neutral-200 dark:text-neutral-800" 
                    strokeWidth="1"
                  />
                  <text 
                    x="22" 
                    y={y + 3} 
                    textAnchor="end" 
                    className="text-[9px] font-mono fill-neutral-400 dark:fill-neutral-500"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {trailing7Days.map((day, idx) => {
              const x = 40 + idx * (barWidth + barGap);
              const barH = (day.count / maxBarValue) * chartHeight;
              const y = chartHeight - barH + 10;
              const isHovered = hoveredDay?.dateStr === day.dateStr;

              return (
                <g 
                  key={day.dateStr} 
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Background highlight pill on hover */}
                  {isHovered && (
                    <rect
                      x={x - 4}
                      y={10}
                      width={barWidth + 8}
                      height={chartHeight + 28}
                      fill="currentColor"
                      className="text-neutral-100 dark:text-neutral-800/60"
                      rx="4"
                    />
                  )}

                  {/* Empty baseline bar if count is 0 */}
                  <rect
                    x={x}
                    y={chartHeight + 8}
                    width={barWidth}
                    height={2}
                    fill="currentColor"
                    className="text-neutral-200 dark:text-neutral-700"
                    rx="1"
                  />

                  {/* Actual bar */}
                  {day.count > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barH, 3)}
                      fill={day.isToday ? '#2563eb' : isHovered ? '#1d4ed8' : '#3b82f6'}
                      rx="3"
                      className="transition-all duration-150"
                    />
                  )}

                  {/* Count on top of bar */}
                  <text
                    x={x + barWidth / 2}
                    y={Math.max(y - 5, 20)}
                    textAnchor="middle"
                    className={`text-[10px] font-mono font-semibold ${
                      day.count > 0 
                        ? (day.isToday ? 'fill-blue-600 dark:fill-blue-400' : 'fill-neutral-700 dark:fill-neutral-300')
                        : 'fill-neutral-300 dark:fill-neutral-600'
                    }`}
                  >
                    {day.count}
                  </text>

                  {/* Day label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 26}
                    textAnchor="middle"
                    className={`text-[10px] font-mono font-medium ${
                      day.isToday 
                        ? 'fill-blue-600 dark:fill-blue-400 font-bold' 
                        : 'fill-neutral-600 dark:fill-neutral-400'
                    }`}
                  >
                    {day.dayLabel}
                  </text>

                  {/* Date number */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 37}
                    textAnchor="middle"
                    className="text-[9px] font-mono fill-neutral-400 dark:fill-neutral-500"
                  >
                    {day.displayDate.split(' ')[1]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hovered day breakdown detail */}
        {hoveredDay && (
          <div className="mt-3 p-3 bg-stone-50 dark:bg-neutral-850 rounded border border-neutral-200 dark:border-neutral-700 text-xs animate-in fade-in duration-100">
            <div className="flex items-center justify-between font-mono text-[11px] text-neutral-600 dark:text-neutral-300 mb-1.5">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {hoveredDay.displayDate} ({hoveredDay.dayLabel})
              </span>
              <span>
                <strong className="text-blue-600 dark:text-blue-400">{hoveredDay.count}</strong> tasks completed
              </span>
            </div>
            {hoveredDay.completedTasks.length > 0 ? (
              <div className="space-y-1">
                {hoveredDay.completedTasks.slice(0, 4).map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                    <Check className="w-3 h-3 text-blue-600 shrink-0" />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
                {hoveredDay.completedTasks.length > 4 && (
                  <div className="text-[10px] text-neutral-400 font-mono">
                    +{hoveredDay.completedTasks.length - 4} more tasks
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-neutral-400 italic">No tasks completed on this day.</div>
            )}
          </div>
        )}
      </div>

      {/* Priority & Folder Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Priority distribution */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-lg p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-neutral-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-neutral-700 dark:text-neutral-300">
              Completed by Priority (7 Days)
            </h3>
          </div>

          <div className="space-y-2.5">
            {[
              { key: 'urgent', label: 'Urgent', color: 'bg-rose-600', textColor: 'text-rose-600', count: priorityBreakdown.urgent },
              { key: 'high', label: 'High', color: 'bg-rose-500', textColor: 'text-rose-500', count: priorityBreakdown.high },
              { key: 'medium', label: 'Medium', color: 'bg-blue-600', textColor: 'text-blue-600', count: priorityBreakdown.medium },
              { key: 'low', label: 'Low', color: 'bg-neutral-400', textColor: 'text-neutral-400', count: priorityBreakdown.low },
            ].map(p => {
              const pct = totalCompleted7d > 0 ? Math.round((p.count / totalCompleted7d) * 100) : 0;
              return (
                <div key={p.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300 font-medium">
                      {p.label}
                    </span>
                    <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
                      {p.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-xs overflow-hidden">
                    <div 
                      className={`h-full ${p.color} transition-all duration-300`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent 7-Day Completion Feed */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-lg p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-neutral-700 dark:text-neutral-300">
                Completed Activity Log
              </h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {recentCompletedTasks.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[170px] space-y-2 pr-1 divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {recentCompletedTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400 font-mono">
                No tasks completed in this 7-day period.
              </div>
            ) : (
              recentCompletedTasks.slice(0, 10).map(t => {
                const listMatch = lists.find(l => l.id === (t.folderId || t.listId));
                const completedDate = t.completedAt ? new Date(t.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent';
                return (
                  <div key={t.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <Check className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="truncate text-neutral-800 dark:text-neutral-200 font-medium">
                        {t.title}
                      </span>
                      {listMatch && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 shrink-0">
                          {listMatch.title}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                      {completedDate}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
