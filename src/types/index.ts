export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskItem {
  id: string; // local ID or Google Tasks ID
  googleTaskId?: string; // ID if synced with Google Tasks
  listId: string; // List ID
  title: string;
  notes?: string;
  completed: boolean;
  completedAt?: string;
  due?: string; // ISO date string (YYYY-MM-DD or full timestamp)
  dueTime?: string; // HH:mm format if specific time set
  priority: Priority;
  starred?: boolean;
  calendarEventId?: string; // Synced Google Calendar event ID if scheduled
  calendarScheduledTime?: {
    start: string; // ISO timestamp
    end: string;   // ISO timestamp
  };
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'local_only' | 'error';
  lastSyncError?: string;
}

export interface TaskList {
  id: string; // local ID or Google Tasks list ID
  googleListId?: string;
  title: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
  isTaskBlock?: boolean; // If created by this app for a task
  colorId?: string;
}

export type SyncActionType = 
  | 'CREATE_TASK' 
  | 'UPDATE_TASK' 
  | 'DELETE_TASK' 
  | 'CREATE_LIST' 
  | 'DELETE_LIST' 
  | 'SCHEDULE_CALENDAR_EVENT'
  | 'DELETE_CALENDAR_EVENT';

export interface SyncQueueItem {
  id: string;
  action: SyncActionType;
  payload: any;
  timestamp: number;
  retries: number;
  lastError?: string;
}

export type ViewFilter = 'today' | 'upcoming' | 'starred' | 'completed' | 'calendar' | 'list';

export type ExtensionDisplayMode = 'desktop' | 'popup' | 'sidepanel';
