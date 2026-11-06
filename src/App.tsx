import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from './services/firebaseAuth';
import { googleTasksService } from './services/googleTasksApi';
import { googleCalendarService } from './services/googleCalendarApi';
import { storageService } from './services/storageService';
import { 
  TaskItem as TaskItemType, 
  TaskList, 
  CalendarEvent, 
  SyncQueueItem, 
  ViewFilter, 
  ExtensionDisplayMode,
  Priority 
} from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { QuickAddBar } from './components/QuickAddBar';
import { TaskItem } from './components/TaskItem';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CalendarScheduleView } from './components/CalendarScheduleView';
import { ConfirmModal } from './components/ConfirmModal';
import { ExtensionExportModal } from './components/ExtensionExportModal';
import { SyncQueueModal } from './components/SyncQueueModal';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Sparkles,
  Inbox,
  AlertCircle,
  ExternalLink,
  Smartphone,
  Sidebar as SidebarIcon,
  Maximize2
} from 'lucide-react';

export default function App() {
  // Authentication & token
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Network & Sync State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string | null>(storageService.getLastSynced());
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(storageService.loadSyncQueue());

  // Data State
  const [tasks, setTasks] = useState<TaskItemType[]>(() => storageService.loadTasks());
  const [lists, setLists] = useState<TaskList[]>(() => storageService.loadLists());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => storageService.loadCalendarCache());

  // View & UI Navigation
  const [currentView, setCurrentView] = useState<ViewFilter>('today');
  const [activeListId, setActiveListId] = useState<string>(() => storageService.getActiveListId());
  const [displayMode, setDisplayMode] = useState<ExtensionDisplayMode>(
    (storageService.getDisplayMode() as ExtensionDisplayMode) || 'desktop'
  );

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');

  // Modals & Dialogs
  const [editingTask, setEditingTask] = useState<TaskItemType | null>(null);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isSyncQueueModalOpen, setIsSyncQueueModalOpen] = useState(false);

  // Mandatory Explicit Confirmation Modal state (for destructive operations per workspace skill)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger auto-sync if logged in
      if (accessToken) {
        processSyncQueueAndFetch(accessToken);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [accessToken]);

  // Save tasks and lists on change
  useEffect(() => {
    storageService.saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    storageService.saveLists(lists);
  }, [lists]);

  useEffect(() => {
    storageService.saveCalendarCache(calendarEvents);
  }, [calendarEvents]);

  // Initialize Firebase Auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        if (token) {
          setAccessToken(token);
          processSyncQueueAndFetch(token);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync processor: replayer for offline actions + remote fetch
  const processSyncQueueAndFetch = useCallback(async (token: string) => {
    if (!token || !navigator.onLine) return;
    setIsSyncing(true);

    try {
      const queue = storageService.loadSyncQueue();
      const remainingQueue: SyncQueueItem[] = [];

      // 1. Replay pending offline queue actions
      for (const item of queue) {
        try {
          if (item.action === 'CREATE_TASK') {
            const created = await googleTasksService.createTask(token, item.payload.listId, item.payload);
            setTasks(prev => prev.map(t => t.id === item.payload.id ? { ...t, googleTaskId: created.googleTaskId, syncStatus: 'synced' } : t));
          } else if (item.action === 'UPDATE_TASK') {
            if (item.payload.googleTaskId) {
              await googleTasksService.updateTask(token, item.payload.listId, item.payload.googleTaskId, item.payload);
            }
          } else if (item.action === 'DELETE_TASK') {
            if (item.payload.googleTaskId) {
              await googleTasksService.deleteTask(token, item.payload.listId, item.payload.googleTaskId);
            }
          } else if (item.action === 'CREATE_LIST') {
            await googleTasksService.createTaskList(token, item.payload.title);
          } else if (item.action === 'SCHEDULE_CALENDAR_EVENT') {
            await googleCalendarService.createCalendarEvent(token, item.payload);
          } else if (item.action === 'DELETE_CALENDAR_EVENT') {
            await googleCalendarService.deleteCalendarEvent(token, item.payload.eventId);
          }
        } catch (err) {
          console.warn('Queue replay error for item:', item, err);
          item.retries += 1;
          if (item.retries < 3) {
            remainingQueue.push(item);
          }
        }
      }

      storageService.saveSyncQueue(remainingQueue);
      setSyncQueue(remainingQueue);

      // 2. Fetch fresh Task Lists from Google Tasks
      const remoteLists = await googleTasksService.getTaskLists(token);
      if (remoteLists.length > 0) {
        setLists(prev => {
          const listMap = new Map<string, TaskList>();
          // Keep existing local non-google lists
          prev.forEach(l => {
            if (!l.googleListId) listMap.set(l.id, l);
          });
          // Add/update remote Google lists
          remoteLists.forEach(l => listMap.set(l.id, l));
          return Array.from(listMap.values());
        });

        // 3. Fetch Tasks from each remote list
        const allFetchedTasks: TaskItemType[] = [];
        for (const list of remoteLists) {
          try {
            const listTasks = await googleTasksService.getTasks(token, list.id);
            allFetchedTasks.push(...listTasks);
          } catch (e) {
            console.warn(`Failed fetching tasks for list ${list.id}`, e);
          }
        }

        // Merge with local tasks
        if (allFetchedTasks.length > 0) {
          setTasks(prev => {
            const taskMap = new Map<string, TaskItemType>();
            // Keep local-only tasks
            prev.forEach(t => {
              if (!t.googleTaskId) taskMap.set(t.id, t);
            });
            // Upsert remote tasks, preserving local priority & star
            allFetchedTasks.forEach(remoteTask => {
              const localMatch = prev.find(p => p.googleTaskId === remoteTask.googleTaskId || p.id === remoteTask.id);
              taskMap.set(remoteTask.id, {
                ...remoteTask,
                priority: localMatch?.priority || remoteTask.priority,
                starred: localMatch?.starred || remoteTask.starred,
                calendarEventId: localMatch?.calendarEventId,
                calendarScheduledTime: localMatch?.calendarScheduledTime,
              });
            });
            return Array.from(taskMap.values());
          });
        }
      }

      // 4. Fetch Calendar Events
      try {
        const events = await googleCalendarService.getEvents(token);
        setCalendarEvents(events);
      } catch (calErr) {
        console.warn('Calendar events fetch error:', calErr);
      }

      const nowIso = new Date().toISOString();
      storageService.setLastSynced(nowIso);
      setLastSynced(nowIso);
    } catch (error) {
      console.error('Full sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Google Login handler
  const handleLogin = async () => {
    try {
      setIsSyncing(true);
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        await processSyncQueueAndFetch(result.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Google Logout handler
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
  };

  // Manual Sync trigger
  const handleSyncNow = () => {
    if (accessToken) {
      processSyncQueueAndFetch(accessToken);
    }
  };

  // Set Display Mode (desktop, popup, sidepanel)
  const handleSetDisplayMode = (mode: ExtensionDisplayMode) => {
    setDisplayMode(mode);
    storageService.setDisplayMode(mode);
  };

  // Select View or List
  const handleSelectView = (view: ViewFilter, listId?: string) => {
    setCurrentView(view);
    if (listId) {
      setActiveListId(listId);
      storageService.setActiveListId(listId);
    }
  };

  // Create List
  const handleCreateList = async (title: string) => {
    const localList: TaskList = {
      id: 'list_' + Math.random().toString(36).substring(2, 9),
      title,
      color: '#8b5cf6',
      updatedAt: new Date().toISOString(),
    };

    setLists(prev => [...prev, localList]);

    if (accessToken && isOnline) {
      try {
        const created = await googleTasksService.createTaskList(accessToken, title);
        setLists(prev => prev.map(l => l.id === localList.id ? created : l));
      } catch (err) {
        console.warn('Google list creation error, enqueuing offline sync:', err);
        storageService.enqueueSync('CREATE_LIST', { title, localId: localList.id });
        setSyncQueue(storageService.loadSyncQueue());
      }
    } else {
      storageService.enqueueSync('CREATE_LIST', { title, localId: localList.id });
      setSyncQueue(storageService.loadSyncQueue());
    }
  };

  // Delete List with MANDATORY Confirmation Modal
  const handleDeleteList = (listId: string, listTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Task List',
      message: `Are you sure you want to delete "${listTitle}" and all tasks contained in it? This will remove the list from both local storage and Google Tasks. This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const targetList = lists.find(l => l.id === listId);

        // Remove locally
        setLists(prev => prev.filter(l => l.id !== listId));
        setTasks(prev => prev.filter(t => t.listId !== listId));
        if (activeListId === listId) {
          setActiveListId('all');
        }

        // Delete from Google Tasks if synced
        if (targetList?.googleListId && accessToken && isOnline) {
          try {
            await googleTasksService.deleteTaskList(accessToken, targetList.googleListId);
          } catch (e) {
            console.warn('Failed deleting list from Google Tasks, enqueuing delete:', e);
            storageService.enqueueSync('DELETE_LIST', { googleListId: targetList.googleListId });
            setSyncQueue(storageService.loadSyncQueue());
          }
        }
      },
    });
  };

  // Add Task
  const handleAddTask = async (params: {
    title: string;
    notes?: string;
    listId: string;
    priority: Priority;
    due?: string;
    dueTime?: string;
    scheduleToCalendar?: boolean;
    calendarDurationMinutes?: number;
  }) => {
    const newTask: TaskItemType = {
      id: 't_' + Math.random().toString(36).substring(2, 9),
      listId: params.listId,
      title: params.title,
      notes: params.notes,
      completed: false,
      due: params.due,
      dueTime: params.dueTime,
      priority: params.priority,
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: accessToken && isOnline ? 'pending' : 'local_only',
    };

    setTasks(prev => [newTask, ...prev]);

    // Handle Google Tasks sync
    if (accessToken && isOnline) {
      try {
        const targetList = lists.find(l => l.id === params.listId);
        const listToUse = targetList?.googleListId || lists[0]?.googleListId || '@default';
        const created = await googleTasksService.createTask(accessToken, listToUse, newTask);

        let calEventId: string | undefined = undefined;
        // Schedule to Calendar if requested
        if (params.scheduleToCalendar && params.due) {
          const startTime = params.dueTime ? `${params.due}T${params.dueTime}:00` : `${params.due}T10:00:00`;
          const duration = params.calendarDurationMinutes || 30;
          const endMs = new Date(startTime).getTime() + duration * 60 * 1000;
          const endTime = new Date(endMs).toISOString();

          const calEvent = await googleCalendarService.createCalendarEvent(accessToken, {
            title: params.title,
            description: params.notes,
            startTime,
            endTime,
            taskId: created.id,
          });
          calEventId = calEvent.id;
          setCalendarEvents(prev => [...prev, calEvent]);
        }

        setTasks(prev => prev.map(t => t.id === newTask.id ? {
          ...t,
          id: created.id,
          googleTaskId: created.id,
          calendarEventId: calEventId,
          syncStatus: 'synced',
        } : t));
      } catch (err) {
        console.warn('Error pushing task to Google Tasks, queued for sync:', err);
        storageService.enqueueSync('CREATE_TASK', newTask);
        setSyncQueue(storageService.loadSyncQueue());
      }
    } else {
      storageService.enqueueSync('CREATE_TASK', newTask);
      setSyncQueue(storageService.loadSyncQueue());
    }
  };

  // Toggle Task Completion
  const handleToggleComplete = async (taskId: string, nextCompleted: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask: TaskItemType = {
      ...task,
      completed: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

    if (accessToken && isOnline && task.googleTaskId) {
      try {
        await googleTasksService.updateTask(accessToken, task.listId, task.googleTaskId, {
          completed: nextCompleted,
          title: task.title,
        });
      } catch (err) {
        console.warn('Error syncing task toggle to Google, queued:', err);
        storageService.enqueueSync('UPDATE_TASK', updatedTask);
        setSyncQueue(storageService.loadSyncQueue());
      }
    } else {
      storageService.enqueueSync('UPDATE_TASK', updatedTask);
      setSyncQueue(storageService.loadSyncQueue());
    }
  };

  // Toggle Task Star
  const handleToggleStar = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, starred: !t.starred } : t));
  };

  // Save Task Detail
  const handleSaveTaskDetail = async (updatedTask: TaskItemType) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

    if (accessToken && isOnline && updatedTask.googleTaskId) {
      try {
        await googleTasksService.updateTask(accessToken, updatedTask.listId, updatedTask.googleTaskId, updatedTask);
      } catch (err) {
        storageService.enqueueSync('UPDATE_TASK', updatedTask);
        setSyncQueue(storageService.loadSyncQueue());
      }
    } else {
      storageService.enqueueSync('UPDATE_TASK', updatedTask);
      setSyncQueue(storageService.loadSyncQueue());
    }
  };

  // Delete Task with MANDATORY Confirmation Modal
  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Task',
      message: `Are you sure you want to permanently delete "${taskTitle}"? This will delete the item from local storage, Google Tasks, and any linked calendar blocks.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const task = tasks.find(t => t.id === taskId);

        // Remove locally
        setTasks(prev => prev.filter(t => t.id !== taskId));

        // Delete from Google Tasks if synced
        if (task?.googleTaskId && accessToken && isOnline) {
          try {
            await googleTasksService.deleteTask(accessToken, task.listId, task.googleTaskId);
          } catch (e) {
            storageService.enqueueSync('DELETE_TASK', { googleTaskId: task.googleTaskId, listId: task.listId });
            setSyncQueue(storageService.loadSyncQueue());
          }
        } else if (task?.googleTaskId) {
          storageService.enqueueSync('DELETE_TASK', { googleTaskId: task.googleTaskId, listId: task.listId });
          setSyncQueue(storageService.loadSyncQueue());
        }

        // Delete calendar event if linked
        if (task?.calendarEventId && accessToken && isOnline) {
          try {
            await googleCalendarService.deleteCalendarEvent(accessToken, task.calendarEventId);
            setCalendarEvents(prev => prev.filter(e => e.id !== task.calendarEventId));
          } catch (e) {
            console.warn('Failed deleting calendar event:', e);
          }
        }
      },
    });
  };

  // Schedule task directly onto Google Calendar
  const handleScheduleTaskToCalendar = async (
    task: TaskItemType,
    startTime: string,
    durationMinutes: number
  ) => {
    if (!accessToken) {
      alert('Please sign in with Google in the top bar to block this task on your Google Calendar.');
      return;
    }

    try {
      setIsSyncing(true);
      const startMs = new Date(startTime).getTime();
      const endMs = startMs + durationMinutes * 60 * 1000;
      const endTime = new Date(endMs).toISOString();

      const calEvent = await googleCalendarService.createCalendarEvent(accessToken, {
        title: task.title,
        description: task.notes || 'Chronotask Focus Block',
        startTime,
        endTime,
        taskId: task.id,
      });

      setCalendarEvents(prev => [...prev, calEvent]);
      setTasks(prev => prev.map(t => t.id === task.id ? {
        ...t,
        calendarEventId: calEvent.id,
        calendarScheduledTime: {
          start: startTime,
          end: endTime,
        },
      } : t));
    } catch (e: any) {
      alert('Could not schedule to Google Calendar: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Remove task from Google Calendar with MANDATORY confirmation
  const handleRemoveFromCalendar = (task: TaskItemType) => {
    if (!task.calendarEventId) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Remove Event from Google Calendar',
      message: `Do you want to remove the calendar event for "${task.title}" from your primary Google Calendar? The task will remain in your to-do list.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        if (accessToken && task.calendarEventId) {
          try {
            await googleCalendarService.deleteCalendarEvent(accessToken, task.calendarEventId);
            setCalendarEvents(prev => prev.filter(e => e.id !== task.calendarEventId));
          } catch (e) {
            console.warn('Error deleting calendar event:', e);
          }
        }
        setTasks(prev => prev.map(t => t.id === task.id ? {
          ...t,
          calendarEventId: undefined,
          calendarScheduledTime: undefined,
        } : t));
      },
    });
  };

  // Quick add calendar block
  const handleQuickAddCalendarBlock = async (
    title: string,
    startTime: string,
    durationMinutes: number
  ) => {
    if (!accessToken) {
      alert('Please sign in with Google to create calendar blocks.');
      return;
    }

    try {
      setIsSyncing(true);
      const startMs = new Date(startTime).getTime();
      const endMs = startMs + durationMinutes * 60 * 1000;
      const endTime = new Date(endMs).toISOString();

      const calEvent = await googleCalendarService.createCalendarEvent(accessToken, {
        title,
        startTime,
        endTime,
      });

      setCalendarEvents(prev => [...prev, calEvent]);
    } catch (e: any) {
      alert('Could not create Google Calendar event: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter tasks based on view & search
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return tasks.filter(task => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesNotes = task.notes?.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesNotes) return false;
      }

      // Priority filter
      if (filterPriority !== 'all' && task.priority !== filterPriority) {
        return false;
      }

      // View Filter
      switch (currentView) {
        case 'today':
          return !task.completed && (task.due === todayStr || (!task.due && task.createdAt.startsWith(todayStr)));
        case 'upcoming':
          return !task.completed && task.due && task.due > todayStr;
        case 'starred':
          return !task.completed && task.starred;
        case 'completed':
          return task.completed;
        case 'list':
          if (activeListId === 'all') return !task.completed;
          return !task.completed && task.listId === activeListId;
        case 'calendar':
          return true;
        default:
          return true;
      }
    });
  }, [tasks, currentView, activeListId, searchQuery, filterPriority]);

  const activeList = lists.find(l => l.id === activeListId);

  // Render main content area
  const renderMainTaskWorkspace = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* View Header & Search Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 capitalize flex items-center gap-2.5">
              <span>
                {currentView === 'today' && 'Today'}
                {currentView === 'upcoming' && 'Upcoming (Next 7 Days)'}
                {currentView === 'starred' && 'Starred Tasks'}
                {currentView === 'completed' && 'Completed Archive'}
                {currentView === 'list' && (activeListId === 'all' ? 'All Tasks' : activeList?.title || 'Task List')}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-normal">
                {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {currentView === 'today' && "Focus on today's priorities. Scheduled with Google Calendar."}
              {currentView === 'upcoming' && "Lookahead for scheduled deadlines and upcoming milestones."}
              {currentView === 'starred' && "High-priority tasks flagged for immediate action."}
              {currentView === 'completed' && "Completed tasks archive. Stored offline and synced to Google."}
              {currentView === 'list' && "Organized tasks in this collection."}
            </p>
          </div>

          {/* Quick stats badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              Completed: <strong className="text-emerald-400 font-mono">{tasks.filter(t => t.completed).length}</strong>
            </span>
          </div>
        </div>

        {/* Search Bar & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus-within:border-indigo-500 transition">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks by name or notes..."
              className="w-full bg-transparent outline-none placeholder-slate-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300">
                ✕
              </button>
            )}
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
              className="bg-transparent outline-none text-slate-200 cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All</option>
              <option value="urgent" className="bg-slate-900 text-rose-400">Urgent</option>
              <option value="high" className="bg-slate-900 text-amber-400">High</option>
              <option value="medium" className="bg-slate-900 text-blue-400">Medium</option>
              <option value="low" className="bg-slate-900 text-slate-400">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl w-full mx-auto">
        {/* Quick Add Bar */}
        {currentView !== 'completed' && (
          <QuickAddBar
            lists={lists}
            activeListId={activeListId}
            hasGoogleCalendarAuth={Boolean(accessToken)}
            onAddTask={handleAddTask}
          />
        )}

        {/* Task Items */}
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/30 border border-slate-800/80 rounded-2xl">
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No tasks in this view</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery 
                ? 'No tasks matched your search query. Try clearing the filter.' 
                : 'Your agenda is clean! Add a task using the bar above or press ⌘K.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                lists={lists}
                hasGoogleCalendarAuth={Boolean(accessToken)}
                onToggleComplete={handleToggleComplete}
                onToggleStar={handleToggleStar}
                onEdit={(t) => setEditingTask(t)}
                onDelete={handleDeleteTask}
                onScheduleToCalendar={(t) => setEditingTask(t)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <Navbar
        user={user}
        isOnline={isOnline}
        isSyncing={isSyncing}
        pendingSyncCount={syncQueue.length}
        displayMode={displayMode}
        onSetDisplayMode={handleSetDisplayMode}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSyncNow={handleSyncNow}
        onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
        onOpenSyncQueueModal={() => setIsSyncQueueModalOpen(true)}
      />

      {/* Main Container dependent on display mode */}
      {displayMode === 'desktop' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            currentView={currentView}
            activeListId={activeListId}
            lists={lists}
            tasks={tasks}
            lastSynced={lastSynced}
            onSelectView={handleSelectView}
            onCreateList={handleCreateList}
            onDeleteList={handleDeleteList}
            onOpenSyncQueue={() => setIsSyncQueueModalOpen(true)}
          />

          {/* Main workspace */}
          {currentView === 'calendar' ? (
            <CalendarScheduleView
              events={calendarEvents}
              tasks={tasks}
              hasGoogleCalendarAuth={Boolean(accessToken)}
              isSyncing={isSyncing}
              onRefreshEvents={() => accessToken && processSyncQueueAndFetch(accessToken)}
              onScheduleTask={handleScheduleTaskToCalendar}
              onQuickAddCalendarBlock={handleQuickAddCalendarBlock}
            />
          ) : (
            renderMainTaskWorkspace()
          )}
        </div>
      ) : displayMode === 'popup' ? (
        /* Chrome Extension Popup Simulator View */
        <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="mb-2 text-xs text-slate-400 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>Simulating Chrome Extension Popup (380 × 580 px)</span>
            <button
              onClick={() => handleSetDisplayMode('desktop')}
              className="text-indigo-400 hover:underline flex items-center gap-1 ml-2"
            >
              <Maximize2 className="w-3 h-3" /> Return to Full App
            </button>
          </div>

          <div className="w-[380px] h-[580px] bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            {/* Chrome popup header simulation */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <span className="font-bold text-xs text-slate-100">Chronotask Quick Popup</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>{tasks.filter(t => !t.completed).length} pending</span>
              </div>
            </div>

            {/* Quick add input */}
            <div className="p-3 border-b border-slate-800 bg-slate-900">
              <QuickAddBar
                lists={lists}
                activeListId={activeListId}
                hasGoogleCalendarAuth={Boolean(accessToken)}
                onAddTask={handleAddTask}
              />
            </div>

            {/* Scrollable tasks in popup */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-950/40">
              {filteredTasks.slice(0, 20).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  lists={lists}
                  hasGoogleCalendarAuth={Boolean(accessToken)}
                  onToggleComplete={handleToggleComplete}
                  onToggleStar={handleToggleStar}
                  onEdit={(t) => setEditingTask(t)}
                  onDelete={handleDeleteTask}
                  onScheduleToCalendar={(t) => setEditingTask(t)}
                />
              ))}
            </div>

            {/* Popup footer */}
            <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>{isOnline ? '● Online & Synced' : '○ Offline Mode'}</span>
              <button
                onClick={() => setIsExtensionModalOpen(true)}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Install Unpacked Extension →
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Chrome Extension Side Panel Simulator View */
        <div className="flex-1 flex overflow-hidden bg-slate-950">
          {/* Simulated Browser Webpage Window on Left */}
          <div className="flex-1 bg-slate-900/60 p-6 flex flex-col justify-center items-center text-center border-r border-slate-800">
            <div className="max-w-md space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
                <SidebarIcon className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-200">Chrome Side Panel Simulator</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                When installed as an extension, Chronotask docks on the right of any webpage you browse so you can take notes, check off tasks, and block calendar time without switching tabs!
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => setIsExtensionModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  Download Extension Files
                </button>
                <button
                  onClick={() => handleSetDisplayMode('desktop')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Exit Side Panel View
                </button>
              </div>
            </div>
          </div>

          {/* Side Panel Drawer (360px) */}
          <div className="w-[360px] bg-slate-900 flex flex-col h-full border-l border-slate-800 shadow-2xl">
            <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Chronotask Side Panel</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                360px
              </span>
            </div>

            <div className="p-3 border-b border-slate-800">
              <QuickAddBar
                lists={lists}
                activeListId={activeListId}
                hasGoogleCalendarAuth={Boolean(accessToken)}
                onAddTask={handleAddTask}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-950/40">
              {filteredTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  lists={lists}
                  hasGoogleCalendarAuth={Boolean(accessToken)}
                  onToggleComplete={handleToggleComplete}
                  onToggleStar={handleToggleStar}
                  onEdit={(t) => setEditingTask(t)}
                  onDelete={handleDeleteTask}
                  onScheduleToCalendar={(t) => setEditingTask(t)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={editingTask}
        lists={lists}
        hasGoogleCalendarAuth={Boolean(accessToken)}
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveTaskDetail}
        onDelete={handleDeleteTask}
        onScheduleToCalendar={handleScheduleTaskToCalendar}
        onRemoveFromCalendar={handleRemoveFromCalendar}
      />

      {/* Extension Exporter Modal */}
      <ExtensionExportModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />

      {/* Sync Queue Inspector Modal */}
      <SyncQueueModal
        isOpen={isSyncQueueModalOpen}
        onClose={() => setIsSyncQueueModalOpen(false)}
        queue={syncQueue}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
        onClearQueue={() => {
          storageService.clearSyncQueue();
          setSyncQueue([]);
        }}
        tasksCount={tasks.length}
        listsCount={lists.length}
      />

      {/* Mandatory Explicit Confirmation Dialog (Workspace Integration requirement) */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
