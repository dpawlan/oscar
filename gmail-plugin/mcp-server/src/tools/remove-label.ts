import { getGmailClient } from '../gmail-client.js';

export interface RemoveLabelArgs {
  emailIds: string[];
  labelId: string;
}

export async function removeLabel(args: RemoveLabelArgs): Promise<string> {
  const gmail = await getGmailClient();

  if (args.emailIds.length === 1) {
    await gmail.users.messages.modify({
      userId: 'me',
      id: args.emailIds[0],
      requestBody: { removeLabelIds: [args.labelId] },
    });
  } else {
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: args.emailIds,
        removeLabelIds: [args.labelId],
      },
    });
  }

  return JSON.stringify({
    success: true,
    message: `Removed label from ${args.emailIds.length} email(s)`,
    emailCount: args.emailIds.length,
    labelId: args.labelId,
  });
}

export const removeLabelSchema = {
  type: 'object' as const,
  properties: {
    emailIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of email IDs to remove the label from',
    },
    labelId: {
      type: 'string',
      description: 'The label ID to remove',
    },
  },
  required: ['emailIds', 'labelId'],
};
