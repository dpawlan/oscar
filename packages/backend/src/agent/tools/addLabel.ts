import { z } from 'zod';
import { gmail_v1 } from 'googleapis';
import { modifyEmailLabels } from './utils/emailUtils.js';

export const addLabelSchema = {
  emailIds: z.array(z.string()).min(1)
    .describe('Array of email IDs to add the label to'),
  labelId: z.string()
    .describe('The label ID to add (use list_labels to get IDs)'),
};

export type AddLabelInput = z.infer<z.ZodObject<typeof addLabelSchema>>;

export async function addLabel(
  gmail: gmail_v1.Gmail,
  args: AddLabelInput
): Promise<string> {
  await modifyEmailLabels(gmail, args.emailIds, {
    addLabelIds: [args.labelId],
  });

  return JSON.stringify({
    success: true,
    message: `Added label to ${args.emailIds.length} email(s)`,
  });
}
