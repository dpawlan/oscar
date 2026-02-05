import { getGmailClient } from '../gmail-client.js';

export interface AddLabelArgs {
  emailIds: string[];
  labelId: string;
}

export async function addLabel(args: AddLabelArgs): Promise<string> {
  const gmail = await getGmailClient();

  if (args.emailIds.length === 1) {
    await gmail.users.messages.modify({
      userId: 'me',
      id: args.emailIds[0],
      requestBody: { addLabelIds: [args.labelId] },
    });
  } else {
    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: args.emailIds,
        addLabelIds: [args.labelId],
      },
    });
  }

  return JSON.stringify({
    success: true,
    message: `Added label to ${args.emailIds.length} email(s)`,
    emailCount: args.emailIds.length,
    labelId: args.labelId,
  });
}

export const addLabelSchema = {
  type: 'object' as const,
  properties: {
    emailIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Array of email IDs to add the label to',
    },
    labelId: {
      type: 'string',
      description: 'The label ID to add (use list_labels to get IDs)',
    },
  },
  required: ['emailIds', 'labelId'],
};
