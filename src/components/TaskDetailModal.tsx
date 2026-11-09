import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Star, 
  Check, 
  Trash2, 
  Folder,
  FolderPlus,
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  RefreshCw
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
  onCreateFolder?: (title: string) => void;
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
  onCreateFolder,
  onScheduleToCalendar,
  onRemoveFromCalendar,
}) => {
  if (!isOpen || !task) return null;

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');
  const [listId, setListId] = useState(task.folderId || task.listId);
  const [priority, setPriority] = useState<Priority>(task.priority || 'medium');
  const [due, setDue] = useState(task.due || '');
  const [dueTime, setDueTime] = useState(task.dueTime || '');
  const [starred, setStarred] = useState(task.starred || false);
  const [completed, setCompleted] = useState(task.completed);

  // New folder inline creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Calendar time block
  const [calendarDate, setCalendarDate] = useState(task.due || new Date().toISOString().split('T')[0]);
  const [calendarStartTime, setCalendarStartTime] = useState(task.dueTime || '10:00');
  const [calendarDuration, setCalendarDuration] = useState<number>(30);
  const [saveFeedback, setSaveFeedback] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes || '');
      setListId(task.folderId || task.listId);
      setPriority(task.priority || 'medium');
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
      folderId: listId,
      priority,
      due: due || undefined,
      dueTime: dueTime || undefined,
      starred,
      completed,
      completedAt: completed ? (task.completedAt || new Date().toISOString()) : undefined,
      updatedAt: new Date().toISOString(),
    });
    setSaveFeedback(true);
    setTimeout(() => {
      setSaveFeedback(false);
      onClose();
    }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim() && onCreateFolder) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleSetQuickDate = (type: 'today' | 'tomorrow' | 'nextWeek' | 'clear') => {
    if (type === 'clear') {
      setDue('');
      setDueTime('');
      return;
    }
    const d = new Date();
    if (type === 'tomorrow') d.setDate(d.getDate() + 1);
    else if (type === 'nextWeek') d.setDate(d.getDate() + 7);
    const dateStr = d.toISOString().split('T')[0];
    setDue(dateStr);
    setCalendarDate(dateStr);
  };

  const handleTriggerScheduleCalendar = () => {
    if (!calendarDate || !calendarStartTime) return;
    const startIso = `${calendarDate}T${calendarStartTime}:00`;
    onScheduleToCalendar(task, startIso, calendarDuration);
  };

  const currentFolder = lists.find(l => l.id === listId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        className="w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-2xl p-5 text-neutral-900 dark:text-neutral-100 max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-200/80 dark:border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCompleted(!completed)}
              className={`w-5 h-5 rounded-xs border flex items-center justify-center transition cursor-pointer ${
                completed
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-600 bg-transparent'
              }`}
              title={completed ? "Mark incomplete" : "Mark completed"}
            >
              {completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
            </button>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block">
                {completed ? 'Completed Task' : 'Task Details & Management'}
              </span>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {currentFolder ? `Folder: ${currentFolder.title}` : 'General'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStarred(!starred)}
              className="p-1 rounded transition text-neutral-400 hover:text-rose-600 cursor-pointer"
              title={starred ? "Remove star" : "Star task"}
            >
              <Star className={`w-4 h-4 ${starred ? 'fill-rose-600 text-rose-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Title Input */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100 outline-none focus:border-blue-600 transition"
            />
          </div>

          {/* Priority High to Low Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                Priority Level (High → Low)
              </label>
              <span className="font-mono text-[10px] text-neutral-400">
                Current: <strong className="uppercase">{priority}</strong>
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                  priority === 'urgent'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-bold'
                    : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-rose-600 hover:text-rose-600'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                <span>Urgent</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                  priority === 'high'
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-600 font-bold'
                    : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-rose-600 hover:text-rose-600'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>High</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('medium')}
                className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                  priority === 'medium'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                    : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-blue-600 hover:text-blue-600'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span>Medium</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('low')}
                className={`py-1.5 px-2 rounded text-xs font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                  priority === 'low'
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-neutral-400 font-bold'
                    : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                <span>Low</span>
              </button>
            </div>
          </div>

          {/* Folder / Collection Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-blue-600" />
                <span>Folder / Type Collection</span>
              </label>
              {onCreateFolder && !isCreatingFolder && (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>+ New Folder</span>
                </button>
              )}
            </div>

            {isCreatingFolder ? (
              <form onSubmit={handleCreateNewFolder} className="flex items-center gap-2 p-1.5 bg-neutral-50 dark:bg-neutral-950 border border-blue-600 rounded-md">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name (e.g. Finance, Study, Project)..."
                  autoFocus
                  className="w-full bg-transparent text-xs text-neutral-900 dark:text-neutral-100 outline-none px-2"
                />
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="text-neutral-400 hover:text-neutral-900 px-1 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </form>
            ) : (
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none cursor-pointer focus:border-blue-600"
              >
                {lists.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    📁 {folder.title} {folder.folderType ? `(${folder.folderType})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Due Date & Time with Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>Due Date & Scheduling</span>
              </label>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('today')}
                  className="px-2 py-0.5 text-[10px] font-mono rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('tomorrow')}
                  className="px-2 py-0.5 text-[10px] font-mono rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate('nextWeek')}
                  className="px-2 py-0.5 text-[10px] font-mono rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                >
                  +7d
                </button>
                {due && (
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate('clear')}
                    className="px-2 py-0.5 text-[10px] font-mono rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={due}
                  onChange={(e) => {
                    setDue(e.target.value);
                    setCalendarDate(e.target.value);
                  }}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 font-mono outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => {
                    setDueTime(e.target.value);
                    setCalendarStartTime(e.target.value);
                  }}
                  placeholder="Set time"
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 font-mono outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
              Description & Notes
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add links, subtasks, context, or meeting notes..."
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-xs text-neutral-900 dark:text-neutral-100 outline-none leading-relaxed resize-none focus:border-blue-600 transition"
            />
          </div>

          {/* Google Calendar Section */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <CalendarPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Calendar Time-Block</span>
              </span>
              {task.calendarEventId && (
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Scheduled</span>
                </span>
              )}
            </div>

            {task.calendarEventId ? (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-neutral-600 dark:text-neutral-400 font-mono text-[11px]">
                  {task.calendarScheduledTime ? `${task.calendarScheduledTime.start.split('T')[1]?.substring(0, 5)} - ${task.calendarScheduledTime.end.split('T')[1]?.substring(0, 5)}` : 'Event synced on calendar'}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveFromCalendar(task)}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Remove Event
                </button>
              </div>
            ) : hasGoogleCalendarAuth ? (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-0.5">Date</label>
                    <input
                      type="date"
                      value={calendarDate}
                      onChange={(e) => setCalendarDate(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-0.5">Start Time</label>
                    <input
                      type="time"
                      value={calendarStartTime}
                      onChange={(e) => setCalendarStartTime(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-neutral-400 block mb-0.5">Duration</label>
                    <select
                      value={calendarDuration}
                      onChange={(e) => setCalendarDuration(Number(e.target.value))}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-xs"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hour</option>
                      <option value={90}>1.5 hours</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerScheduleCalendar}
                  className="w-full py-1.5 px-3 border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Block Time on Google Calendar</span>
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-neutral-400">
                Sign in with Google in the top bar to block this task on your Google Calendar.
              </p>
            )}
          </div>

          {/* Sync & Timestamp Info */}
          <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
            <span>Created: {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <span>
              {task.googleTaskId ? 'Synced with Google Tasks' : 'Stored locally (offline ready)'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-neutral-200/80 dark:border-neutral-800/80">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(task.id, task.title);
            }}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Task</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-2xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saveFeedback ? 'Saved!' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
