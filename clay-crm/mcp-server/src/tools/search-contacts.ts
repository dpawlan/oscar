import { searchRequest } from '../clay-client.js';

export const searchContactsSchema = {
  type: 'object' as const,
  properties: {
    term: {
      type: 'string',
      description: 'Search query text to find contacts',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of contacts to return (max 1000)',
      default: 50,
    },
    page: {
      type: 'number',
      description: 'Page number for pagination',
      default: 1,
    },
    sort_by: {
      type: 'string',
      enum: ['score', 'firstName', 'lastName', 'notes', 'reminders'],
      description: 'Field to sort results by',
      default: 'score',
    },
    sort_direction: {
      type: 'string',
      enum: ['asc', 'desc'],
      description: 'Sort direction',
      default: 'desc',
    },
    include_fields: {
      type: 'string',
      description: 'Comma-separated fields to include in response (e.g., "displayName,id,avatarURL")',
    },
  },
  required: [],
};

interface SearchContactsArgs {
  term?: string;
  limit?: number;
  page?: number;
  sort_by?: string;
  sort_direction?: string;
  include_fields?: string;
}

interface SearchHit {
  _id: string;
  _score: number;
  _source: Record<string, unknown>;
}

interface SearchResponse {
  took: number;
  timed_out: boolean;
  hits: {
    total: number;
    max_score: number | null;
    hits: SearchHit[];
  };
}

export async function searchContacts(args: SearchContactsArgs): Promise<string> {
  const params: Record<string, string | number | undefined> = {
    term: args.term,
    limit: args.limit ?? 50,
    page: args.page ?? 1,
    sort_by: args.sort_by ?? 'score',
    sort_direction: args.sort_direction ?? 'desc',
    include_fields: args.include_fields,
  };

  const response = await searchRequest<SearchResponse>('/search', { params });

  const contacts = response.hits.hits.map((hit) => ({
    id: hit._id,
    score: hit._score,
    ...hit._source,
  }));

  return JSON.stringify(
    {
      total: response.hits.total,
      count: contacts.length,
      took_ms: response.took,
      contacts,
    },
    null,
    2
  );
}
