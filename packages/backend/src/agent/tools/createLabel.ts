import { z } from 'zod';
import { gmail_v1 } from 'googleapis';

export const createLabelSchema = {
  name: z.string().describe('Name of the label to create'),
  backgroundColor: z.string().optional()
    .describe('Background color in hex (e.g., "#16a765")'),
  textColor: z.string().optional()
    .describe('Text color in hex (e.g., "#ffffff")'),
};

export type CreateLabelInput = z.infer<z.ZodObject<typeof createLabelSchema>>;

export async function createLabel(
  gmail: gmail_v1.Gmail,
  args: CreateLabelInput
): Promise<string> {
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
  });
}
