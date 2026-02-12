const SEARCH_BASE_URL = 'https://search.clay.earth';
const ACTIVITY_BASE_URL = 'https://activity.clay.earth';
const API_BASE_URL = 'https://api.clay.earth/api';

function getApiKey(): string {
  const key = process.env.CLAY_API_KEY;
  if (!key) {
    throw new Error('CLAY_API_KEY environment variable is not set');
  }
  return key;
}

export interface ClayRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export class ClayApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ClayApiError';
  }
}

export async function clayRequest<T>(
  baseUrl: string,
  endpoint: string,
  options: ClayRequestOptions = {},
): Promise<T> {
  const { method = 'GET', params, body } = options;
  const apiKey = getApiKey();

  let url = `${baseUrl}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers: Record<string, string> = {
    Authorization: `ApiKey ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = { method, headers };

  if (body && ['POST', 'PATCH', 'PUT'].includes(method)) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new ClayApiError(response.status, `Clay API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export async function searchRequest<T>(
  endpoint: string,
  options?: ClayRequestOptions,
): Promise<T> {
  return clayRequest<T>(SEARCH_BASE_URL, endpoint, options);
}

export async function activityRequest<T>(
  endpoint: string,
  options?: ClayRequestOptions,
): Promise<T> {
  return clayRequest<T>(ACTIVITY_BASE_URL, endpoint, options);
}

export async function apiRequest<T>(
  endpoint: string,
  options?: ClayRequestOptions,
): Promise<T> {
  return clayRequest<T>(API_BASE_URL, endpoint, options);
}

// ============ Type Definitions ============

export interface Contact {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatarURL?: string;
  bio?: string;
  headline?: string;
  byline?: string;
  organization?: string;
  title?: string;
  location?: string;
  linkedinURL?: string;
  twitterURL?: string;
  twitterHandle?: string;
  facebookURL?: string;
  website?: string;
  birthday?: { month: number; day: number };
  notes?: Array<{
    id: number;
    content: string;
    note?: string;
    created: number;
    updated: number;
  }>;
  lists?: Array<{
    listID: number;
    listTitle: string;
    listColor: string;
  }>;
  organizations?: Array<{
    name: string;
    title: string;
    isPrimary?: boolean;
    start?: { month?: number; year?: number };
    end?: { month?: number; year?: number } | null;
    duration?: string;
  }>;
  educations?: Array<{
    name: string;
    degree?: string;
    start?: { month?: number; year?: number };
    end?: { month?: number; year?: number };
  }>;
  information?: Array<{
    type: string;
    value: string;
    source: string;
    primary?: boolean;
  }>;
  interests?: Array<{
    n: string;
    s?: number;
    c?: string;
  }>;
  score?: number;
  relationship?: string;
  interactionType?: string;
  lastInteractionDate?: number;
  firstInteractionDate?: number;
  lastEmailDate?: number;
  firstEmailDate?: number;
  lastMessageDate?: number;
  firstMessageDate?: number;
  lastMeetingDate?: number;
  firstMeetingDate?: number;
  nextMeetingDate?: number | null;
  numberOfMeetings?: number;
  numberOfMessages?: number;
  numberOfEmailInteractions?: number;
  isClayUser?: boolean;
  created?: number;
  gender?: string;
}

export interface SearchHit {
  _id: string;
  _score: number;
  _source: Partial<Contact>;
}

export interface SearchResponse {
  took: number;
  timed_out: boolean;
  hits: {
    total: number;
    max_score: number | null;
    hits: SearchHit[];
  };
}

export interface ActivityItem {
  id: string;
  itemType: string;
  itemDate: number;
  status: string;
  seen: boolean;
  metadata: {
    content?: string;
    source?: string;
    link?: string;
    accountLink?: string;
    postSubtype?: string;
    contact?: Partial<Contact>;
    metrics?: {
      likes?: number;
      shares?: number;
      comments?: number;
    };
    media?: Array<{
      type: string;
      thumbnail?: string;
      id?: string;
    }>;
    [key: string]: unknown;
  };
}

export interface ActivityResponse {
  total: number;
  results: ActivityItem[];
}
