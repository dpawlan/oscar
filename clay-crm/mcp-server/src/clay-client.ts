import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from plugin root
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env.local') });

const CLAY_API_KEY = process.env.CLAY_API_KEY;

if (!CLAY_API_KEY) {
  console.error('Warning: CLAY_API_KEY environment variable is not set');
}

const SEARCH_BASE_URL = 'https://search.clay.earth';
const ACTIVITY_BASE_URL = 'https://activity.clay.earth';
const API_BASE_URL = 'https://api.clay.earth/api';

export interface ClayRequestOptions {
  method?: 'GET' | 'POST';
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export async function clayRequest<T>(
  baseUrl: string,
  endpoint: string,
  options: ClayRequestOptions = {}
): Promise<T> {
  const { method = 'GET', params, body } = options;

  if (!CLAY_API_KEY) {
    throw new Error('CLAY_API_KEY environment variable is not set. Please set it in your environment.');
  }

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
    'Authorization': `ApiKey ${CLAY_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body && method === 'POST') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clay API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export async function searchRequest<T>(
  endpoint: string,
  options?: ClayRequestOptions
): Promise<T> {
  return clayRequest<T>(SEARCH_BASE_URL, endpoint, options);
}

export async function activityRequest<T>(
  endpoint: string,
  options?: ClayRequestOptions
): Promise<T> {
  return clayRequest<T>(ACTIVITY_BASE_URL, endpoint, options);
}

export async function apiRequest<T>(
  endpoint: string,
  options?: ClayRequestOptions
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

export interface TimelineItem {
  id: string;
  users: Array<{
    id: number;
    name: string;
    email: string;
    avatar_url: string;
    is_self: boolean;
  }>;
  content: string;
  item_type: string;
  source: string;
  item_date: string;
  date: string;
  metadata: Record<string, unknown>;
}

export interface TimelineResponse {
  total: number;
  has_next: boolean;
  results: TimelineItem[];
  pagination_date?: string;
  pagination_item_id?: string;
}

// ============ Helper Functions ============

export function formatContactSummary(contact: Partial<Contact>): string {
  const parts: string[] = [];

  if (contact.displayName) {
    parts.push(`**${contact.displayName}**`);
  }

  if (contact.title && contact.organization) {
    parts.push(`${contact.title} at ${contact.organization}`);
  } else if (contact.title) {
    parts.push(contact.title);
  } else if (contact.organization) {
    parts.push(contact.organization);
  } else if (contact.headline) {
    parts.push(contact.headline);
  }

  if (contact.location) {
    parts.push(contact.location);
  }

  return parts.join(' | ');
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
