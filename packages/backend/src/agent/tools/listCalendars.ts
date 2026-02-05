import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { getAllCalendarClients } from '../../services/gmail.js';

const listCalendarsSchema = {};

export const listCalendarsTool = (userId: string) => tool(
  'list_calendars',
  `List all calendars the user has access to. Use this to see which calendars are available before fetching events from a specific calendar.`,
  listCalendarsSchema,
  async () => {
    try {
      const calendarClients = await getAllCalendarClients(userId);

      if (calendarClients.length === 0) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No Google accounts connected. Please connect your Google account first.' }) }],
          isError: true,
        };
      }

      const allCalendars: Array<{
        id: string;
        summary: string;
        description: string | null;
        primary: boolean;
        backgroundColor: string | null;
        accessRole: string | null;
        account: string;
      }> = [];

      for (const { email, client } of calendarClients) {
        try {
          const response = await client.calendarList.list();
          const calendars = response.data.items || [];

          for (const calendar of calendars) {
            allCalendars.push({
              id: calendar.id || '',
              summary: calendar.summary || 'Unnamed Calendar',
              description: calendar.description || null,
              primary: calendar.primary || false,
              backgroundColor: calendar.backgroundColor || null,
              accessRole: calendar.accessRole || null,
              account: email,
            });
          }
        } catch (error) {
          console.error(`Error fetching calendars from ${email}:`, error);
        }
      }

      if (allCalendars.length === 0) {
        const result = {
          calendars: [],
          total: 0,
          message: 'No calendars found',
        };
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }

      const result = {
        calendars: allCalendars,
        total: allCalendars.length,
        message: `Found ${allCalendars.length} calendar(s)`,
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: `Error: Failed to list calendars: ${errorMsg}` }],
        isError: true,
      };
    }
  }
);
