import { gmail_v1 } from 'googleapis';

export async function listLabels(gmail: gmail_v1.Gmail): Promise<string> {
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
