import { z } from 'zod';
import { searchRequest } from '../clay-client.js';

export const searchContactsSchema = {
  term: z.string().optional().describe('Search query text to find contacts'),
  limit: z.number().min(1).max(50).default(20).describe('Maximum number of contacts to return (max 50)'),
  page: z.number().default(1).describe('Page number for pagination'),
  sort_by: z.enum(['score', 'firstName', 'lastName', 'notes', 'reminders']).default('score').describe('Field to sort results by'),
  sort_direction: z.enum(['asc', 'desc']).default('desc').describe('Sort direction'),
};

export type SearchContactsInput = z.infer<z.ZodObject<typeof searchContactsSchema>>;

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

export async function searchContacts(args: SearchContactsInput): Promise<string> {
  const params: Record<string, string | number | undefined> = {
    term: args.term,
    limit: args.limit ?? 20,
    page: args.page ?? 1,
    sort_by: args.sort_by ?? 'score',
    sort_direction: args.sort_direction ?? 'desc',
  };

  const response = await searchRequest<SearchResponse>('/search', { params });

  // Extract only essential fields to avoid overwhelming the context
  const contacts = response.hits.hits.map((hit) => {
    const src = hit._source;
    return {
      id: hit._id,
      score: hit._score,
      displayName: src.displayName || src.fullName,
      firstName: src.firstName,
      lastName: src.lastName,
      title: src.title,
      organization: src.organization,
      headline: src.headline,
      location: src.location,
      email: (src.information as Array<{type: string; value: string}>)?.find(i => i.type === 'email')?.value,
      phone: (src.information as Array<{type: string; value: string}>)?.find(i => i.type === 'phone')?.value,
      linkedinURL: src.linkedinURL,
      relationship: src.relationship,
    };
  });

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
