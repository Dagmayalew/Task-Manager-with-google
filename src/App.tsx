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
  Priority,
  SortOption 
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
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { BatchActionBar } from './components/BatchActionBar';
import { TrendsDashboard } from './components/TrendsDashboard';
import { AuthErrorModal } from './components/AuthErrorModal';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Smartphone, 
  Sidebar as SidebarIcon,
  Maximize2,
  ArrowUpDown,
  ArrowDownWideNarrow,
  Folder,
  Keyboard,
  CheckSquare
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

  // Search, Filter & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>(() => storageService.getSortOption());

  const handleSetSortOption = (opt: SortOption) => {
    setSortOption(opt);
    storageService.setSortOption(opt);
  };

  // Modals & Dialogs
  const [editingTask, setEditingTask] = useState<TaskItemType | null>(null);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isSyncQueueModalOpen, setIsSyncQueueModalOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [authError, setAuthError] = useState<{ code: string; message: string } | null>(null);

  // Multi-Task Selection & Batch Action Mode
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

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

  // Bidirectional Chrome Extension Content Script Sync Bridge
  useEffect(() => {
    // 1. Broadcast web app state to extension's content script whenever tasks, lists, auth change
    const broadcastToExtension = () => {
      window.postMessage({
        type: 'CHRONOTASK_SYNC_TO_EXTENSION',
        source: 'chronotask-web-app',
        tasks,
        lists,
        accessToken,
        user: user ? { email: user.email, displayName: user.displayName } : null,
        lastSynced: storageService.getLastSynced() || new Date().toISOString(),
      }, '*');
    };

    broadcastToExtension();
  }, [tasks, lists, accessToken, user]);

  useEffect(() => {
    // 2. Listen for messages from extension content script
    const handleExtensionSyncMessage = (event: MessageEvent) => {
      if (!event.data || event.source !== window) return;

      // When extension provides its stored tasks
      if (event.data.type === 'CHRONOTASK_SYNC_FROM_EXTENSION') {
        const extTasks = event.data.tasks as TaskItemType[];
        if (Array.isArray(extTasks) && extTasks.length > 0) {
          setTasks(prev => {
            const taskMap = new Map<string, TaskItemType>();
            prev.forEach(t => taskMap.set(t.id, t));

            let hasChanges = false;
            extTasks.forEach(extTask => {
              const local = taskMap.get(extTask.id);
              if (!local) {
                // New task created in extension popup!
                taskMap.set(extTask.id, extTask);
                hasChanges = true;
                if (accessToken) {
                  storageService.enqueueSync('CREATE_TASK', extTask);
                }
              } else {
                const extTime = new Date(extTask.updatedAt || 0).getTime();
                const localTime = new Date(local.updatedAt || 0).getTime();
                if (extTime > localTime) {
                  taskMap.set(extTask.id, { ...local, ...extTask });
                  hasChanges = true;
                  if (accessToken && local.googleTaskId) {
                    storageService.enqueueSync('UPDATE_TASK', { ...local, ...extTask });
                  }
                }
              }
            });

            return hasChanges ? Array.from(taskMap.values()) : prev;
          });
        }
      }

      // Web app ping request from content script
      if (event.data.type === 'CHRONOTASK_PING_FOR_STATE') {
        window.postMessage({
          type: 'CHRONOTASK_SYNC_TO_EXTENSION',
          source: 'chronotask-web-app',
          tasks: storageService.loadTasks(),
          lists: storageService.loadLists(),
          accessToken,
          user: user ? { email: user.email, displayName: user.displayName } : null,
          lastSynced: storageService.getLastSynced() || new Date().toISOString(),
        }, '*');
      }
    };

    window.addEventListener('message', handleExtensionSyncMessage);
    return () => window.removeEventListener('message', handleExtensionSyncMessage);
  }, [accessToken, user]);

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
      setAuthError(null);
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        await processSyncQueueAndFetch(result.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError({
        code: err?.code || 'auth/unknown',
        message: err?.message || 'Failed to authenticate with Google.',
      });
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
  const handleSelectView = useCallback((view: ViewFilter, listId?: string) => {
    setCurrentView(view);
    if (listId) {
      setActiveListId(listId);
      storageService.setActiveListId(listId);
    }
  }, []);

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
    if (updatedTask.id.startsWith('new_')) {
      if (!updatedTask.title.trim()) return;
      await handleAddTask({
        title: updatedTask.title.trim(),
        notes: updatedTask.notes,
        listId: updatedTask.folderId || updatedTask.listId,
        priority: updatedTask.priority,
        due: updatedTask.due,
        dueTime: updatedTask.dueTime,
      });
      return;
    }

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

  // Open blank new task modal (triggered by Hotkey 'N' or UI action)
  const handleOpenNewTask = useCallback(() => {
    const defaultList = activeListId !== 'all' 
      ? activeListId 
      : (lists[0]?.id || 'default_my_tasks');

    const blankTask: TaskItemType = {
      id: 'new_' + Math.random().toString(36).substring(2, 9),
      listId: defaultList,
      folderId: defaultList,
      title: '',
      notes: '',
      completed: false,
      priority: 'high',
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: accessToken && isOnline ? 'pending' : 'local_only',
    };
    setEditingTask(blankTask);
  }, [activeListId, lists, accessToken, isOnline]);

  // Batch selection handlers
  const handleToggleSelectMode = () => {
    setIsSelectionMode(prev => {
      if (prev) {
        setSelectedTaskIds(new Set());
      }
      return !prev;
    });
  };

  const handleToggleSelectTask = (taskId: string) => {
    setIsSelectionMode(true);
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSelectAllTasks = () => {
    setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
  };

  const handleDeselectAllTasks = () => {
    setSelectedTaskIds(new Set());
    setIsSelectionMode(false);
  };

  const handleBatchComplete = async (completed: boolean) => {
    if (selectedTaskIds.size === 0) return;
    const nowIso = new Date().toISOString();
    const updatedTasks = tasks.map(t => {
      if (selectedTaskIds.has(t.id)) {
        return {
          ...t,
          completed,
          completedAt: completed ? nowIso : undefined,
          updatedAt: nowIso,
        };
      }
      return t;
    });

    setTasks(updatedTasks);

    // Queue / execute Google Tasks API sync for synced tasks
    for (const taskId of selectedTaskIds) {
      const t = tasks.find(item => item.id === taskId);
      if (t) {
        const payload = {
          ...t,
          completed,
          completedAt: completed ? nowIso : undefined,
          updatedAt: nowIso,
        };
        if (accessToken && isOnline && t.googleTaskId) {
          try {
            await googleTasksService.updateTask(accessToken, t.listId, t.googleTaskId, {
              completed,
              title: t.title,
            });
          } catch (e) {
            storageService.enqueueSync('UPDATE_TASK', payload);
          }
        } else {
          storageService.enqueueSync('UPDATE_TASK', payload);
        }
      }
    }
    setSyncQueue(storageService.loadSyncQueue());
    setSelectedTaskIds(new Set());
  };

  const handleBatchMove = async (targetFolderId: string) => {
    if (selectedTaskIds.size === 0) return;
    const nowIso = new Date().toISOString();
    const updatedTasks = tasks.map(t => {
      if (selectedTaskIds.has(t.id)) {
        return {
          ...t,
          folderId: targetFolderId,
          listId: targetFolderId,
          updatedAt: nowIso,
        };
      }
      return t;
    });

    setTasks(updatedTasks);

    for (const taskId of selectedTaskIds) {
      const t = tasks.find(item => item.id === taskId);
      if (t) {
        const payload = { ...t, folderId: targetFolderId, listId: targetFolderId, updatedAt: nowIso };
        storageService.enqueueSync('UPDATE_TASK', payload);
      }
    }
    setSyncQueue(storageService.loadSyncQueue());
    setSelectedTaskIds(new Set());
  };

  const handleBatchDelete = () => {
    if (selectedTaskIds.size === 0) return;
    const count = selectedTaskIds.size;
    setConfirmDialog({
      isOpen: true,
      title: 'Batch Delete Tasks',
      message: `Permanently delete ${count} selected task${count > 1 ? 's' : ''}? This action removes them locally, from Google Tasks, and un-schedules linked calendar events.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const idsToDelete = new Set(selectedTaskIds);

        for (const taskId of idsToDelete) {
          const t = tasks.find(item => item.id === taskId);
          if (t?.googleTaskId && accessToken && isOnline) {
            try {
              await googleTasksService.deleteTask(accessToken, t.listId, t.googleTaskId);
            } catch (e) {
              storageService.enqueueSync('DELETE_TASK', { googleTaskId: t.googleTaskId, listId: t.listId });
            }
          }
          if (t?.calendarEventId && accessToken && isOnline) {
            try {
              await googleCalendarService.deleteCalendarEvent(accessToken, t.calendarEventId);
              setCalendarEvents(prev => prev.filter(e => e.id !== t.calendarEventId));
            } catch (e) {
              console.warn('Calendar delete error:', e);
            }
          }
        }

        setTasks(prev => prev.filter(t => !idsToDelete.has(t.id)));
        setSyncQueue(storageService.loadSyncQueue());
        setSelectedTaskIds(new Set());
        setIsSelectionMode(false);
      },
    });
  };

  // Global Keyboard Shortcut Listener for quick actions and cycling views
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Do not trigger hotkeys if user is typing in an input, textarea, select, or editable element
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Single-key hotkeys (without Meta, Ctrl, Alt)
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          handleOpenNewTask();
        } else if (e.key === 't' || e.key === 'T' || e.key === '1') {
          e.preventDefault();
          handleSelectView('today');
        } else if (e.key === 'u' || e.key === 'U' || e.key === '2') {
          e.preventDefault();
          handleSelectView('upcoming');
        } else if (e.key === 'c' || e.key === 'C' || e.key === '3') {
          e.preventDefault();
          handleSelectView('calendar');
        } else if (e.key === 's' || e.key === 'S' || e.key === '4') {
          e.preventDefault();
          handleSelectView('starred');
        } else if (e.key === '5') {
          e.preventDefault();
          handleSelectView('completed');
        } else if (e.key === 'a' || e.key === 'A' || e.key === '6') {
          e.preventDefault();
          handleSelectView('list', 'all');
        } else if (e.key === '7' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          handleSelectView('dashboard');
        } else if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          handleToggleSelectMode();
        } else if (e.key === '?') {
          e.preventDefault();
          setIsShortcutsHelpOpen(prev => !prev);
        } else if (e.key === 'Escape') {
          if (isShortcutsHelpOpen) {
            e.preventDefault();
            setIsShortcutsHelpOpen(false);
          } else if (selectedTaskIds.size > 0 || isSelectionMode) {
            e.preventDefault();
            handleDeselectAllTasks();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenNewTask, handleSelectView, isShortcutsHelpOpen, isSelectionMode, selectedTaskIds]);

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

  // Filter & Sort tasks based on view, search, priority, and sort options
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const priorityWeight: Record<Priority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const result = tasks.filter(task => {
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
          return !task.completed && (task.folderId === activeListId || task.listId === activeListId);
        case 'calendar':
          return true;
        default:
          return true;
      }
    });

    // High to Low priority sorting
    result.sort((a, b) => {
      if (sortOption === 'priority_desc') {
        const pDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
        if (pDiff !== 0) return pDiff;
        if (a.due && b.due) return a.due.localeCompare(b.due);
        if (a.due) return -1;
        if (b.due) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortOption === 'priority_asc') {
        const pDiff = (priorityWeight[a.priority] || 2) - (priorityWeight[b.priority] || 2);
        if (pDiff !== 0) return pDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortOption === 'due_date') {
        if (a.due && b.due) return a.due.localeCompare(b.due);
        if (a.due) return -1;
        if (b.due) return 1;
        return 0;
      } else if (sortOption === 'created_desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortOption === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [tasks, currentView, activeListId, searchQuery, filterPriority, sortOption]);

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
                {currentView === 'list' && (activeListId === 'all' ? 'All Tasks' : `📁 ${activeList?.title || 'Folder'}`)}
              </span>
              <span className="font-mono text-xs text-neutral-400 font-normal tabular-nums">
                ({filteredTasks.length})
              </span>
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              {currentView === 'today' && "Primary focus for today. Sorted by priority."}
              {currentView === 'upcoming' && "Deadlines and scheduled tasks for the coming days."}
              {currentView === 'starred' && "Flagged priorities."}
              {currentView === 'completed' && "Completed tasks archive."}
              {currentView === 'list' && `Items in folder "${activeList?.title || 'Collection'}".`}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-neutral-500">
            <button
              onClick={() => setIsShortcutsHelpOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded bg-stone-100 dark:bg-neutral-800 hover:bg-stone-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80 transition cursor-pointer text-[11px]"
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard className="w-3 h-3 text-neutral-500" />
              <span>Hotkeys:</span>
              <kbd className="px-1 py-0.2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded text-[10px] font-semibold text-neutral-800 dark:text-neutral-200">N</kbd>
              <span>New</span>
              <kbd className="px-1 py-0.2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded text-[10px] font-semibold text-neutral-800 dark:text-neutral-200">T</kbd>
              <span>Today</span>
              <kbd className="px-1 py-0.2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded text-[10px] font-semibold text-neutral-800 dark:text-neutral-200">?</kbd>
            </button>
            <span>
              Total: <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">{tasks.length}</strong>
            </span>
            <span>·</span>
            <span>
              Done: <span className="text-blue-600 dark:text-blue-400 font-semibold">{tasks.filter(t => t.completed).length}</span>
            </span>
          </div>
        </div>

        {/* Minimal Search, Filter & Priority Sorting Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex-1 min-w-[180px] flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-md px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 transition">
            <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, notes..."
              className="w-full bg-transparent outline-none placeholder-neutral-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-neutral-400 hover:text-neutral-600">
                ✕
              </button>
            )}
          </div>

          {/* Quick Priority High to Low Toggle Button */}
          <button
            onClick={() => handleSetSortOption(sortOption === 'priority_desc' ? 'priority_asc' : 'priority_desc')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition cursor-pointer border ${
              sortOption === 'priority_desc'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                : 'bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:border-blue-600'
            }`}
            title="Sort tasks by Priority High to Low"
          >
            <ArrowDownWideNarrow className="w-3.5 h-3.5" />
            <span>Priority: {sortOption === 'priority_desc' ? 'High → Low' : sortOption === 'priority_asc' ? 'Low → High' : 'Custom'}</span>
          </button>

          {/* Detailed Sort Selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-md px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300">
            <span className="font-mono text-[10px] text-neutral-400 uppercase">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => handleSetSortOption(e.target.value as SortOption)}
              className="bg-transparent outline-none cursor-pointer text-xs"
            >
              <option value="priority_desc">Priority: High to Low</option>
              <option value="priority_asc">Priority: Low to High</option>
              <option value="due_date">Due Date</option>
              <option value="created_desc">Recently Created</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-md px-2.5 py-1">
            <Filter className="w-3 h-3 text-neutral-400" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
              className="bg-transparent outline-none text-neutral-800 dark:text-neutral-200 cursor-pointer font-medium text-xs"
            >
              <option value="all">Filter: All Priorities</option>
              <option value="urgent">Urgent Only</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>
          </div>

          {/* Multi-Select Batch Mode Button */}
          <button
            onClick={handleToggleSelectMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition cursor-pointer border ${
              isSelectionMode
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white font-semibold'
                : 'bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800/80 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'
            }`}
            title="Toggle Selection Mode (Hotkey: X)"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isSelectionMode ? `Select Mode (${selectedTaskIds.size})` : 'Select'}</span>
          </button>
        </div>
      </div>

      {/* Task List Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 max-w-3xl w-full mx-auto pb-24">
        {/* Quick Add Bar */}
        {currentView !== 'completed' && !isSelectionMode && (
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
                isSelectionMode={isSelectionMode}
                isSelected={selectedTaskIds.has(task.id)}
                onToggleSelect={handleToggleSelectTask}
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

      {/* Floating Batch Action Bar */}
      <BatchActionBar
        selectedCount={selectedTaskIds.size}
        totalCount={filteredTasks.length}
        lists={lists}
        onSelectAll={handleSelectAllTasks}
        onDeselectAll={handleDeselectAllTasks}
        onBatchComplete={handleBatchComplete}
        onBatchMove={handleBatchMove}
        onBatchDelete={handleBatchDelete}
      />
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
              onOpenShortcuts={() => setIsShortcutsHelpOpen(true)}
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
            ) : currentView === 'dashboard' ? (
              <TrendsDashboard
                tasks={tasks}
                lists={lists}
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
          onCreateFolder={handleCreateList}
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

        {/* Keyboard Shortcuts Cheatsheet Modal */}
        <KeyboardShortcutsModal
          isOpen={isShortcutsHelpOpen}
          onClose={() => setIsShortcutsHelpOpen(false)}
        />

        {/* Firebase / Google Auth Error Guidance Modal */}
        <AuthErrorModal
          isOpen={Boolean(authError)}
          onClose={() => setAuthError(null)}
          errorCode={authError?.code}
          errorMessage={authError?.message}
        />
      </div>
    </div>
  );
}
