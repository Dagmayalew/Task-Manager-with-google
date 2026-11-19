import React, { useState } from 'react';
import {
  FolderPlus,
  Trash2,
  Copy,
  Sun,
  CalendarDays,
  CalendarRange,
  Layers,
  Star,
  CheckCircle2,
  TrendingUp,
  Plus,
  X,
  Keyboard,
} from 'lucide-react';
import { TaskList, ViewFilter, TaskItem } from '../types';

interface SidebarProps {
  currentView: ViewFilter;
  activeListId: string;
  lists: TaskList[];
  tasks: TaskItem[];
  lastSynced: string | null;
  onSelectView: (view: ViewFilter, listId?: string) => void;
  onCreateList: (title: string) => void;
  onDeleteList: (listId: string, listTitle: string) => void;
  onCopyListTasks: (list: TaskList) => void;
  onOpenSyncQueue: () => void;
  onOpenShortcuts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  activeListId,
  lists,
  tasks,
  lastSynced,
  onSelectView,
  onCreateList,
  onDeleteList,
  onCopyListTasks,
  onOpenSyncQueue,
  onOpenShortcuts,
}) => {
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const openTasks = tasks.filter((t) => !t.completed);

  const counts = {
    today: openTasks.filter(
      (t) => t.due === todayStr || (!t.due && t.createdAt.startsWith(todayStr))
    ).length,
    upcoming: openTasks.filter((t) => t.due && t.due > todayStr).length,
    starred: openTasks.filter((t) => t.starred).length,
    completed: tasks.filter((t) => t.completed).length,
    all: openTasks.length,
  };

  const navItems: Array<{
    id: ViewFilter;
    label: string;
    icon: React.ElementType;
    count?: number;
    listId?: string;
  }> = [
    { id: 'today', label: 'Today', icon: Sun, count: counts.today },
    { id: 'upcoming', label: 'Upcoming', icon: CalendarDays, count: counts.upcoming },
    { id: 'calendar', label: 'Schedule', icon: CalendarRange },
    { id: 'list', label: 'All tasks', icon: Layers, count: counts.all, listId: 'all' },
    { id: 'starred', label: 'Starred', icon: Star, count: counts.starred },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, count: counts.completed },
    { id: 'dashboard', label: 'Trends', icon: TrendingUp },
  ];

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListTitle.trim()) {
      onCreateList(newListTitle.trim());
      setNewListTitle('');
      setIsAddingList(false);
    }
  };

  const activeClass = 'bg-ink text-paper shadow-[0_1px_2px_rgba(0,0,0,0.16)]';
  const idleClass = 'text-ink-2 hover:bg-subtle hover:text-ink';

  return (
    <aside className="hidden w-[236px] shrink-0 flex-col border-r border-line bg-paper md:flex">
      <nav className="px-3 pb-2 pt-5">
        <p className="px-2.5 pb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected =
              item.id === 'list' && item.listId === 'all'
                ? currentView === 'list' && activeListId === 'all'
                : currentView === item.id;

            return (
              <li key={item.id + (item.listId || '')}>
                <button
                  onClick={() => onSelectView(item.id, item.listId)}
                  className={`group flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12.5px] transition-colors ${
                    isSelected ? `${activeClass} font-semibold` : idleClass
                  }`}
                >
                  <Icon
                    className={`h-[15px] w-[15px] shrink-0 ${
                      isSelected ? 'text-paper/80' : 'text-ink-3 group-hover:text-ink-2'
                    }`}
                  />
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`font-mono text-[10px] tabular-nums ${
                        isSelected ? 'text-paper/60' : 'text-ink-3'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-5 h-px bg-line" />

      {/* Collections */}
      <div className="flex items-center justify-between px-5 pb-1.5 pt-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">Collections</p>
        <button
          onClick={() => setIsAddingList(true)}
          title="New collection"
          aria-label="New collection"
          className="grid h-5 w-5 place-items-center rounded text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {isAddingList && (
        <form onSubmit={handleCreateList} className="px-3 pb-2">
          <div className="flex items-center gap-1 rounded-md border border-accent bg-surface p-1">
            <input
              type="text"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="Collection name"
              autoFocus
              className="w-full bg-transparent px-1.5 py-0.5 text-[12px] text-ink outline-none placeholder:text-ink-3"
            />
            <button
              type="submit"
              disabled={!newListTitle.trim()}
              className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-paper disabled:opacity-40"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingList(false)}
              aria-label="Cancel"
              className="px-0.5 text-ink-3 hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {lists.length === 0 && (
          <p className="px-2.5 py-2 text-[11px] text-ink-3">No collections yet.</p>
        )}
        {lists.map((list) => {
          const listTasks = tasks.filter((t) => t.folderId === list.id || t.listId === list.id);
          const openCount = listTasks.filter((t) => !t.completed).length;
          const isSelected = currentView === 'list' && activeListId === list.id;
          const dotColor =
            list.color ||
            (list.folderType === 'urgent' || list.folderType === 'work' ? '#b42318' : '#1e4fd8');

          return (
            <div
              key={list.id}
              onClick={() => onSelectView('list', list.id)}
              className={`group flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[12.5px] transition-colors ${
                isSelected ? `${activeClass} font-semibold` : idleClass
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectView('list', list.id);
                }
              }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: isSelected ? 'currentColor' : dotColor }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate">{list.title}</span>

              {openCount > 0 && (
                <span
                  className={`font-mono text-[10px] tabular-nums group-hover:hidden ${
                    isSelected ? 'text-paper/60' : 'text-ink-3'
                  }`}
                >
                  {openCount}
                </span>
              )}
              <span className="hidden items-center gap-0.5 group-hover:flex group-focus-within:flex">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyListTasks(list);
                  }}
                  disabled={listTasks.length === 0}
                  title={listTasks.length ? `Copy ${listTasks.length} tasks` : 'No tasks to copy'}
                  aria-label={`Copy tasks in ${list.title}`}
                  className={`grid h-5 w-5 place-items-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                    isSelected ? 'text-paper/70 hover:text-paper' : 'text-ink-3 hover:bg-surface hover:text-ink'
                  }`}
                >
                  <Copy className="h-3 w-3" />
                </button>
                {!list.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteList(list.id, list.title);
                    }}
                    title="Delete collection"
                    aria-label={`Delete ${list.title}`}
                    className={`grid h-5 w-5 place-items-center rounded transition-colors ${
                      isSelected ? 'text-paper/70 hover:text-paper' : 'text-ink-3 hover:bg-surface hover:text-danger'
                    }`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-line px-3 py-3">
        <div className="space-y-0.5">
          <button
            onClick={onOpenSyncQueue}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
          >
            <span>Sync queue</span>
            <span className="font-mono text-[10px] text-ink-3">→</span>
          </button>
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
            >
              <span className="flex items-center gap-1.5">
                <Keyboard className="h-3 w-3 text-ink-3" />
                Shortcuts
              </span>
              <kbd className="rounded border border-line px-1 font-mono text-[9px] text-ink-3">?</kbd>
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 border-t border-line px-2 pt-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
            {lastSynced
              ? `Synced ${new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Saved locally'}
          </span>
        </div>
      </div>
    </aside>
  );
};
