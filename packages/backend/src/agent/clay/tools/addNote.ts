import { z } from 'zod';
import { apiRequest } from '../clay-client.js';

export const addNoteSchema = {
  contact_id: z.string().describe('The ID of the contact to add a note to'),
  content: z.string().describe('The content of the note'),
};

export type AddNoteInput = z.infer<z.ZodObject<typeof addNoteSchema>>;

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

export async function addNote(args: AddNoteInput): Promise<string> {
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
