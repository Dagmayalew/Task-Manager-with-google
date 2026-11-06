import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logout 
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
  Smartphone, 
  Sidebar as SidebarIcon,
  Maximize2 
} from 'lucide-react';

export default function App() {
  // Theme state: European Minimalist Light by default, with dark toggle
  const [theme, setTheme] = useState<'light' | 'dark'>(() => storageService.getTheme());

  const handleToggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    storageService.setTheme(next);
  };

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

  // Sync processor
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
          console.warn('Queue replay error:', item, err);
          item.retries += 1;
          if (item.retries < 3) {
            remainingQueue.push(item);
          }
        }
      }

      storageService.saveSyncQueue(remainingQueue);
      setSyncQueue(remainingQueue);

      // 2. Fetch fresh Task Lists
      const remoteLists = await googleTasksService.getTaskLists(token);
      if (remoteLists.length > 0) {
        setLists(prev => {
          const listMap = new Map<string, TaskList>();
          prev.forEach(l => {
            if (!l.googleListId) listMap.set(l.id, l);
          });
          remoteLists.forEach(l => listMap.set(l.id, l));
          return Array.from(listMap.values());
        });

        // 3. Fetch Tasks from remote lists
        const allFetchedTasks: TaskItemType[] = [];
        for (const list of remoteLists) {
          try {
            const listTasks = await googleTasksService.getTasks(token, list.id);
            allFetchedTasks.push(...listTasks);
          } catch (e) {
            console.warn(`Failed fetching tasks for list ${list.id}`, e);
          }
        }

        if (allFetchedTasks.length > 0) {
          setTasks(prev => {
            const taskMap = new Map<string, TaskItemType>();
            prev.forEach(t => {
              if (!t.googleTaskId) taskMap.set(t.id, t);
            });
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

  // Google Login
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

  // Google Logout
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
  };

  // Manual Sync
  const handleSyncNow = () => {
    if (accessToken) {
      processSyncQueueAndFetch(accessToken);
    }
  };

  // Set Display Mode
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
      color: '#18181b',
      updatedAt: new Date().toISOString(),
    };

    setLists(prev => [...prev, localList]);

    if (accessToken && isOnline) {
      try {
        const created = await googleTasksService.createTaskList(accessToken, title);
        setLists(prev => prev.map(l => l.id === localList.id ? created : l));
      } catch (err) {
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
      message: `Delete "${listTitle}" and all associated tasks? This removes the list locally and from Google Tasks.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const targetList = lists.find(l => l.id === listId);

        setLists(prev => prev.filter(l => l.id !== listId));
        setTasks(prev => prev.filter(t => t.listId !== listId));
        if (activeListId === listId) {
          setActiveListId('all');
        }

        if (targetList?.googleListId && accessToken && isOnline) {
          try {
            await googleTasksService.deleteTaskList(accessToken, targetList.googleListId);
          } catch (e) {
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

    if (accessToken && isOnline) {
      try {
        const targetList = lists.find(l => l.id === params.listId);
        const listToUse = targetList?.googleListId || lists[0]?.googleListId || '@default';
        const created = await googleTasksService.createTask(accessToken, listToUse, newTask);

        let calEventId: string | undefined = undefined;
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
      message: `Permanently delete "${taskTitle}"? This will remove the item from local storage, Google Tasks, and linked calendar events.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const task = tasks.find(t => t.id === taskId);

        setTasks(prev => prev.filter(t => t.id !== taskId));

        if (task?.googleTaskId && accessToken && isOnline) {
          try {
            await googleTasksService.deleteTask(accessToken, task.listId, task.googleTaskId);
          } catch (e) {
            storageService.enqueueSync('DELETE_TASK', { googleTaskId: task.googleTaskId, listId: task.listId });
            setSyncQueue(storageService.loadSyncQueue());
          }
        }

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
      title: 'Remove Calendar Event',
      message: `Remove the Google Calendar event for "${task.title}"? The task will remain in your to-do list.`,
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
      alert('Please sign in with Google to block time on your calendar.');
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesNotes = task.notes?.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesNotes) return false;
      }

      if (filterPriority !== 'all' && task.priority !== filterPriority) {
        return false;
      }

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

  // Render main European workspace
  const renderMainTaskWorkspace = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-50/40 dark:bg-neutral-950 transition-colors">
      {/* Editorial Header */}
      <div className="px-6 py-5 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/40">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>
                {currentView === 'today' && 'Today'}
                {currentView === 'upcoming' && 'Upcoming Agenda'}
                {currentView === 'starred' && 'Starred Tasks'}
                {currentView === 'completed' && 'Completed Archive'}
                {currentView === 'list' && (activeListId === 'all' ? 'All Tasks' : activeList?.title || 'Collection')}
              </span>
              <span className="font-mono text-xs text-neutral-400 font-normal tabular-nums">
                ({filteredTasks.length})
              </span>
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              {currentView === 'today' && "Primary focus for today. Synchronized with Google Calendar."}
              {currentView === 'upcoming' && "Deadlines and scheduled tasks for the coming days."}
              {currentView === 'starred' && "Flagged priorities."}
              {currentView === 'completed' && "Completed tasks log."}
              {currentView === 'list' && "Items in this collection."}
            </p>
          </div>

          <div className="text-xs font-mono text-neutral-500">
            Completed: <span className="text-blue-600 dark:text-blue-400 font-semibold">{tasks.filter(t => t.completed).length}</span>
          </div>
        </div>

        {/* Minimal Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-md px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 transition">
            <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-transparent outline-none placeholder-neutral-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-neutral-400 hover:text-neutral-600">
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Filter className="w-3 h-3 text-neutral-400" />
            <span className="font-mono text-[11px] uppercase">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
              className="bg-transparent outline-none text-neutral-800 dark:text-neutral-200 cursor-pointer font-medium"
            >
              <option value="all">All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 max-w-3xl w-full mx-auto">
        {/* Quick Add Bar */}
        {currentView !== 'completed' && (
          <QuickAddBar
            lists={lists}
            activeListId={activeListId}
            hasGoogleCalendarAuth={Boolean(accessToken)}
            onAddTask={handleAddTask}
          />
        )}

        {/* Tasks Section */}
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
            <CheckCircle2 className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
            <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">No tasks in view</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {searchQuery ? 'No tasks matched your search query.' : 'Ready for your next priority. Press ⌘K to add.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 border-t border-b border-neutral-200/60 dark:border-neutral-800/60">
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
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-stone-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-150">
        {/* Navbar */}
        <Navbar
          user={user}
          isOnline={isOnline}
          isSyncing={isSyncing}
          pendingSyncCount={syncQueue.length}
          displayMode={displayMode}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onSetDisplayMode={handleSetDisplayMode}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onSyncNow={handleSyncNow}
          onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
          onOpenSyncQueueModal={() => setIsSyncQueueModalOpen(true)}
        />

        {/* Display modes */}
        {displayMode === 'desktop' ? (
          <div className="flex-1 flex overflow-hidden">
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
          <div className="flex-1 bg-neutral-100 dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
            <div className="mb-3 text-xs text-neutral-500 flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Simulating Chrome Extension Popup (380 × 580 px)</span>
              <button
                onClick={() => handleSetDisplayMode('desktop')}
                className="text-neutral-900 dark:text-neutral-100 font-medium hover:underline flex items-center gap-1 ml-2"
              >
                <Maximize2 className="w-3 h-3" /> Return
              </button>
            </div>

            <div className="w-[380px] h-[580px] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl flex flex-col overflow-hidden relative">
              <div className="px-3.5 py-2.5 bg-stone-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 tracking-tight">Chronotask</span>
                <span className="font-mono text-[10px] text-neutral-400">
                  {tasks.filter(t => !t.completed).length} open
                </span>
              </div>

              <div className="p-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
                <QuickAddBar
                  lists={lists}
                  activeListId={activeListId}
                  hasGoogleCalendarAuth={Boolean(accessToken)}
                  onAddTask={handleAddTask}
                />
              </div>

              <div className="flex-1 overflow-y-auto px-3 divide-y divide-neutral-100 dark:divide-neutral-800/60">
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

              <div className="px-3.5 py-2 bg-stone-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>{isOnline ? 'Online' : 'Offline'}</span>
                <button
                  onClick={() => setIsExtensionModalOpen(true)}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-sans font-medium"
                >
                  Install Extension →
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Chrome Extension Side Panel Simulator View */
          <div className="flex-1 flex overflow-hidden bg-stone-50 dark:bg-neutral-950">
            <div className="flex-1 bg-stone-100/70 dark:bg-neutral-900/40 p-8 flex flex-col justify-center items-center text-center border-r border-neutral-200/80 dark:border-neutral-800/80">
              <div className="max-w-md space-y-3">
                <div className="w-10 h-10 rounded-sm bg-blue-600 text-white flex items-center justify-center mx-auto font-mono text-xs font-bold">
                  SP
                </div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Chrome Side Panel Simulator</h2>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  When deployed, Chronotask docks beside any web page so you can manage your schedule and capture tasks without context switching.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => setIsExtensionModalOpen(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition cursor-pointer shadow-2xs"
                  >
                    Download Extension ZIP
                  </button>
                  <button
                    onClick={() => handleSetDisplayMode('desktop')}
                    className="px-3.5 py-1.5 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 rounded-md text-xs font-medium cursor-pointer"
                  >
                    Exit View
                  </button>
                </div>
              </div>
            </div>

            {/* Side Panel Drawer (360px) */}
            <div className="w-[360px] bg-white dark:bg-neutral-900 flex flex-col h-full border-l border-neutral-200/80 dark:border-neutral-800/80 shadow-lg">
              <div className="px-3.5 py-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">Chronotask Side Panel</span>
                <span className="font-mono text-[10px] text-neutral-400">360px</span>
              </div>

              <div className="p-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
                <QuickAddBar
                  lists={lists}
                  activeListId={activeListId}
                  hasGoogleCalendarAuth={Boolean(accessToken)}
                  onAddTask={handleAddTask}
                />
              </div>

              <div className="flex-1 overflow-y-auto px-3 divide-y divide-neutral-100 dark:divide-neutral-800/60">
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

        {/* Mandatory Explicit Confirmation Dialog */}
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  );
}
