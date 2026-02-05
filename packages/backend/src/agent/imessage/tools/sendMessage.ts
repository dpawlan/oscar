import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const sendMessageSchema = {
  recipient: z.string()
    .describe('Phone number (e.g., "+12025551234") or email address of the recipient'),
  message: z.string()
    .describe('The message text to send'),
};

export type SendMessageInput = z.infer<z.ZodObject<typeof sendMessageSchema>>;

export async function sendMessage(args: SendMessageInput): Promise<string> {
  const { recipient, message } = args;

  // Escape single quotes and backslashes for AppleScript
  const escapedMessage = message
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');

  const escapedRecipient = recipient
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');

  // AppleScript to send iMessage
  const appleScript = `
    tell application "Messages"
      set targetService to 1st service whose service type = iMessage
      set targetBuddy to buddy "${escapedRecipient}" of targetService
      send "${escapedMessage}" to targetBuddy
    end tell
  `;

  try {
    await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`);

    return JSON.stringify({
      success: true,
      message: `Message sent to ${recipient}`,
      recipient,
      messagePreview: message.length > 100 ? message.substring(0, 100) + '...' : message,
    }, null, 2);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check for common errors
    if (errorMessage.includes('buddy') && errorMessage.includes('doesn\'t exist')) {
      return JSON.stringify({
        success: false,
        error: `Could not find contact "${recipient}". Make sure the phone number includes country code (e.g., +1 for US) or use their exact email address.`,
        suggestion: 'Try using the full phone number with country code, like +12025551234',
      }, null, 2);
    }

    if (errorMessage.includes('not allowed') || errorMessage.includes('permission')) {
      return JSON.stringify({
        success: false,
        error: 'Permission denied. The app needs permission to control Messages.',
        suggestion: 'Go to System Settings > Privacy & Security > Automation and allow this app to control Messages.',
      }, null, 2);
    }

    return JSON.stringify({
      success: false,
      error: `Failed to send message: ${errorMessage}`,
    }, null, 2);
  }
}
