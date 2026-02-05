import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { getAllCalendarClients } from '../../services/gmail.js';

const getCalendarEventsSchema = {
  timeMin: z.string().optional().describe('Start time for events (ISO 8601 format). Defaults to now.'),
  timeMax: z.string().optional().describe('End time for events (ISO 8601 format). Defaults to end of today.'),
  maxResults: z.number().optional().default(20).describe('Maximum number of events to return'),
  calendarId: z.string().optional().default('primary').describe('Calendar ID to fetch from. Use "primary" for the main calendar.'),
};

export const getCalendarEventsTool = (userId: string) => tool(
  'get_calendar_events',
  `Get upcoming calendar events. Use this to see the user's schedule, meetings, and appointments. Can filter by time range. Returns event title, time, location, attendees, and description.`,
  getCalendarEventsSchema,
  async (args) => {
    try {
      const { timeMin, timeMax, maxResults, calendarId } = args as {
        timeMin?: string;
        timeMax?: string;
        maxResults?: number;
        calendarId?: string;
      };

      const calendarClients = await getAllCalendarClients(userId);

      if (calendarClients.length === 0) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No Google accounts connected. Please connect your Google account first.' }) }],
          isError: true,
        };
      }

      // Default time range: now to end of today
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const effectiveTimeMin = timeMin || now.toISOString();
      const effectiveTimeMax = timeMax || endOfDay.toISOString();

      const allEvents: Array<{
        id: string;
        summary: string;
        description: string | null;
        location: string | null;
        start: string;
        end: string;
        startDateTime: string | null;
        endDateTime: string | null;
        isAllDay: boolean;
        attendees: Array<{ email: string; responseStatus: string }>;
        organizer: string | null;
        htmlLink: string | null;
        account: string;
      }> = [];

      for (const { email, client } of calendarClients) {
        try {
          const response = await client.events.list({
            calendarId: calendarId || 'primary',
            timeMin: effectiveTimeMin,
            timeMax: effectiveTimeMax,
            maxResults: maxResults || 20,
            singleEvents: true,
            orderBy: 'startTime',
          });

          const events = response.data.items || [];

          for (const event of events) {
            const startDateTime = event.start?.dateTime || null;
            const endDateTime = event.end?.dateTime || null;
            const startDate = event.start?.date || null;
            const endDate = event.end?.date || null;
            const isAllDay = !startDateTime && !!startDate;

            allEvents.push({
              id: event.id || '',
              summary: event.summary || 'No title',
              description: event.description || null,
              location: event.location || null,
              start: startDateTime || startDate || '',
              end: endDateTime || endDate || '',
              startDateTime,
              endDateTime,
              isAllDay,
              attendees: (event.attendees || []).map((a) => ({
                email: a.email || '',
                responseStatus: a.responseStatus || 'needsAction',
              })),
              organizer: event.organizer?.email || null,
              htmlLink: event.htmlLink || null,
              account: email,
            });
          }
        } catch (error) {
          console.error(`Error fetching calendar events from ${email}:`, error);
        }
      }

      // Sort by start time
      allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      if (allEvents.length === 0) {
        const result = {
          events: [],
          total: 0,
          timeRange: {
            from: effectiveTimeMin,
            to: effectiveTimeMax,
          },
          message: 'No events found in this time range',
        };
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }

      const result = {
        events: allEvents,
        total: allEvents.length,
        timeRange: {
          from: effectiveTimeMin,
          to: effectiveTimeMax,
        },
        message: `Found ${allEvents.length} event(s)`,
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: `Error: Failed to get calendar events: ${errorMsg}` }],
        isError: true,
      };
    }
  }
);
