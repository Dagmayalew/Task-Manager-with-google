import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
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
import { ContextRail } from './components/ContextRail';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Smartphone, 
  Sidebar as SidebarIcon,
  Maximize2,
  ArrowUpDown,
  Keyboard,
  CheckSquare,
  Copy
} from 'lucide-react';

export default function App() {
  // Theme state: European Minimalist Light by default, with dark toggle
  const [theme, setTheme] = useState<'light' | 'dark'>(() => storageService.getTheme());

  const handleToggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    storageService.setTheme(next);
  };

  // Apply the theme to <html> so tokens, body and native controls follow the
  // in-app toggle instead of the operating system preference.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

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
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

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
        user: user ? { email: user.email, displayName: user.displayName } : null,
        lastSynced: storageService.getLastSynced() || new Date().toISOString(),
      }, window.location.origin);
    };

    broadcastToExtension();
  }, [tasks, lists, user]);

  // Periodic automatic sync broadcast every 3 seconds so extension is always updated in real time
  useEffect(() => {
    const interval = setInterval(() => {
      window.postMessage({
        type: 'CHRONOTASK_SYNC_TO_EXTENSION',
        source: 'chronotask-web-app',
        tasks: storageService.loadTasks(),
        lists: storageService.loadLists(),
        user: user ? { email: user.email, displayName: user.displayName } : null,
        lastSynced: storageService.getLastSynced() || new Date().toISOString(),
      }, window.location.origin);
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    // 2. Listen for messages from extension content script
    const handleExtensionSyncMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.source !== 'chronotask-extension') return; // Strictly only accept from verified extension bridge

      // When extension provides its stored tasks and folders/lists
      if (event.data.type === 'CHRONOTASK_SYNC_FROM_EXTENSION') {
        // 1. Sanitize and merge lists/folders from extension
        const rawLists = Array.isArray(event.data.lists) ? event.data.lists.slice(0, 200) : [];
        const validLists: TaskList[] = [];
        for (const l of rawLists) {
          if (l && typeof l === 'object' && typeof l.id === 'string' && typeof l.title === 'string') {
            const cleanId = l.id.slice(0, 128);
            const cleanTitle = l.title.trim().slice(0, 200);
            if (cleanId && cleanTitle) {
              validLists.push({
                ...l,
                id: cleanId,
                title: cleanTitle,
                color: typeof l.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(l.color) ? l.color : undefined
              });
            }
          }
        }

        if (validLists.length > 0) {
          setLists(prev => {
            const listMap = new Map<string, TaskList>();
            prev.forEach(l => listMap.set(l.id, l));

            let listsChanged = false;
            validLists.forEach(extList => {
              if (!listMap.has(extList.id)) {
                listMap.set(extList.id, extList);
                listsChanged = true;
                if (accessToken) {
                  googleTasksService.createTaskList(accessToken, extList.title).then(created => {
                    setLists(curr => curr.map(l => l.id === extList.id ? { ...l, googleListId: created.id } : l));
                  }).catch(() => {});
                }
              }
            });

            return listsChanged ? Array.from(listMap.values()) : prev;
          });
        }

        // 2. Sanitize and merge tasks
        const rawTasks = Array.isArray(event.data.tasks) ? event.data.tasks.slice(0, 1000) : [];
        const allowedPriorities = ['urgent', 'high', 'medium', 'low'];
        const validTasks: TaskItemType[] = [];
        for (const t of rawTasks) {
          if (t && typeof t === 'object' && typeof t.id === 'string' && typeof t.title === 'string') {
            const cleanId = t.id.slice(0, 128);
            const cleanTitle = t.title.trim().slice(0, 500);
            if (cleanId && cleanTitle) {
              validTasks.push({
                ...t,
                id: cleanId,
                title: cleanTitle,
                notes: typeof t.notes === 'string' ? t.notes.slice(0, 2000) : undefined,
                priority: allowedPriorities.includes(t.priority) ? t.priority : 'medium',
                completed: Boolean(t.completed),
                due: typeof t.due === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(t.due) ? t.due.slice(0, 40) : undefined,
                folderId: typeof t.folderId === 'string' ? t.folderId.slice(0, 128) : undefined,
                listId: typeof t.listId === 'string' ? t.listId.slice(0, 128) : undefined,
              });
            }
          }
        }

        if (validTasks.length > 0) {
          setTasks(prev => {
            const taskMap = new Map<string, TaskItemType>();
            prev.forEach(t => taskMap.set(t.id, t));

            let hasChanges = false;
            validTasks.forEach(extTask => {
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

      // Web app ping request from content script or popup
      if (event.data.type === 'CHRONOTASK_PING_FOR_STATE') {
        window.postMessage({
          type: 'CHRONOTASK_SYNC_TO_EXTENSION',
          source: 'chronotask-web-app',
          tasks: storageService.loadTasks(),
          lists: storageService.loadLists(),
          user: user ? { email: user.email, displayName: user.displayName } : null,
          lastSynced: storageService.getLastSynced() || new Date().toISOString(),
        }, window.location.origin);
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
            const savedList = storageService.loadLists().find(list => list.id === item.payload.listId);
            const created = await googleTasksService.createTask(token, savedList?.googleListId || item.payload.listId, item.payload);
            setTasks(prev => prev.map(t => t.id === item.payload.id ? { ...t, googleTaskId: created.googleTaskId, syncStatus: 'synced' } : t));
          } else if (item.action === 'UPDATE_TASK') {
            if (item.payload.googleTaskId) {
              const savedList = storageService.loadLists().find(list => list.id === item.payload.listId);
              await googleTasksService.updateTask(token, savedList?.googleListId || item.payload.listId, item.payload.googleTaskId, item.payload);
            }
          } else if (item.action === 'DELETE_TASK') {
            if (item.payload.googleTaskId) {
              const savedList = storageService.loadLists().find(list => list.id === item.payload.listId);
              await googleTasksService.deleteTask(token, savedList?.googleListId || item.payload.listId, item.payload.googleTaskId);
            }
          } else if (item.action === 'CREATE_LIST') {
            const created = await googleTasksService.createTaskList(token, item.payload.title);
            if (item.payload.localId) {
              const updatedLists = storageService.loadLists().map(list =>
                list.id === item.payload.localId ? { ...list, googleListId: created.id } : list
              );
              storageService.saveLists(updatedLists);
              setLists(updatedLists);
            }
          } else if (item.action === 'DELETE_LIST') {
            await googleTasksService.deleteTaskList(token, item.payload.googleListId);
          } else if (item.action === 'MOVE_TASK') {
            await googleTasksService.moveTask(
              token,
              item.payload.sourceListId,
              item.payload.googleTaskId,
              item.payload.destinationListId
            );
          } else if (item.action === 'SCHEDULE_CALENDAR_EVENT') {
            await googleCalendarService.createCalendarEvent(token, item.payload);
          } else if (item.action === 'DELETE_CALENDAR_EVENT') {
            await googleCalendarService.deleteCalendarEvent(token, item.payload.eventId);
          }
        } catch (err) {
          console.warn('Queue replay error:', item, err);
          item.retries += 1;
          item.lastError = err instanceof Error ? err.message : 'Unknown sync error';
          remainingQueue.push(item);
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

  // Manual & Auto Sync - Always triggers bidirectional sync with extension & Google Tasks
  const handleSyncNow = async () => {
    setIsSyncing(true);

    // 1. Immediately broadcast state to extension content script
    window.postMessage({
      type: 'CHRONOTASK_SYNC_TO_EXTENSION',
      source: 'chronotask-web-app',
      tasks,
      lists,
      user: user ? { email: user.email, displayName: user.displayName } : null,
      lastSynced: new Date().toISOString(),
    }, window.location.origin);

    // 2. Sync with Google Tasks API
    try {
      if (accessToken) {
        await processSyncQueueAndFetch(accessToken);
      } else if (user) {
        // Re-authenticate to get fresh Google OAuth access token
        const result = await googleSignIn();
        if (result?.accessToken) {
          setAccessToken(result.accessToken);
          await processSyncQueueAndFetch(result.accessToken);
        }
      } else {
        // Prompt login
        await handleLogin();
      }
    } catch (err) {
      console.warn('Sync error:', err);
    } finally {
      const nowIso = new Date().toISOString();
      storageService.setLastSynced(nowIso);
      setLastSynced(nowIso);
      setIsSyncing(false);
    }
  };

  // Periodic Google Tasks background auto-sync every 30 seconds when online
  useEffect(() => {
    if (!accessToken || !isOnline) return;
    const interval = setInterval(() => {
      processSyncQueueAndFetch(accessToken);
    }, 30000);
    return () => clearInterval(interval);
  }, [accessToken, isOnline, processSyncQueueAndFetch]);

  // Set Display Mode
  const handleSetDisplayMode = (mode: ExtensionDisplayMode) => {
    setDisplayMode(mode);
    storageService.setDisplayMode(mode);
  };

  const getGoogleListId = (listId: string) =>
    lists.find(list => list.id === listId)?.googleListId || listId;

  const formatTaskForClipboard = (task: TaskItemType, includeFolder = true) => {
    const taskList = lists.find(list => list.id === (task.folderId || task.listId));
    const status = task.completed ? '[x]' : '[ ]';
    const metadataParts = [
      task.completed ? 'Completed' : null,
      `${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority`,
      task.due ? `Due ${task.due}${task.dueTime ? ` at ${task.dueTime}` : ''}` : null,
      includeFolder && taskList ? `Folder: ${taskList.title}` : null,
    ].filter(Boolean);

    const firstLine = `${status} ${task.title}${metadataParts.length > 0 ? ` (${metadataParts.join(' · ')})` : ''}`;
    if (task.notes?.trim()) {
      return `${firstLine}\n  Notes: ${task.notes.trim().replace(/\n/g, '\n  ')}`;
    }
    return firstLine;
  };

  const copyText = async (text: string, successMessage: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyFeedback(successMessage);
      window.setTimeout(() => setCopyFeedback(null), 2200);
    } catch (error) {
      console.error('Copy failed:', error);
      setCopyFeedback('Could not copy to clipboard');
      window.setTimeout(() => setCopyFeedback(null), 2200);
    }
  };

  const handleCopyTask = (task: TaskItemType) => {
    void copyText(formatTaskForClipboard(task), 'Task copied to clipboard');
  };

  const handleCopyFolderTasks = (list: TaskList) => {
    const listTasks = tasks.filter(task => task.folderId === list.id || task.listId === list.id);
    if (listTasks.length === 0) {
      setCopyFeedback(`Folder "${list.title}" has no tasks`);
      window.setTimeout(() => setCopyFeedback(null), 2200);
      return;
    }
    const copiedText = [
      `📁 ${list.title} (${listTasks.length} task${listTasks.length === 1 ? '' : 's'})`,
      '',
      ...listTasks.map(task => formatTaskForClipboard(task, false)),
    ].join('\n');
    void copyText(copiedText, `${listTasks.length} task${listTasks.length === 1 ? '' : 's'} copied from ${list.title}`);
  };

  const handleBatchCopy = () => {
    const selectedTasks = filteredTasks.filter(task => selectedTaskIds.has(task.id));
    if (selectedTasks.length === 0) return;
    const copiedText = [
      `Selected Tasks (${selectedTasks.length})`,
      '',
      ...selectedTasks.map(task => formatTaskForClipboard(task, true)),
    ].join('\n');
    void copyText(copiedText, `${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} copied to clipboard`);
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

        if (targetList?.googleListId) {
          if (accessToken && isOnline) {
            try {
              await googleTasksService.deleteTaskList(accessToken, targetList.googleListId);
              return;
            } catch (e) {
              console.warn('Failed deleting list; queued for retry:', e);
            }
          }
          storageService.enqueueSync('DELETE_LIST', { googleListId: targetList.googleListId });
          setSyncQueue(storageService.loadSyncQueue());
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
        await googleTasksService.updateTask(accessToken, getGoogleListId(task.listId), task.googleTaskId, {
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
        await googleTasksService.updateTask(accessToken, getGoogleListId(updatedTask.listId), updatedTask.googleTaskId, updatedTask);
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
            await googleTasksService.updateTask(accessToken, getGoogleListId(t.listId), t.googleTaskId, {
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
        const sourceListId = lists.find(list => list.id === t.listId)?.googleListId || t.listId;
        const destinationListId = lists.find(list => list.id === targetFolderId)?.googleListId || targetFolderId;
        const payload = { googleTaskId: t.googleTaskId, sourceListId, destinationListId };
        if (t.googleTaskId && accessToken && isOnline) {
          try {
            await googleTasksService.moveTask(accessToken, sourceListId, t.googleTaskId, destinationListId);
          } catch (e) {
            storageService.enqueueSync('MOVE_TASK', payload);
          }
        } else if (t.googleTaskId) {
          storageService.enqueueSync('MOVE_TASK', payload);
        }
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
          if (t?.googleTaskId) {
            if (accessToken && isOnline) {
              try {
                await googleTasksService.deleteTask(accessToken, getGoogleListId(t.listId), t.googleTaskId);
              } catch (e) {
                storageService.enqueueSync('DELETE_TASK', { googleTaskId: t.googleTaskId, listId: t.listId });
              }
            } else {
              storageService.enqueueSync('DELETE_TASK', { googleTaskId: t.googleTaskId, listId: t.listId });
            }
          }
          if (t?.calendarEventId && accessToken && isOnline) {
            try {
              await googleCalendarService.deleteCalendarEvent(accessToken, t.calendarEventId);
              setCalendarEvents(prev => prev.filter(e => e.id !== t.calendarEventId));
            } catch (e) {
              console.warn('Calendar delete error:', e);
              storageService.enqueueSync('DELETE_CALENDAR_EVENT', { eventId: t.calendarEventId });
            }
          } else if (t?.calendarEventId) {
            storageService.enqueueSync('DELETE_CALENDAR_EVENT', { eventId: t.calendarEventId });
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
        } else if (e.key === '/') {
          e.preventDefault();
          searchInputRef.current?.focus();
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

        if (task?.googleTaskId) {
          if (accessToken && isOnline) {
            try {
              await googleTasksService.deleteTask(accessToken, getGoogleListId(task.listId), task.googleTaskId);
            } catch (e) {
              storageService.enqueueSync('DELETE_TASK', { googleTaskId: task.googleTaskId, listId: task.listId });
            }
          } else {
            storageService.enqueueSync('DELETE_TASK', { googleTaskId: task.googleTaskId, listId: task.listId });
          }
        }

        if (task?.calendarEventId && accessToken && isOnline) {
          try {
            await googleCalendarService.deleteCalendarEvent(accessToken, task.calendarEventId);
            setCalendarEvents(prev => prev.filter(e => e.id !== task.calendarEventId));
          } catch (e) {
            console.warn('Failed deleting calendar event:', e);
            storageService.enqueueSync('DELETE_CALENDAR_EVENT', { eventId: task.calendarEventId });
          }
        } else if (task?.calendarEventId) {
          storageService.enqueueSync('DELETE_CALENDAR_EVENT', { eventId: task.calendarEventId });
        }
        setSyncQueue(storageService.loadSyncQueue());
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
            storageService.enqueueSync('DELETE_CALENDAR_EVENT', { eventId: task.calendarEventId });
          }
        } else if (task.calendarEventId) {
          storageService.enqueueSync('DELETE_CALENDAR_EVENT', { eventId: task.calendarEventId });
        }
        setSyncQueue(storageService.loadSyncQueue());
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

  // Render main workspace: editorial header, consolidated toolbar, list + day rail
  const renderMainTaskWorkspace = () => {
    const completedInView = filteredTasks.filter((t) => t.completed).length;
    const todayLabel = new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const viewTitle =
      currentView === 'today'
        ? 'Today'
        : currentView === 'upcoming'
          ? 'Upcoming'
          : currentView === 'starred'
            ? 'Starred'
            : currentView === 'completed'
              ? 'Completed'
              : activeListId === 'all'
                ? 'All tasks'
                : activeList?.title || 'Collection';

    const viewDescription =
      currentView === 'today'
        ? 'Your focus for the day, highest priority first.'
        : currentView === 'upcoming'
          ? 'Everything with a date on the horizon.'
          : currentView === 'starred'
            ? 'What you flagged to keep close at hand.'
            : currentView === 'completed'
              ? 'Closed loops and finished work.'
              : activeListId === 'all'
                ? 'Every open task across your collections.'
                : activeList
                  ? `Everything filed under ${activeList.title}.`
                  : 'This collection is empty.';

    const sortLabels: Record<SortOption, string> = {
      priority_desc: 'Priority · high to low',
      priority_asc: 'Priority · low to high',
      due_date: 'Due date',
      created_desc: 'Recently added',
      title: 'Alphabetical',
    };

    const hasActiveFilter = filterPriority !== 'all' || Boolean(searchQuery.trim());

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 items-start gap-x-10 px-5 py-7 sm:px-8 xl:grid-cols-[minmax(0,1fr)_296px]">
          <div className="min-w-0">
            {/* Editorial header */}
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="min-w-0">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-3">
                  {todayLabel}
                </p>
                <div className="mt-1.5 flex items-baseline gap-3">
                  <h1 className="font-serif text-[38px] leading-none tracking-[-0.02em] text-ink sm:text-[44px]">
                    {viewTitle}
                  </h1>
                  <span className="font-mono text-[11px] tabular-nums text-ink-3">
                    {filteredTasks.length}
                  </span>
                </div>
                <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-ink-2">
                  {viewDescription}
                </p>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                {currentView === 'list' && activeList && activeListId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleCopyFolderTasks(activeList)}
                    title={`Copy all tasks in "${activeList.title}"`}
                    className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
                  >
                    <Copy className="h-3 w-3" />
                    Copy list
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsShortcutsHelpOpen(true)}
                  title="Keyboard shortcuts (?)"
                  aria-label="Keyboard shortcuts"
                  className="grid h-8 w-8 place-items-center rounded-md border border-line bg-surface text-ink-3 transition-colors hover:border-line-strong hover:text-ink"
                >
                  <Keyboard className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleSelectMode}
                  title="Toggle selection mode (X)"
                  className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors ${
                    isSelectionMode
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>{isSelectionMode ? `${selectedTaskIds.size} selected` : 'Select'}</span>
                </button>
              </div>
            </header>

            {/* Toolbar */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 transition-colors focus-within:border-line-strong">
                <Search className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                <input
                  type="text"
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks and notes"
                  aria-label="Search tasks"
                  className="w-full min-w-0 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="text-[13px] leading-none text-ink-3 transition-colors hover:text-ink"
                  >
                    ✕
                  </button>
                ) : (
                  <kbd className="hidden rounded border border-line px-1 font-mono text-[9px] text-ink-3 sm:block">
                    /
                  </kbd>
                )}
              </div>

              <label className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11.5px] text-ink-2 transition-colors focus-within:border-line-strong hover:border-line-strong">
                <Filter className="h-3 w-3 text-ink-3" />
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
                  aria-label="Filter by priority"
                  className="cursor-pointer bg-transparent font-medium text-ink outline-none"
                >
                  <option value="all">All priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11.5px] text-ink-2 transition-colors focus-within:border-line-strong hover:border-line-strong">
                <ArrowUpDown className="h-3 w-3 text-ink-3" />
                <select
                  value={sortOption}
                  onChange={(e) => handleSetSortOption(e.target.value as SortOption)}
                  aria-label="Sort tasks"
                  className="cursor-pointer bg-transparent font-medium text-ink outline-none"
                >
                  {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                    <option key={option} value={option}>
                      {sortLabels[option]}
                    </option>
                  ))}
                </select>
              </label>

              {hasActiveFilter && (
                <button
                  onClick={() => {
                    setFilterPriority('all');
                    setSearchQuery('');
                  }}
                  className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Composer */}
            <div className="mt-4">
              {currentView !== 'completed' && !isSelectionMode && (
                <QuickAddBar
                  lists={lists}
                  activeListId={activeListId}
                  hasGoogleCalendarAuth={Boolean(accessToken)}
                  onAddTask={handleAddTask}
                />
              )}
            </div>

            {/* Task list */}
            <section className="mt-6">
              {filteredTasks.length === 0 ? (
                <div className="border-t border-line py-20 text-center">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-ink-3" />
                  <h3 className="mt-3 font-serif text-[22px] leading-tight text-ink">
                    {searchQuery ? 'No matches' : 'Nothing here yet'}
                  </h3>
                  <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-ink-3">
                    {searchQuery
                      ? 'Try a different search, or clear the filters above.'
                      : currentView === 'completed'
                        ? 'Finished tasks will collect here.'
                        : 'A clear list. Add the next thing worth doing.'}
                  </p>
                  {!searchQuery && currentView !== 'completed' && (
                    <button
                      onClick={handleOpenNewTask}
                      className="mt-4 rounded-md bg-ink px-3 py-1.5 text-[11.5px] font-semibold text-paper transition-opacity hover:opacity-90"
                    >
                      New task
                    </button>
                  )}
                </div>
              ) : (
                <div className="border-t border-line">
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
                      onCopy={handleCopyTask}
                      onDelete={handleDeleteTask}
                      onScheduleToCalendar={(t) => setEditingTask(t)}
                    />
                  ))}
                </div>
              )}

              {filteredTasks.length > 0 && (
                <div className="mt-4 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">
                  <span>
                    {filteredTasks.length - completedInView} open · {completedInView} done
                  </span>
                  <span>{sortLabels[sortOption]}</span>
                </div>
              )}
            </section>
          </div>

          <ContextRail
            tasks={tasks}
            calendarEvents={calendarEvents}
            onOpenTask={(t) => setEditingTask(t)}
            onOpenCalendar={() => handleSelectView('calendar')}
          />
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
          onBatchCopy={handleBatchCopy}
        />
      </div>
    );
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper font-sans text-ink transition-colors duration-150">
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
          onOpenShortcuts={() => setIsShortcutsHelpOpen(true)}
        />

        {copyFeedback && (
          <div
            role="status"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-3.5 py-2 rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {copyFeedback}
          </div>
        )}

        {/* Display modes */}
        {displayMode === 'desktop' ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Compact navigation for small screens (sidebar is hidden) */}
            <nav className="flex flex-wrap items-center gap-1 border-b border-line bg-paper px-3 py-2 md:hidden">
              {([
                ['today', 'Today'],
                ['upcoming', 'Upcoming'],
                ['calendar', 'Schedule'],
                ['starred', 'Starred'],
                ['completed', 'Completed'],
                ['dashboard', 'Trends'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => handleSelectView(id)}
                  className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    currentView === id
                      ? 'bg-ink text-paper'
                      : 'text-ink-2 hover:bg-subtle hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => handleSelectView('list', 'all')}
                className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  currentView === 'list' && activeListId === 'all'
                    ? 'bg-ink text-paper'
                    : 'text-ink-2 hover:bg-subtle hover:text-ink'
                }`}
              >
                All tasks
              </button>
              <select
                value={currentView === 'list' && activeListId !== 'all' ? activeListId : ''}
                onChange={(e) => e.target.value && handleSelectView('list', e.target.value)}
                aria-label="Collections"
                className="ml-auto shrink-0 cursor-pointer rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-ink-2 outline-none"
              >
                <option value="">Collections…</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </nav>

            <div className="flex flex-1 overflow-hidden">
              <Sidebar
              currentView={currentView}
              activeListId={activeListId}
              lists={lists}
              tasks={tasks}
              lastSynced={lastSynced}
              onSelectView={handleSelectView}
              onCreateList={handleCreateList}
              onDeleteList={handleDeleteList}
              onCopyListTasks={handleCopyFolderTasks}
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
          </div>
        ) : displayMode === 'popup' ? (
          /* Chrome Extension Popup Simulator View */
          <div className="flex-1 bg-subtle flex flex-col items-center justify-center p-6">
            <div className="mb-3 text-xs text-ink-3 flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Chrome extension popup · 380 × 560</span>
              <button
                onClick={() => handleSetDisplayMode('desktop')}
                className="text-ink font-medium hover:underline flex items-center gap-1 ml-2"
              >
                <Maximize2 className="w-3 h-3" /> Return
              </button>
            </div>

            <div className="w-[380px] h-[560px] bg-surface border border-line rounded-md flex flex-col overflow-hidden relative">
              <div className="px-3.5 py-2.5 bg-paper border-b border-line flex items-center justify-between">
                <span className="font-semibold text-xs text-ink tracking-tight">Chronotask</span>
                <span className="font-mono text-[10px] text-ink-3">
                  {tasks.filter(t => !t.completed).length} open
                </span>
              </div>

              <div className="p-3 border-b border-line">
                <QuickAddBar
                  lists={lists}
                  activeListId={activeListId}
                  hasGoogleCalendarAuth={Boolean(accessToken)}
                  onAddTask={handleAddTask}
                />
              </div>

              <div className="flex-1 overflow-y-auto px-3 divide-y divide-line">
                {filteredTasks.slice(0, 20).map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    lists={lists}
                    hasGoogleCalendarAuth={Boolean(accessToken)}
                    onToggleComplete={handleToggleComplete}
                    onToggleStar={handleToggleStar}
                    onEdit={(t) => setEditingTask(t)}
                    onCopy={handleCopyTask}
                    onDelete={handleDeleteTask}
                    onScheduleToCalendar={(t) => setEditingTask(t)}
                  />
                ))}
              </div>

              <div className="px-3.5 py-2 bg-paper border-t border-line flex items-center justify-between text-[11px] text-ink-3 font-mono">
                <span>{isOnline ? 'Online' : 'Offline'}</span>
                <button
                  onClick={() => setIsExtensionModalOpen(true)}
                  className="text-accent hover:underline font-sans font-medium"
                >
                  Install Extension →
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Chrome Extension Side Panel Simulator View */
          <div className="flex-1 flex overflow-hidden bg-subtle">
            <div className="flex-1 bg-paper/60 p-8 flex flex-col justify-center items-center text-center border-r border-line">
              <div className="max-w-md space-y-3">
                <div className="w-10 h-10 rounded-sm bg-accent text-accent-ink flex items-center justify-center mx-auto font-mono text-xs font-bold">
                  SP
                </div>
                <h2 className="text-base font-bold text-ink tracking-tight">Chrome Side Panel Simulator</h2>
                <p className="text-xs text-ink-2 leading-relaxed">
                  When deployed, Chronotask docks beside any web page so you can manage your schedule and capture tasks without context switching.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => setIsExtensionModalOpen(true)}
                    className="px-3.5 py-1.5 bg-ink hover:bg-accent text-paper hover:text-accent-ink rounded-md text-xs font-semibold transition cursor-pointer"
                  >
                    Download Extension ZIP
                  </button>
                  <button
                    onClick={() => handleSetDisplayMode('desktop')}
                    className="px-3.5 py-1.5 border border-line text-ink-2 hover:border-ink hover:text-ink rounded-md text-xs font-medium cursor-pointer"
                  >
                    Exit View
                  </button>
                </div>
              </div>
            </div>

            {/* Side Panel Drawer (360px) */}
            <div className="w-[360px] bg-surface flex flex-col h-full border-l border-line">
              <div className="px-3.5 py-2.5 border-b border-line flex items-center justify-between">
                <span className="text-xs font-semibold text-ink tracking-tight">Chronotask Side Panel</span>
                <span className="font-mono text-[10px] text-ink-3">360px</span>
              </div>

              <div className="p-3 border-b border-line">
                <QuickAddBar
                  lists={lists}
                  activeListId={activeListId}
                  hasGoogleCalendarAuth={Boolean(accessToken)}
                  onAddTask={handleAddTask}
                />
              </div>

              <div className="flex-1 overflow-y-auto px-3 divide-y divide-line">
                {filteredTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    lists={lists}
                    hasGoogleCalendarAuth={Boolean(accessToken)}
                    onToggleComplete={handleToggleComplete}
                    onToggleStar={handleToggleStar}
                    onEdit={(t) => setEditingTask(t)}
                    onCopy={handleCopyTask}
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
          onCopy={handleCopyTask}
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
  );
}
