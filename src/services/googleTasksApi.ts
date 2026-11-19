import { TaskItem, TaskList } from '../types';

const TASKS_BASE_URL = 'https://tasks.googleapis.com/tasks/v1';

export interface GoogleTaskPayload {
  id?: string;
  title?: string;
  notes?: string;
  status?: 'needsAction' | 'completed';
  due?: string | null; // RFC 3339 timestamp; null clears an existing due date
  completed?: string;
}

export const googleTasksService = {
  // Fetch all user task lists
  async getTaskLists(accessToken: string): Promise<TaskList[]> {
    const items: any[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${TASKS_BASE_URL}/users/@me/lists`);
      url.searchParams.set('maxResults', '100');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to fetch Google Task lists: ${response.status} ${err}`);
      }

      const data = await response.json();
      items.push(...(data.items || []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    const colors = [
      '#2563eb', // Color 1: Cobalt Blue
      '#e11d48', // Color 2: Swiss Vermilion
    ];

    return items.map((list: any, index: number) => ({
      id: list.id,
      googleListId: list.id,
      title: list.title || 'Untitled List',
      color: colors[index % colors.length],
      isDefault: index === 0,
      updatedAt: list.updated || new Date().toISOString(),
    }));
  },

  // Create a new task list in Google Tasks
  async createTaskList(accessToken: string, title: string): Promise<TaskList> {
    const response = await fetch(`${TASKS_BASE_URL}/users/@me/lists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to create Google Task list: ${response.status} ${err}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      googleListId: data.id,
      title: data.title,
      color: '#2563eb', // Color 1: Cobalt Blue
      updatedAt: data.updated || new Date().toISOString(),
    };
  },

  // Delete a task list
  async deleteTaskList(accessToken: string, listId: string): Promise<void> {
    const response = await fetch(`${TASKS_BASE_URL}/users/@me/lists/${listId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to delete Google Task list: ${response.status} ${err}`);
    }
  },

  // Fetch all tasks for a specific task list
  async getTasks(accessToken: string, listId: string): Promise<TaskItem[]> {
    const items: any[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${TASKS_BASE_URL}/lists/${listId}/tasks`);
      url.searchParams.set('showCompleted', 'true');
      url.searchParams.set('showHidden', 'true');
      url.searchParams.set('maxResults', '100');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to fetch tasks for list ${listId}: ${response.status} ${err}`);
      }

      const data = await response.json();
      items.push(...(data.items || []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    return items
      .filter((item: any) => !item.deleted)
      .map((item: any): TaskItem => {
        const isCompleted = item.status === 'completed';
        let dueDate: string | undefined = undefined;
        let dueTime: string | undefined = undefined;

        if (item.due) {
          try {
            const dateObj = new Date(item.due);
            if (!isNaN(dateObj.getTime())) {
              dueDate = item.due.slice(0, 10);
              // Check if original timestamp has specific time
              const hours = dateObj.getUTCHours();
              const mins = dateObj.getUTCMinutes();
              if (hours !== 0 || mins !== 0) {
                dueTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
              }
            }
          } catch {
            // fallback
          }
        }

        return {
          id: item.id,
          googleTaskId: item.id,
          listId: listId,
          title: item.title || 'Untitled Task',
          notes: item.notes || '',
          completed: isCompleted,
          completedAt: item.completed || (isCompleted ? new Date().toISOString() : undefined),
          due: dueDate,
          dueTime: dueTime,
          priority: 'medium', // Google Tasks does not store priority natively; managed locally
          starred: false,
          createdAt: item.updated || new Date().toISOString(),
          updatedAt: item.updated || new Date().toISOString(),
          syncStatus: 'synced',
        };
      });
  },

  // Insert a task into Google Tasks
  async createTask(accessToken: string, listId: string, task: Partial<TaskItem>): Promise<TaskItem> {
    const payload: GoogleTaskPayload = {
      title: task.title || 'New Task',
      notes: task.notes || undefined,
      status: task.completed ? 'completed' : 'needsAction',
    };

    if (task.due) {
      // RFC 3339 format required by Google Tasks API
      const isoDate = new Date(`${task.due}T00:00:00.000Z`).toISOString();
      payload.due = isoDate;
    }

    const response = await fetch(`${TASKS_BASE_URL}/lists/${listId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to create task in Google Tasks: ${response.status} ${err}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      googleTaskId: data.id,
      listId: listId,
      title: data.title,
      notes: data.notes || '',
      completed: data.status === 'completed',
      due: task.due,
      dueTime: task.dueTime,
      priority: task.priority || 'medium',
      starred: task.starred || false,
      createdAt: data.updated || new Date().toISOString(),
      updatedAt: data.updated || new Date().toISOString(),
      syncStatus: 'synced',
    };
  },

  // Update a task in Google Tasks
  async updateTask(
    accessToken: string,
    listId: string,
    taskId: string,
    updates: Partial<TaskItem>
  ): Promise<void> {
    const payload: GoogleTaskPayload = {};

    if (updates.title !== undefined) {
      payload.title = updates.title;
    }

    if (updates.notes !== undefined) {
      payload.notes = updates.notes;
    }

    if (updates.completed !== undefined) {
      payload.status = updates.completed ? 'completed' : 'needsAction';
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'due')) {
      payload.due = updates.due
        ? new Date(`${updates.due}T00:00:00.000Z`).toISOString()
        : null;
    }

    const response = await fetch(`${TASKS_BASE_URL}/lists/${listId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to update task in Google Tasks: ${response.status} ${err}`);
    }
  },

  // Move a task between Google Task lists. PATCH cannot change a task's list.
  async moveTask(accessToken: string, sourceListId: string, taskId: string, destinationListId: string): Promise<void> {
    if (sourceListId === destinationListId) return;

    const url = new URL(`${TASKS_BASE_URL}/lists/${sourceListId}/tasks/${taskId}/move`);
    url.searchParams.set('destinationTasklist', destinationListId);
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to move task: ${response.status} ${err}`);
    }
  },

  // Delete a task from Google Tasks
  async deleteTask(accessToken: string, listId: string, taskId: string): Promise<void> {
    const response = await fetch(`${TASKS_BASE_URL}/lists/${listId}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to delete task in Google Tasks: ${response.status} ${err}`);
    }
  },
};
