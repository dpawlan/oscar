import { getGmailClient } from '../gmail-client.js';

export async function listLabels(): Promise<string> {
  const gmail = await getGmailClient();

  const response = await gmail.users.labels.list({ userId: 'me' });
  const labels = response.data.labels || [];

  return JSON.stringify({
    count: labels.length,
    labels: labels.map(l => ({
      id: l.id,
      name: l.name,
      type: l.type,
      messagesTotal: l.messagesTotal,
      messagesUnread: l.messagesUnread,
    })),
  }, null, 2);
}

export const listLabelsSchema = {
  type: 'object' as const,
  properties: {},
};
