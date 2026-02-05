import { apiRequest } from '../clay-client.js';

export const createContactSchema = {
  type: 'object' as const,
  properties: {
    person_lookup: {
      type: 'string',
      description: 'Value to create contact from (email, LinkedIn URL, Twitter handle, phone, or name)',
    },
    lookup_type: {
      type: 'string',
      enum: ['email', 'twitter', 'linkedin', 'facebook', 'url', 'phone', 'manual'],
      description: 'Type of the person_lookup value (auto-detected if not specified)',
    },
    first_name: {
      type: 'string',
      description: 'First name of the contact',
    },
    last_name: {
      type: 'string',
      description: 'Last name of the contact',
    },
  },
  required: ['person_lookup'],
};

interface CreateContactArgs {
  person_lookup: string;
  lookup_type?: string;
  first_name?: string;
  last_name?: string;
}

interface CreateContactResponse {
  id: number;
  created: string;
  display_name: string;
  interaction_type: string;
  person_lookup: string;
  lookup_type: string;
  user: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string;
  relationship: string | null;
  notes: unknown[];
  source: string;
  score: number;
  information: Array<{
    id: number;
    type: string;
    value: string;
    source: string;
    label: string | null;
  }>;
  is_clay_user: boolean;
  reminder: unknown;
  skip_enrichment: boolean;
  is_restricted: boolean | null;
  integration_type: string | null;
  integration_id: string | null;
  skip_index: boolean;
}

export async function createContact(args: CreateContactArgs): Promise<string> {
  const body: Record<string, string | undefined> = {
    person_lookup: args.person_lookup,
  };

  if (args.lookup_type) {
    body.lookup_type = args.lookup_type;
  }
  if (args.first_name) {
    body.first_name = args.first_name;
  }
  if (args.last_name) {
    body.last_name = args.last_name;
  }

  const response = await apiRequest<CreateContactResponse>(
    '/v1/network/contacts/',
    {
      method: 'POST',
      body,
    }
  );

  return JSON.stringify(
    {
      success: true,
      contact: {
        id: response.id,
        displayName: response.display_name,
        firstName: response.first_name,
        lastName: response.last_name,
        fullName: response.full_name,
        lookupType: response.lookup_type,
        personLookup: response.person_lookup,
        avatarURL: response.avatar_url,
        created: response.created,
        source: response.source,
        isClayUser: response.is_clay_user,
        information: response.information,
      },
    },
    null,
    2
  );
}
