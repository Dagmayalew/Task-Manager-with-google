import { TaskItem, TaskList, CalendarEvent, SyncQueueItem } from '../types';

const STORAGE_KEYS = {
  TASKS: 'chronotask_tasks_v1',
  LISTS: 'chronotask_lists_v1',
  CALENDAR_CACHE: 'chronotask_calendar_cache_v1',
  SYNC_QUEUE: 'chronotask_sync_queue_v1',
  ACTIVE_LIST_ID: 'chronotask_active_list_id',
  THEME_MODE: 'chronotask_theme_mode',
  DISPLAY_MODE: 'chronotask_display_mode',
  LAST_SYNCED: 'chronotask_last_synced',
  SORT_OPTION: 'chronotask_sort_option',
};

const DEFAULT_LISTS: TaskList[] = [
  {
    id: 'default_my_tasks',
    title: 'General',
    folderType: 'general',
    color: '#2563eb', // Color 1: Cobalt Blue
    isDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default_work',
    title: 'Work & Projects',
    folderType: 'work',
    color: '#e11d48', // Color 2: Swiss Vermilion
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default_personal',
    title: 'Personal',
    folderType: 'personal',
    color: '#2563eb', // Color 1: Cobalt Blue
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default_urgent',
    title: 'Urgent & Critical',
    folderType: 'urgent',
    color: '#e11d48', // Color 2: Swiss Vermilion
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_SAMPLE_TASKS: TaskItem[] = [
  {
    id: 'sample_1',
    listId: 'default_my_tasks',
    folderId: 'default_my_tasks',
    folderType: 'general',
    title: 'Connect Google Tasks & Calendar account',
    notes: 'Click the "Sign in with Google" button to sync your lists, tasks, and calendar events.',
    completed: false,
    priority: 'urgent',
    starred: true,
    due: new Date().toISOString().split('T')[0],
    dueTime: '10:00',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'local_only',
  },
  {
    id: 'sample_2',
    listId: 'default_work',
    folderId: 'default_work',
    folderType: 'work',
    title: 'Review Chrome Extension build & package manifest',
    notes: 'Inspect the Chrome Extension panel to preview popup/sidepanel views or download the unpacked extension zip.',
    completed: false,
    priority: 'high',
    starred: true,
    due: new Date().toISOString().split('T')[0],
    dueTime: '14:30',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'local_only',
  },
  {
    id: 'sample_3',
    listId: 'default_personal',
    folderId: 'default_personal',
    folderType: 'personal',
    title: 'Schedule weekly planning session to Google Calendar',
    notes: 'Click the calendar icon on any task to schedule a dedicated time-block on your Google Calendar.',
    completed: false,
    priority: 'medium',
    starred: false,
    due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'local_only',
  },
  {
    id: 'sample_4',
    listId: 'default_my_tasks',
    folderId: 'default_my_tasks',
    folderType: 'general',
    title: 'Test offline mode by disconnecting Wi-Fi',
    notes: 'Create and check off tasks offline. Chronotask automatically queues changes and syncs upon reconnection.',
    completed: true,
    completedAt: new Date().toISOString(),
    priority: 'low',
    starred: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'local_only',
  },
];

export const storageService = {
  // Load tasks from local storage with full v1 backwards-compatibility
  loadTasks(): TaskItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (!data) {
        this.saveTasks(INITIAL_SAMPLE_TASKS);
        return INITIAL_SAMPLE_TASKS;
      }
      const rawTasks = JSON.parse(data);
      // Ensure v1 tasks without folderId or folderType are gracefully normalized
      return rawTasks.map((t: any) => ({
        ...t,
        folderId: t.folderId || t.listId || 'default_my_tasks',
        priority: t.priority || 'medium',
      }));
    } catch (e) {
      console.warn('Error reading tasks from storage:', e);
      return INITIAL_SAMPLE_TASKS;
    }
  },

  // Save tasks to local storage
  saveTasks(tasks: TaskItem[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Error saving tasks to storage:', e);
    }
  },

  // Load lists
  loadLists(): TaskList[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LISTS);
      if (!data) {
        this.saveLists(DEFAULT_LISTS);
        return DEFAULT_LISTS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.warn('Error reading lists from storage:', e);
      return DEFAULT_LISTS;
    }
  },

  // Save lists
  saveLists(lists: TaskList[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(lists));
    } catch (e) {
      console.error('Error saving lists to storage:', e);
    }
  },

  // Calendar cache
  loadCalendarCache(): CalendarEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CALENDAR_CACHE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveCalendarCache(events: CalendarEvent[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.CALENDAR_CACHE, JSON.stringify(events));
    } catch (e) {
      console.error('Error saving calendar cache:', e);
    }
  },

  // Sync queue management for offline actions
  loadSyncQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSyncQueue(queue: SyncQueueItem[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.error('Error saving sync queue:', e);
    }
  },

  enqueueSync(action: SyncQueueItem['action'], payload: any) {
    const queue = this.loadSyncQueue();
    const item: SyncQueueItem = {
      id: 'sq_' + Math.random().toString(36).substring(2, 9),
      action,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    queue.push(item);
    this.saveSyncQueue(queue);
    return item;
  },

  removeQueueItem(id: string) {
    const queue = this.loadSyncQueue().filter(item => item.id !== id);
    this.saveSyncQueue(queue);
  },

  clearSyncQueue() {
    this.saveSyncQueue([]);
  },

  // Last synced timestamp
  getLastSynced(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNCED);
  },

  setLastSynced(isoString: string) {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNCED, isoString);
  },

  // Active list ID
  getActiveListId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_LIST_ID) || 'all';
  },

  setActiveListId(id: string) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_LIST_ID, id);
  },

  // Display mode
  getDisplayMode(): string {
    return localStorage.getItem(STORAGE_KEYS.DISPLAY_MODE) || 'desktop';
  },

  setDisplayMode(mode: string) {
    localStorage.setItem(STORAGE_KEYS.DISPLAY_MODE, mode);
  },

  // Theme mode ('light' | 'dark')
  getTheme(): 'light' | 'dark' {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  },

  setTheme(theme: 'light' | 'dark') {
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, theme);
  },

  // Priority and general sorting
  getSortOption(): 'priority_desc' | 'priority_asc' | 'due_date' | 'created_desc' | 'title' {
    const saved = localStorage.getItem(STORAGE_KEYS.SORT_OPTION);
    return (saved as any) || 'priority_desc'; // Default priority High to Low per user request
  },

  setSortOption(sort: string) {
    localStorage.setItem(STORAGE_KEYS.SORT_OPTION, sort);
  },
};

