import { searchRequest } from '../clay-client.js';

export const getContactsBulkSchema = {
  type: 'object' as const,
  properties: {
    contact_ids: {
      type: 'array',
      items: { type: 'number' },
      description: 'Array of numeric contact IDs to retrieve',
    },
    fields: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of fields to include (all fields returned by default)',
    },
  },
  required: ['contact_ids'],
};

interface GetContactsBulkArgs {
  contact_ids: number[];
  fields?: string[];
}

interface BulkContact {
  id: string;
  displayName: string;
  avatarURL?: string;
  avatarBlur?: string;
  [key: string]: unknown;
}

export async function getContactsBulk(args: GetContactsBulkArgs): Promise<string> {
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
