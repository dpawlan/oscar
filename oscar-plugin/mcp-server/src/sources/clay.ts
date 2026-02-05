import { UnifiedContact, ContactMatch } from './types.js';

const CLAY_API_KEY = process.env.CLAY_API_KEY;
const SEARCH_BASE_URL = 'https://search.clay.earth';
const ACTIVITY_BASE_URL = 'https://activity.clay.earth';
const API_BASE_URL = 'https://api.clay.earth/api';

// ============ API Client ============

interface ClayRequestOptions {
  method?: 'GET' | 'POST';
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

async function clayRequest<T>(baseUrl: string, endpoint: string, options: ClayRequestOptions = {}): Promise<T> {
  if (!CLAY_API_KEY) {
    throw new Error('CLAY_API_KEY environment variable is not set');
  }

  const { method = 'GET', params, body } = options;

  let url = `${baseUrl}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) url += `?${queryString}`;
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `ApiKey ${CLAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clay API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// ============ Types ============

interface ClaySearchHit {
  _id: string;
  _score: number;
  _source: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    avatarURL?: string;
    [key: string]: unknown;
  };
}

interface ClaySearchResponse {
  hits: {
    total: number;
    hits: ClaySearchHit[];
  };
}

interface ClayContact {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  organization: string;
  headline: string;
  bio: string;
  avatarURL: string;
  notes: Array<{ id: number; content: string; created: number }>;
  information: Array<{ type: string; value: string }>;
  linkedinURL: string;
  twitterURL: string;
  lastInteractionDate: number;
  score: number;
  [key: string]: unknown;
}

// ============ Search Functions ============

export interface ClaySearchOptions {
  term?: string;
  limit?: number;
}

export async function searchClay(options: ClaySearchOptions): Promise<UnifiedContact[]> {
  const response = await clayRequest<ClaySearchResponse>(SEARCH_BASE_URL, '/search', {
    params: {
      term: options.term,
      limit: options.limit || 20,
    },
  });

  return response.hits.hits.map(hit => {
    const source = hit._source;
    const handles: string[] = [];

    // Extract handles from the source if available
    if (source.information) {
      for (const info of source.information as Array<{ type: string; value: string }>) {
        if (info.type === 'email' || info.type === 'phone') {
          handles.push(info.value);
        }
      }
    }

    return {
      id: hit._id,
      source: 'clay' as const,
      name: source.displayName || `${source.firstName || ''} ${source.lastName || ''}`.trim(),
      handles,
      avatarUrl: source.avatarURL,
      metadata: source,
    };
  });
}

export async function getClayContact(contactId: string): Promise<UnifiedContact | null> {
  try {
    const contact = await clayRequest<ClayContact>(SEARCH_BASE_URL, `/contact/${contactId}`);

    const handles: string[] = [];
    if (contact.information) {
      for (const info of contact.information) {
        if (info.type === 'email' || info.type === 'phone') {
          handles.push(info.value);
        }
      }
    }

    return {
      id: contact.id,
      source: 'clay',
      name: contact.displayName || contact.fullName,
      handles,
      avatarUrl: contact.avatarURL,
      metadata: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        title: contact.title,
        organization: contact.organization,
        headline: contact.headline,
        bio: contact.bio,
        notes: contact.notes,
        linkedin: contact.linkedinURL,
        twitter: contact.twitterURL,
        lastInteraction: contact.lastInteractionDate,
        score: contact.score,
      },
    };
  } catch {
    return null;
  }
}

// ============ Contact Resolution ============

export async function findContactInClay(query: string): Promise<ContactMatch[]> {
  const results = await searchClay({ term: query, limit: 10 });

  return results.map(contact => {
    // Check how well the query matches
    const nameLower = contact.name.toLowerCase();
    const queryLower = query.toLowerCase();

    let confidence: 'high' | 'medium' | 'low' = 'low';
    let matchReason = 'Partial match';

    if (nameLower === queryLower) {
      confidence = 'high';
      matchReason = 'Exact name match';
    } else if (nameLower.includes(queryLower) || queryLower.includes(nameLower)) {
      confidence = 'medium';
      matchReason = 'Name contains query';
    }

    // Check notes for nickname mentions
    const metadata = contact.metadata as { notes?: Array<{ content: string }> };
    if (metadata.notes) {
      for (const note of metadata.notes) {
        if (note.content.toLowerCase().includes(queryLower)) {
          confidence = 'high';
          matchReason = `Nickname found in notes: "${note.content.substring(0, 50)}"`;
          break;
        }
      }
    }

    return {
      contact,
      source: 'clay' as const,
      confidence,
      matchReason,
    };
  });
}

// ============ Activity Feed ============

interface ClayActivityItem {
  id: string;
  itemType: string;
  itemDate: number;
  status: string;
  metadata: {
    contact?: {
      id: string;
      displayName: string;
      firstName: string;
    };
    content?: string;
    source?: string;
    link?: string;
  };
}

interface ClayActivityResponse {
  total: number;
  results: ClayActivityItem[];
}

export interface ClayActivityOptions {
  limit?: number;
  type?: string;
  contacts?: string;
}

export async function getClayActivity(options: ClayActivityOptions): Promise<ClayActivityItem[]> {
  const response = await clayRequest<ClayActivityResponse>(ACTIVITY_BASE_URL, '/activity', {
    params: {
      limit: options.limit || 50,
      type: options.type,
      contacts: options.contacts,
      status: 'active',
    },
  });

  return response.results;
}

// ============ Notes ============

export async function addClayNote(contactId: string, content: string): Promise<{ id: number; content: string }> {
  const response = await clayRequest<{ id: number; content: string }>(
    API_BASE_URL,
    `/v1/network/contacts/${contactId}/notes`,
    {
      method: 'POST',
      body: { content },
    }
  );

  return response;
}
