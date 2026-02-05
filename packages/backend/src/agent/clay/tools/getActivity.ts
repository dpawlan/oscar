import { z } from 'zod';
import { activityRequest } from '../clay-client.js';

export const getActivitySchema = {
  limit: z.number().max(1000).default(100).describe('Maximum number of activity items to return (max 1000)'),
  after: z.number().optional().describe("Unix timestamp for pagination - use the last item's itemDate value"),
  type: z.string().optional().describe('Comma-separated types to filter (event, birthday, import, new-member, reconnect, reminder, shared, news, announcement, post, diff)'),
  contacts: z.string().optional().describe('Comma-separated contact IDs to filter by'),
  groups: z.string().optional().describe('Comma-separated group IDs to filter by'),
  status: z.enum(['all', 'dismissed', 'active']).default('active').describe('Activity status filter'),
};

export type GetActivityInput = z.infer<z.ZodObject<typeof getActivitySchema>>;

interface ActivityContact {
  id: string;
  displayName: string;
  firstName: string;
  avatarURL: string;
  isClayUser: boolean;
}

interface ActivityItem {
  id: string;
  itemType: string;
  itemDate: number;
  status: string;
  seen: boolean;
  metadata: {
    contact?: ActivityContact;
    content?: string;
    source?: string;
    link?: string;
    title?: string;
    metrics?: {
      likes?: number;
      shares?: number;
      comments?: number;
    };
    [key: string]: unknown;
  };
}

interface ActivityResponse {
  total: number;
  results: ActivityItem[];
}

export async function getActivity(args: GetActivityInput): Promise<string> {
  const params: Record<string, string | number | undefined> = {
    limit: args.limit ?? 100,
    after: args.after,
    type: args.type,
    contacts: args.contacts,
    groups: args.groups,
    status: args.status ?? 'active',
  };

  const response = await activityRequest<ActivityResponse>('/activity', { params });

  const activities = response.results.map((item) => ({
    id: item.id,
    type: item.itemType,
    date: new Date(item.itemDate * 1000).toISOString(),
    status: item.status,
    seen: item.seen,
    contact: item.metadata.contact
      ? {
          id: item.metadata.contact.id,
          name: item.metadata.contact.displayName,
          avatarURL: item.metadata.contact.avatarURL,
        }
      : null,
    content: item.metadata.content,
    source: item.metadata.source,
    link: item.metadata.link,
    title: item.metadata.title,
    metrics: item.metadata.metrics,
  }));

  return JSON.stringify(
    {
      total: response.total,
      count: activities.length,
      activities,
      nextPageAfter: response.results.length > 0
        ? response.results[response.results.length - 1].itemDate
        : null,
    },
    null,
    2
  );
}
