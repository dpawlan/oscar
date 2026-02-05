import { config } from '../../config/index.js';

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

  console.log('[Clay] API Key present:', !!config.CLAY_API_KEY, config.CLAY_API_KEY ? `(${config.CLAY_API_KEY.substring(0, 10)}...)` : '');

  if (!config.CLAY_API_KEY) {
    throw new Error('CLAY_API_KEY environment variable is not set. Please set it in your .env file.');
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
    'Authorization': `ApiKey ${config.CLAY_API_KEY}`,
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
