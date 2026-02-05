import { z } from 'zod';
import { searchContacts, searchContactsSchema, SearchContactsInput } from './searchContacts.js';
import { getContact, getContactSchema, GetContactInput } from './getContact.js';
import { getContactsBulk, getContactsBulkSchema, GetContactsBulkInput } from './getContactsBulk.js';
import { getActivity, getActivitySchema, GetActivityInput } from './getActivity.js';
import { getTimeline, getTimelineSchema, GetTimelineInput } from './getTimeline.js';
import { addNote, addNoteSchema, AddNoteInput } from './addNote.js';
import { createContact, createContactSchema, CreateContactInput } from './createContact.js';
import { enrichEmail, enrichEmailSchema, EnrichEmailInput } from './enrichEmail.js';

export interface ClayTool {
  name: string;
  description: string;
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  execute: (args: unknown) => Promise<string>;
}

const searchContactsZodSchema = z.object(searchContactsSchema);
const getContactZodSchema = z.object(getContactSchema);
const getContactsBulkZodSchema = z.object(getContactsBulkSchema);
const getActivityZodSchema = z.object(getActivitySchema);
const getTimelineZodSchema = z.object(getTimelineSchema);
const addNoteZodSchema = z.object(addNoteSchema);
const createContactZodSchema = z.object(createContactSchema);
const enrichEmailZodSchema = z.object(enrichEmailSchema);

export const clayTools: ClayTool[] = [
  {
    name: 'clay_search_contacts',
    description: 'Search for contacts in Clay CRM by name, company, notes, or any other text. Use this to find people in your network - e.g., "who works at McKinsey" or "find contacts in San Francisco".',
    schema: searchContactsZodSchema,
    execute: (args) => searchContacts(args as SearchContactsInput),
  },
  {
    name: 'clay_get_contact',
    description: 'Get detailed information about a specific contact by their ID. Returns full profile including work history, education, social links, notes, and interaction history.',
    schema: getContactZodSchema,
    execute: (args) => getContact(args as GetContactInput),
  },
  {
    name: 'clay_get_contacts_bulk',
    description: 'Get information for multiple contacts at once by their IDs. Efficient for retrieving details about several contacts.',
    schema: getContactsBulkZodSchema,
    execute: (args) => getContactsBulk(args as GetContactsBulkInput),
  },
  {
    name: 'clay_get_activity',
    description: 'Get activity feed with social posts, news, events, and updates from your contacts. Filter by type (post, news, birthday, etc.) or specific contacts.',
    schema: getActivityZodSchema,
    execute: (args) => getActivity(args as GetActivityInput),
  },
  {
    name: 'clay_get_timeline',
    description: 'Get the interaction timeline and history for a specific contact. Shows emails, meetings, messages, and other touchpoints.',
    schema: getTimelineZodSchema,
    execute: (args) => getTimeline(args as GetTimelineInput),
  },
  {
    name: 'clay_add_note',
    description: 'Add a note to a contact in Clay. Use this to record important information, meeting notes, or reminders about a contact.',
    schema: addNoteZodSchema,
    execute: (args) => addNote(args as AddNoteInput),
  },
  {
    name: 'clay_create_contact',
    description: 'Create a new contact in Clay from an email, LinkedIn URL, Twitter handle, phone number, or name. The contact will be automatically enriched with available data.',
    schema: createContactZodSchema,
    execute: (args) => createContact(args as CreateContactInput),
  },
  {
    name: 'clay_enrich_email',
    description: 'Look up profile information for an email address. Returns name, bio, location, and social links if available. Useful for learning about someone before a meeting.',
    schema: enrichEmailZodSchema,
    execute: (args) => enrichEmail(args as EnrichEmailInput),
  },
];

export function getClayToolNames(): string[] {
  return clayTools.map(t => t.name);
}
