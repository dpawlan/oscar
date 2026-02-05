import { z } from 'zod';
import { gmail_v1 } from 'googleapis';
import { listEmails, listEmailsSchema, ListEmailsInput } from './listEmails.js';
import { readEmail, readEmailSchema, ReadEmailInput } from './readEmail.js';
import { sendEmail, sendEmailSchema, SendEmailInput } from './sendEmail.js';
import { searchEmails, searchEmailsSchema, SearchEmailsInput } from './searchEmails.js';
import { scanEmails, scanEmailsSchema, ScanEmailsInput } from './scanEmails.js';
import { listLabels } from './listLabels.js';
import { createLabel, createLabelSchema, CreateLabelInput } from './createLabel.js';
import { addLabel, addLabelSchema, AddLabelInput } from './addLabel.js';
import { removeLabel, removeLabelSchema, RemoveLabelInput } from './removeLabel.js';

export interface GmailTool {
  name: string;
  description: string;
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  execute: (gmail: gmail_v1.Gmail, args: unknown) => Promise<string>;
}

// Create schema objects once
const listEmailsZodSchema = z.object(listEmailsSchema);
const readEmailZodSchema = z.object(readEmailSchema);
const sendEmailZodSchema = z.object(sendEmailSchema);
const searchEmailsZodSchema = z.object(searchEmailsSchema);
const scanEmailsZodSchema = z.object(scanEmailsSchema);
const createLabelZodSchema = z.object(createLabelSchema);
const addLabelZodSchema = z.object(addLabelSchema);
const removeLabelZodSchema = z.object(removeLabelSchema);

export const gmailTools: GmailTool[] = [
  {
    name: 'list_emails',
    description: "List emails from the user's inbox with optional filtering by labels or search query",
    schema: listEmailsZodSchema,
    execute: (gmail, args) => listEmails(gmail, args as ListEmailsInput),
  },
  {
    name: 'read_email',
    description: 'Read the full content of a specific email by its ID, including subject, sender, recipients, and body',
    schema: readEmailZodSchema,
    execute: (gmail, args) => readEmail(gmail, args as ReadEmailInput),
  },
  {
    name: 'send_email',
    description: 'Send an email to specified recipients. Always confirm with user before sending.',
    schema: sendEmailZodSchema,
    execute: (gmail, args) => sendEmail(gmail, args as SendEmailInput),
  },
  {
    name: 'search_emails',
    description: 'Search emails using Gmail search syntax (e.g., "from:sender@example.com", "is:unread", "has:attachment")',
    schema: searchEmailsZodSchema,
    execute: (gmail, args) => searchEmails(gmail, args as SearchEmailsInput),
  },
  {
    name: 'scan_emails',
    description: 'Scan emails with FULL BODY CONTENT. Use this to read through emails and find specific content. Can scan inbox, sent, or all mail. Returns complete email bodies so you can search/analyze the actual content.',
    schema: scanEmailsZodSchema,
    execute: (gmail, args) => scanEmails(gmail, args as ScanEmailsInput),
  },
  {
    name: 'list_labels',
    description: "List all Gmail labels in the user's mailbox, including system labels (INBOX, SENT, etc.) and custom labels",
    schema: z.object({}),
    execute: (gmail) => listLabels(gmail),
  },
  {
    name: 'create_label',
    description: 'Create a new Gmail label with optional custom colors',
    schema: createLabelZodSchema,
    execute: (gmail, args) => createLabel(gmail, args as CreateLabelInput),
  },
  {
    name: 'add_label',
    description: 'Add a label to one or more emails. Use list_labels first to get label IDs.',
    schema: addLabelZodSchema,
    execute: (gmail, args) => addLabel(gmail, args as AddLabelInput),
  },
  {
    name: 'remove_label',
    description: 'Remove a label from one or more emails',
    schema: removeLabelZodSchema,
    execute: (gmail, args) => removeLabel(gmail, args as RemoveLabelInput),
  },
];

export function getToolNames(): string[] {
  return gmailTools.map(t => t.name);
}
