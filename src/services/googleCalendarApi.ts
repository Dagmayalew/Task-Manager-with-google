import { CalendarEvent } from '../types';

const CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3';

export const googleCalendarService = {
  // Fetch primary calendar events within a date range
  async getEvents(
    accessToken: string,
    timeMin?: string,
    timeMax?: string
  ): Promise<CalendarEvent[]> {
    const min = timeMin || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const max = timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const url = new URL(`${CALENDAR_BASE_URL}/calendars/primary/events`);
    url.searchParams.set('timeMin', min);
    url.searchParams.set('timeMax', max);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '100');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to fetch Calendar events: ${response.status} ${err}`);
    }

    const data = await response.json();
    const items = data.items || [];

    return items.map((item: any): CalendarEvent => ({
      id: item.id,
      title: item.summary || '(No Title)',
      description: item.description,
      start: {
        dateTime: item.start?.dateTime,
        date: item.start?.date,
      },
      end: {
        dateTime: item.end?.dateTime,
        date: item.end?.date,
      },
      htmlLink: item.htmlLink,
      isTaskBlock: Boolean(item.extendedProperties?.private?.chronotaskId),
      colorId: item.colorId,
    }));
  },

  // Create a time-blocked event for a task on Google Calendar
  async createCalendarEvent(
    accessToken: string,
    params: {
      title: string;
      description?: string;
      startTime: string; // ISO string
      endTime: string;   // ISO string
      taskId?: string;
    }
  ): Promise<CalendarEvent> {
    const body: any = {
      summary: params.title,
      description: params.description || 'Scheduled via Chronotask Task Manager',
      start: {
        dateTime: params.startTime,
      },
      end: {
        dateTime: params.endTime,
      },
      reminders: {
        useDefault: true,
      },
    };

    if (params.taskId) {
      body.extendedProperties = {
        private: {
          chronotaskId: params.taskId,
        },
      };
    }

    const response = await fetch(`${CALENDAR_BASE_URL}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to schedule event on Google Calendar: ${response.status} ${err}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      title: data.summary,
      description: data.description,
      start: {
        dateTime: data.start?.dateTime,
        date: data.start?.date,
      },
      end: {
        dateTime: data.end?.dateTime,
        date: data.end?.date,
      },
      htmlLink: data.htmlLink,
      isTaskBlock: true,
    };
  },

  // Delete a calendar event
  async deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
    const response = await fetch(`${CALENDAR_BASE_URL}/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 404 && response.status !== 410) {
      const err = await response.text();
      throw new Error(`Failed to delete Calendar event: ${response.status} ${err}`);
    }
  },
};
