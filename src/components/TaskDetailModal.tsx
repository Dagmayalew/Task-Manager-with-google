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
  RefreshCw,
  Copy
} from 'lucide-react';
import { TaskItem, TaskList, Priority } from '../types';

interface TaskDetailModalProps {
  task: TaskItem | null;
  lists: TaskList[];
  hasGoogleCalendarAuth: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: TaskItem) => void;
  onCopy?: (task: TaskItem) => void;
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
  onCopy,
  onDelete,
  onCreateFolder,
  onScheduleToCalendar,
  onRemoveFromCalendar,
}) => {
  // Hooks must run on every render, so the closed-state guard comes after them.
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [listId, setListId] = useState(task?.folderId ?? task?.listId ?? '');
  const [priority, setPriority] = useState<Priority>(task?.priority || 'medium');
  const [due, setDue] = useState(task?.due ?? '');
  const [dueTime, setDueTime] = useState(task?.dueTime ?? '');
  const [starred, setStarred] = useState(task?.starred ?? false);
  const [completed, setCompleted] = useState(task?.completed ?? false);

  // New folder inline creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Calendar time block
  const [calendarDate, setCalendarDate] = useState(
    task?.due ?? new Date().toISOString().split('T')[0]
  );
  const [calendarStartTime, setCalendarStartTime] = useState(task?.dueTime ?? '10:00');
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

  if (!isOpen || !task) return null;


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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm animate-in fade-in duration-100">
      <div 
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface p-6 text-ink shadow-2xl"
        role="dialog"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCompleted(!completed)}
              className={`grid h-5 w-5 place-items-center rounded-[4px] border transition-colors ${
                completed
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-line-strong bg-transparent hover:border-accent'
              }`}
              title={completed ? "Mark incomplete" : "Mark completed"}
            >
              {completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">
                {completed ? 'Completed task' : 'Task details'}
              </span>
              <span className="text-[12.5px] font-medium text-ink-2">
                {currentFolder ? currentFolder.title : 'General'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setStarred(!starred)}
              className={`grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-subtle ${
                starred ? 'text-warn' : 'text-ink-3 hover:text-warn'
              }`}
              title={starred ? "Remove star" : "Star task"}
            >
              <Star className={`w-4 h-4 ${starred ? 'fill-warn' : ''}`} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-md text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 space-y-4 overflow-y-auto py-5 pr-1">
          {/* Title Input */}
          <div>
            <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-[14px] font-medium text-ink outline-none transition-colors placeholder:font-normal placeholder:text-ink-3 focus:border-accent"
            />
          </div>

          {/* Priority Selection */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">
                Priority
              </label>
              <span className="font-mono text-[9px] uppercase tracking-wide text-ink-3">
                {priority}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {([
                { id: 'urgent', label: 'Urgent', dot: 'bg-danger' },
                { id: 'high', label: 'High', dot: 'bg-warn' },
                { id: 'medium', label: 'Medium', dot: 'bg-accent' },
                { id: 'low', label: 'Low', dot: 'bg-ink-3' },
              ] as const).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPriority(option.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    priority === option.id
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${option.dot}`} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Folder / Collection Selector */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">
                <Folder className="h-3 w-3" />
                <span>Collection</span>
              </label>
              {onCreateFolder && !isCreatingFolder && (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                >
                  <FolderPlus className="h-3 w-3" />
                  <span>New collection</span>
                </button>
              )}
            </div>

            {isCreatingFolder ? (
              <form onSubmit={handleCreateNewFolder} className="flex items-center gap-2 rounded-lg border border-accent bg-surface p-1">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Collection name"
                  autoFocus
                  className="w-full bg-transparent px-2 text-[12px] text-ink outline-none placeholder:text-ink-3"
                />
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="rounded bg-ink px-2.5 py-1 text-[11px] font-semibold text-paper disabled:opacity-40"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  aria-label="Cancel"
                  className="px-1 text-ink-3 hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-line bg-paper px-3 py-2 text-[12.5px] text-ink outline-none transition-colors focus:border-accent"
              >
                {lists.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Due Date & Time */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">
                <Calendar className="h-3 w-3" />
                <span>Due date</span>
              </label>

              <div className="flex items-center gap-1">
                {([
                  { id: 'today', label: 'Today' },
                  { id: 'tomorrow', label: 'Tomorrow' },
                  { id: 'nextWeek', label: '+7d' },
                ] as const).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSetQuickDate(preset.id)}
                    className="rounded px-1.5 py-0.5 font-mono text-[9.5px] text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
                  >
                    {preset.label}
                  </button>
                ))}
                {due && (
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate('clear')}
                    className="rounded px-1.5 py-0.5 font-mono text-[9.5px] text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={due}
                onChange={(e) => {
                  setDue(e.target.value);
                  setCalendarDate(e.target.value);
                }}
                aria-label="Due date"
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[11.5px] text-ink outline-none transition-colors focus:border-accent"
              />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => {
                  setDueTime(e.target.value);
                  setCalendarStartTime(e.target.value);
                }}
                aria-label="Due time"
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[11.5px] text-ink outline-none transition-colors focus:border-accent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">
              Notes
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add links, context, or meeting notes…"
              className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2.5 text-[12px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent"
            />
          </div>

          {/* Google Calendar Section */}
          <div className="space-y-2 rounded-lg border border-line bg-paper p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
                <CalendarPlus className="h-3 w-3" />
                <span>Calendar block</span>
              </span>
              {task.calendarEventId && (
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wide text-accent">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Scheduled</span>
                </span>
              )}
            </div>

            {task.calendarEventId ? (
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-[11px] text-ink-2">
                  {task.calendarScheduledTime ? `${task.calendarScheduledTime.start.split('T')[1]?.substring(0, 5)} – ${task.calendarScheduledTime.end.split('T')[1]?.substring(0, 5)}` : 'Event synced on calendar'}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveFromCalendar(task)}
                  className="text-[11px] font-medium text-danger hover:underline"
                >
                  Remove event
                </button>
              </div>
            ) : hasGoogleCalendarAuth ? (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-ink-3">Date</label>
                    <input
                      type="date"
                      value={calendarDate}
                      onChange={(e) => setCalendarDate(e.target.value)}
                      className="w-full rounded-md border border-line bg-surface px-2 py-1 font-mono text-[10.5px] text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-ink-3">Start</label>
                    <input
                      type="time"
                      value={calendarStartTime}
                      onChange={(e) => setCalendarStartTime(e.target.value)}
                      className="w-full rounded-md border border-line bg-surface px-2 py-1 font-mono text-[10.5px] text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-[9px] uppercase tracking-wide text-ink-3">Length</label>
                    <select
                      value={calendarDuration}
                      onChange={(e) => setCalendarDuration(Number(e.target.value))}
                      className="w-full cursor-pointer rounded-md border border-line bg-surface px-2 py-1 text-[10.5px] text-ink outline-none focus:border-accent"
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  <span>Block time on Google Calendar</span>
                </button>
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-ink-3">
                Sign in with Google to block this task on your calendar.
              </p>
            )}
          </div>

          {/* Sync & Timestamp Info */}
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wide text-ink-3">
            <span>
              Created {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>{task.googleTaskId ? 'Synced with Google Tasks' : 'Stored locally'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line pt-4">
          <div className="flex items-center gap-1">
            {onCopy && (
              <button
                type="button"
                onClick={() => onCopy(task)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
                title="Copy task details to clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(task.id, task.title);
              }}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-danger transition-colors hover:bg-danger-soft"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-[11.5px] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-1.5 text-[11.5px] font-semibold text-paper transition-opacity hover:opacity-90"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saveFeedback ? 'Saved!' : 'Save changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

