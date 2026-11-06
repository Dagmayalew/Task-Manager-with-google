import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  FolderPlus, 
  Inbox, 
  Star, 
  Trash2, 
  ListTodo,
  Layers,
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

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never synced';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none shrink-0">
      {/* Navigation views */}
      <div className="p-3 space-y-1">
        <button
          onClick={() => onSelectView('today')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
            currentView === 'today'
              ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Today</span>
          </div>
          {todayCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {todayCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectView('upcoming')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
            currentView === 'upcoming'
              ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="w-4 h-4 text-blue-400" />
            <span>Upcoming (7 Days)</span>
          </div>
          {upcomingCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {upcomingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectView('calendar')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
            currentView === 'calendar'
              ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Calendar Schedule</span>
          </div>
          <span className="text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
            Time Block
          </span>
        </button>

        <button
          onClick={() => onSelectView('starred')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
            currentView === 'starred'
              ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Star className="w-4 h-4 text-amber-300 fill-amber-300/30" />
            <span>Starred</span>
          </div>
          {starredCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {starredCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectView('list', 'all')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
            currentView === 'list' && activeListId === 'all'
              ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Inbox className="w-4 h-4 text-indigo-400" />
            <span>All Tasks</span>
          </div>
          {allCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {allCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectView('completed')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
            currentView === 'completed'
              ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Completed</span>
          </div>
          {completedCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {completedCount}
            </span>
          )}
        </button>
      </div>

      <div className="h-px bg-slate-800 my-1 mx-3" />

      {/* Task Lists Header */}
      <div className="px-4 py-2 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <span>Task Lists</span>
        <button
          onClick={() => setIsAddingList(true)}
          title="Create New Task List"
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
        >
          <FolderPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New list form */}
      {isAddingList && (
        <form onSubmit={handleCreateList} className="px-3 pb-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-indigo-500 rounded-lg p-1.5">
            <input
              type="text"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="List name..."
              autoFocus
              className="w-full bg-transparent text-xs text-slate-100 outline-none px-1"
            />
            <button
              type="submit"
              className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[11px] font-medium hover:bg-indigo-500"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingList(false)}
              className="text-slate-400 text-xs px-1 hover:text-white"
            >
              ✕
            </button>
          </div>
        </form>
      )}

      {/* Task Lists Items */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {lists.map((list) => {
          const listTasksCount = tasks.filter(t => t.listId === list.id && !t.completed).length;
          const isSelected = currentView === 'list' && activeListId === list.id;

          return (
            <div
              key={list.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 text-indigo-400 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
              onClick={() => onSelectView('list', list.id)}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: list.color || '#6366f1' }}
                />
                <span className="truncate text-xs">{list.title}</span>
              </div>

              <div className="flex items-center gap-1">
                {listTasksCount > 0 && (
                  <span className="text-[11px] text-slate-400 group-hover:text-slate-300">
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
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-1 rounded transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Offline Status & Quick Info Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
        <div 
          onClick={onOpenSyncQueue}
          className="flex items-center justify-between cursor-pointer hover:text-slate-200 transition py-1"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="font-medium text-slate-300">Sync Manager</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="text-[11px] text-slate-500 mt-1 flex justify-between items-center">
          <span>Last sync:</span>
          <span className="font-mono text-slate-400">{formatLastSync(lastSynced)}</span>
        </div>
      </div>
    </aside>
  );
};
