const BASE_URL = 'https://api.ouraring.com';

function getAccessToken(user?: string): string {
  if (user?.toLowerCase() === 'brittany') {
    const token = process.env.OURA_ACCESS_TOKEN_BRITTANY;
    if (!token) throw new Error('OURA_ACCESS_TOKEN_BRITTANY is not set');
    return token;
  }
  const token = process.env.OURA_ACCESS_TOKEN;
  if (!token) throw new Error('OURA_ACCESS_TOKEN is not set');
  return token;
}

export class OuraApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'OuraApiError';
  }
}

export interface OuraRequestOptions {
  params?: Record<string, string | undefined>;
}

export async function ouraRequest<T>(
  endpoint: string,
  options: OuraRequestOptions = {},
  user?: string,
): Promise<T> {
  const { params } = options;
  const token = getAccessToken(user);

  let url = `${BASE_URL}${endpoint}`;

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

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new OuraApiError(response.status, `Oura API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}
