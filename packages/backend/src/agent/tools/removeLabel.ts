import { z } from 'zod';
import { gmail_v1 } from 'googleapis';
import { modifyEmailLabels } from './utils/emailUtils.js';

export const removeLabelSchema = {
  emailIds: z.array(z.string()).min(1)
    .describe('Array of email IDs to remove the label from'),
  labelId: z.string()
    .describe('The label ID to remove'),
};

export type RemoveLabelInput = z.infer<z.ZodObject<typeof removeLabelSchema>>;

export async function removeLabel(
  gmail: gmail_v1.Gmail,
  args: RemoveLabelInput
): Promise<string> {
  await modifyEmailLabels(gmail, args.emailIds, {
    removeLabelIds: [args.labelId],
  });

  return JSON.stringify({
    success: true,
    message: `Removed label from ${args.emailIds.length} email(s)`,
  });
}
