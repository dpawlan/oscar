import { searchRequest } from '../clay-client.js';

export const getTimelineSchema = {
  type: 'object' as const,
  properties: {
    contact_id: {
      type: 'string',
      description: 'The ID of the contact whose timeline to retrieve',
    },
  },
  required: ['contact_id'],
};

interface GetTimelineArgs {
  contact_id: string;
}

interface TimelineUser {
  id: number;
  name: string;
  email: string;
  avatar_url: string;
  is_self: boolean;
}

interface TimelineItem {
  id: string;
  users: TimelineUser[];
  content: string;
  item_type: string;
  source: string;
  item_date: string;
  date: string;
  metadata: {
    title?: string;
    link?: string;
    links?: Record<string, string>;
    is_upcoming?: boolean;
    updated?: string;
    reminder?: unknown;
    label?: string;
    icon?: string;
    color?: string;
  };
}

interface TimelineResponse {
  total: number;
  has_next: boolean;
  results: TimelineItem[];
  pagination_date: string;
  pagination_item_id: string;
}

export async function getTimeline(args: GetTimelineArgs): Promise<string> {
  const response = await searchRequest<TimelineResponse>(`/contacts/${args.contact_id}/timeline`);

  const timeline = response.results.map((item) => ({
    id: item.id,
    type: item.item_type,
    source: item.source,
    date: item.item_date,
    content: item.content,
    title: item.metadata.title,
    link: item.metadata.link || item.metadata.links?.url,
    isUpcoming: item.metadata.is_upcoming,
    users: item.users.map((u) => ({
      name: u.name,
      email: u.email,
      isSelf: u.is_self,
    })),
  }));

  return JSON.stringify(
    {
      total: response.total,
      hasMore: response.has_next,
      timeline,
      pagination: {
        date: response.pagination_date,
        itemId: response.pagination_item_id,
      },
    },
    null,
    2
  );
}
