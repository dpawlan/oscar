import { apiRequest } from '../clay-client.js';

export const addNoteSchema = {
  type: 'object' as const,
  properties: {
    contact_id: {
      type: 'string',
      description: 'The ID of the contact to add a note to',
    },
    content: {
      type: 'string',
      description: 'The content of the note',
    },
  },
  required: ['contact_id', 'content'],
};

interface AddNoteArgs {
  contact_id: string;
  content: string;
}

interface NoteResponse {
  id: number;
  created: string;
  updated: string;
  contact: number;
  content: string;
  internal_id: string | null;
  is_locked: boolean;
  reminder: unknown;
  type: {
    label: string | null;
    icon: string | null;
    color: string | null;
  };
}

export async function addNote(args: AddNoteArgs): Promise<string> {
  const response = await apiRequest<NoteResponse>(
    `/v1/network/contacts/${args.contact_id}/notes`,
    {
      method: 'POST',
      body: {
        content: args.content,
      },
    }
  );

  return JSON.stringify(
    {
      success: true,
      note: {
        id: response.id,
        content: response.content,
        created: response.created,
        updated: response.updated,
        contactId: response.contact,
      },
    },
    null,
    2
  );
}
