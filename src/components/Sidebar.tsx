import React, { useState } from 'react';
import { 
  FolderPlus, 
  Trash2, 
  ChevronRight
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
  onOpenSyncQueue: () => void;
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
  onOpenSyncQueue,
}) => {
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Counts
  const todayCount = tasks.filter(t => !t.completed && (t.due === todayStr || (!t.due && t.createdAt.startsWith(todayStr)))).length;
  const upcomingCount = tasks.filter(t => !t.completed && t.due && t.due > todayStr).length;
  const starredCount = tasks.filter(t => !t.completed && t.starred).length;
  const completedCount = tasks.filter(t => t.completed).length;
  const allCount = tasks.filter(t => !t.completed).length;

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListTitle.trim()) {
      onCreateList(newListTitle.trim());
      setNewListTitle('');
      setIsAddingList(false);
    }
  };

  const navItems: Array<{
    id: ViewFilter;
    index: string;
    label: string;
    count?: number;
    listId?: string;
  }> = [
    { id: 'today', index: '01', label: 'Today', count: todayCount },
    { id: 'upcoming', index: '02', label: 'Upcoming', count: upcomingCount },
    { id: 'calendar', index: '03', label: 'Schedule', count: undefined },
    { id: 'list', index: '04', label: 'All Tasks', count: allCount, listId: 'all' },
    { id: 'starred', index: '05', label: 'Starred', count: starredCount },
    { id: 'completed', index: '06', label: 'Completed', count: completedCount },
  ];

  return (
    <aside className="w-60 bg-stone-50/70 dark:bg-neutral-950/70 border-r border-neutral-200/80 dark:border-neutral-800/80 flex flex-col h-full select-none shrink-0 transition-colors">
      {/* Swiss Editorial Navigation */}
      <div className="p-3 space-y-0.5">
        <div className="px-3 py-2 text-[10px] font-mono font-medium tracking-widest text-neutral-400 dark:text-neutral-500 uppercase">
          Views
        </div>

        {navItems.map((item) => {
          const isSelected = item.id === 'list' && item.listId === 'all'
            ? currentView === 'list' && activeListId === 'all'
            : currentView === item.id;

          const isUrgentOrToday = item.id === 'today' && item.count !== undefined && item.count > 0;

          return (
            <button
              key={item.id + (item.listId || '')}
              onClick={() => onSelectView(item.id, item.listId)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors group ${
                isSelected
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-850'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`font-mono text-[10px] tabular-nums ${
                  isSelected ? 'text-blue-200' : 'text-neutral-400 dark:text-neutral-600'
                }`}>
                  {item.index}
                </span>
                <span>{item.label}</span>
              </div>

              {item.count !== undefined && item.count > 0 && (
                <span className={`font-mono text-[11px] tabular-nums ${
                  isSelected 
                    ? 'text-blue-100' 
                    : isUrgentOrToday 
                    ? 'text-rose-600 dark:text-rose-400 font-bold' 
                    : 'text-neutral-400 dark:text-neutral-500'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-neutral-200/80 dark:bg-neutral-800/80 my-2 mx-3" />

      {/* Task Lists Section */}
      <div className="px-4 py-1.5 flex items-center justify-between text-[10px] font-mono font-medium tracking-widest text-neutral-400 dark:text-neutral-500 uppercase">
        <span>Lists</span>
        <button
          onClick={() => setIsAddingList(true)}
          title="Create New Task List"
          className="p-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 transition"
        >
          <FolderPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Add List Form */}
      {isAddingList && (
        <form onSubmit={handleCreateList} className="px-3 pb-2 pt-1">
          <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-900 border border-blue-600 rounded-md p-1">
            <input
              type="text"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="List title..."
              autoFocus
              className="w-full bg-transparent text-xs text-neutral-900 dark:text-neutral-100 outline-none px-1"
            />
            <button
              type="submit"
              className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-semibold"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingList(false)}
              className="text-neutral-400 text-xs px-1 hover:text-neutral-900 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
        </form>
      )}

      {/* Task Lists Items */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {lists.map((list) => {
          const listTasksCount = tasks.filter(t => t.listId === list.id && !t.completed).length;
          const isSelected = currentView === 'list' && activeListId === list.id;

          return (
            <div
              key={list.id}
              className={`group flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-850'
              }`}
              onClick={() => onSelectView('list', list.id)}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? '#ffffff' : (list.color || '#2563eb') }}
                />
                <span className="truncate">{list.title}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {listTasksCount > 0 && (
                  <span className={`font-mono text-[11px] tabular-nums ${
                    isSelected ? 'text-blue-100' : 'text-neutral-400 dark:text-neutral-500'
                  }`}>
                    {listTasksCount}
                  </span>
                )}
                {!list.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteList(list.id, list.title);
                    }}
                    title="Delete list"
                    className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sync / Status Widget */}
      <div className="p-3 border-t border-neutral-200/80 dark:border-neutral-800/80 text-[11px] text-neutral-400 dark:text-neutral-500">
        <button
          onClick={onOpenSyncQueue}
          className="w-full flex items-center justify-between hover:text-neutral-900 dark:hover:text-neutral-200 transition py-0.5"
        >
          <span className="font-mono uppercase tracking-wider text-[10px]">Sync Queue</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 mt-1">
          {lastSynced ? `Synced ${new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Local Ready'}
        </div>
      </div>
    </aside>
  );
};
