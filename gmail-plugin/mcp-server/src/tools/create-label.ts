import { getGmailClient } from '../gmail-client.js';
import { gmail_v1 } from 'googleapis';

export interface CreateLabelArgs {
  name: string;
  backgroundColor?: string;
  textColor?: string;
}

export async function createLabel(args: CreateLabelArgs): Promise<string> {
  const gmail = await getGmailClient();

  const requestBody: gmail_v1.Schema$Label = {
    name: args.name,
    labelListVisibility: 'labelShow',
    messageListVisibility: 'show',
  };

  if (args.backgroundColor || args.textColor) {
    requestBody.color = {
      backgroundColor: args.backgroundColor,
      textColor: args.textColor,
    };
  }

  const response = await gmail.users.labels.create({
    userId: 'me',
    requestBody,
  });

  return JSON.stringify({
    success: true,
    label: {
      id: response.data.id,
      name: response.data.name,
    },
    message: `Label "${args.name}" created successfully`,
  });
}

export const createLabelSchema = {
  type: 'object' as const,
  properties: {
    name: {
      type: 'string',
      description: 'Name of the label to create',
    },
    backgroundColor: {
      type: 'string',
      description: 'Background color in hex (e.g., "#16a765")',
    },
    textColor: {
      type: 'string',
      description: 'Text color in hex (e.g., "#ffffff")',
    },
  },
  required: ['name'],
};
