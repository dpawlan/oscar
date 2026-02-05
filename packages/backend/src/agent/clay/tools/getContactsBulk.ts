import { z } from 'zod';
import { searchRequest } from '../clay-client.js';

export const getContactsBulkSchema = {
  contact_ids: z.array(z.number()).describe('Array of numeric contact IDs to retrieve'),
  fields: z.array(z.string()).optional().describe('Array of fields to include (all fields returned by default)'),
};

export type GetContactsBulkInput = z.infer<z.ZodObject<typeof getContactsBulkSchema>>;

interface BulkContact {
  id: string;
  displayName: string;
  avatarURL?: string;
  avatarBlur?: string;
  [key: string]: unknown;
}

export async function getContactsBulk(args: GetContactsBulkInput): Promise<string> {
  const body: Record<string, unknown> = {
    contact_ids: args.contact_ids,
  };

  if (args.fields && args.fields.length > 0) {
    body.fields = args.fields;
  }

  const contacts = await searchRequest<BulkContact[]>('/contacts/bulk/', {
    method: 'POST',
    body,
  });

  return JSON.stringify(
    {
      count: contacts.length,
      contacts,
    },
    null,
    2
  );
}
