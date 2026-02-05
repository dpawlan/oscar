import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const searchContactsSchema = {
  query: z.string()
    .describe('Name to search for (e.g., "John", "Mom", "Hacker")'),
};

export type SearchContactsInput = z.infer<z.ZodObject<typeof searchContactsSchema>>;

export async function searchContacts(args: SearchContactsInput): Promise<string> {
  const { query } = args;

  // AppleScript to search contacts
  const appleScript = `
    set searchResults to {}
    tell application "Contacts"
      set matchingPeople to (every person whose name contains "${query.replace(/"/g, '\\"')}")
      repeat with p in matchingPeople
        set personName to name of p
        set personPhones to {}
        set personEmails to {}

        repeat with ph in phones of p
          set end of personPhones to {label:(label of ph), value:(value of ph)}
        end repeat

        repeat with em in emails of p
          set end of personEmails to {label:(label of em), value:(value of em)}
        end repeat

        set end of searchResults to {name:personName, phones:personPhones, emails:personEmails}
      end repeat
    end tell
    return searchResults
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`);

    // Parse AppleScript output - it returns in a specific format
    // The output format is complex, so let's use a simpler approach
    const simpleScript = `
      set output to ""
      tell application "Contacts"
        set matchingPeople to (every person whose name contains "${query.replace(/"/g, '\\"')}")
        repeat with p in matchingPeople
          set output to output & "NAME:" & name of p & "\\n"
          repeat with ph in phones of p
            set output to output & "PHONE:" & label of ph & ":" & value of ph & "\\n"
          end repeat
          repeat with em in emails of p
            set output to output & "EMAIL:" & label of em & ":" & value of em & "\\n"
          end repeat
          set output to output & "---\\n"
        end repeat
      end tell
      return output
    `;

    const { stdout: simpleOutput } = await execAsync(`osascript -e '${simpleScript.replace(/'/g, "'\\''")}'`);

    // Parse the simple output format
    const contacts: Array<{
      name: string;
      phones: Array<{ label: string; number: string }>;
      emails: Array<{ label: string; address: string }>;
    }> = [];

    let currentContact: typeof contacts[0] | null = null;

    const lines = simpleOutput.split('\\n').filter(l => l.trim());

    for (const line of lines) {
      if (line === '---') {
        if (currentContact) {
          contacts.push(currentContact);
        }
        currentContact = null;
      } else if (line.startsWith('NAME:')) {
        currentContact = {
          name: line.substring(5),
          phones: [],
          emails: [],
        };
      } else if (line.startsWith('PHONE:') && currentContact) {
        const parts = line.substring(6).split(':');
        const label = parts[0] || 'phone';
        const number = parts.slice(1).join(':');
        currentContact.phones.push({ label, number });
      } else if (line.startsWith('EMAIL:') && currentContact) {
        const parts = line.substring(6).split(':');
        const label = parts[0] || 'email';
        const address = parts.slice(1).join(':');
        currentContact.emails.push({ label, address });
      }
    }

    if (currentContact) {
      contacts.push(currentContact);
    }

    if (contacts.length === 0) {
      return JSON.stringify({
        success: true,
        count: 0,
        message: `No contacts found matching "${query}"`,
        contacts: [],
      }, null, 2);
    }

    return JSON.stringify({
      success: true,
      count: contacts.length,
      contacts,
    }, null, 2);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('not allowed') || errorMessage.includes('permission')) {
      return JSON.stringify({
        success: false,
        error: 'Permission denied. The app needs permission to access Contacts.',
        suggestion: 'Go to System Settings > Privacy & Security > Contacts and allow this app.',
      }, null, 2);
    }

    return JSON.stringify({
      success: false,
      error: `Failed to search contacts: ${errorMessage}`,
    }, null, 2);
  }
}
