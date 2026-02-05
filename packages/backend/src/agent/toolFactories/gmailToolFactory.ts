import { tool } from '@anthropic-ai/claude-agent-sdk';
import { gmail_v1 } from 'googleapis';
import { z } from 'zod';
import { gmailTools, GmailTool } from '../tools/index.js';

/**
 * Creates Gmail tool definitions for the SDK that query ALL connected accounts.
 * - Read-only tools aggregate results from all accounts
 * - Write tools require specifying which account to use
 */
export function createMultiAccountGmailTools(accounts: { email: string; client: gmail_v1.Gmail }[]) {
  const readOnlyTools = ['list_emails', 'search_emails', 'scan_emails'];

  return gmailTools.map(gmailTool => {
    if (readOnlyTools.includes(gmailTool.name)) {
      return createReadOnlyTool(gmailTool, accounts);
    } else if (gmailTool.name === 'read_email') {
      return createReadEmailTool(gmailTool, accounts);
    } else if (gmailTool.name === 'list_labels') {
      return createListLabelsTool(gmailTool, accounts);
    } else {
      return createWriteTool(gmailTool, accounts);
    }
  });
}

/**
 * For read-only tools, query ALL accounts and merge results.
 */
function createReadOnlyTool(
  gmailTool: GmailTool,
  accounts: { email: string; client: gmail_v1.Gmail }[]
) {
  return tool(
    gmailTool.name,
    `${gmailTool.description} (searches across ALL ${accounts.length} connected email accounts: ${accounts.map(a => a.email).join(', ')})`,
    gmailTool.schema.shape,
    async (args) => {
      try {
        const allResults = await Promise.all(
          accounts.map(async ({ email, client }) => {
            try {
              const result = await gmailTool.execute(client, args);
              return { email, result: JSON.parse(result), error: null };
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              return { email, result: null, error: errorMsg };
            }
          })
        );

        const combined = {
          accounts_searched: accounts.map(a => a.email),
          results_by_account: allResults.filter(r => r.result !== null).map(r => ({
            email_account: r.email,
            ...r.result
          })),
          errors: allResults.filter(r => r.error !== null).map(r => ({
            email_account: r.email,
            error: r.error
          }))
        };

        return { content: [{ type: 'text' as const, text: JSON.stringify(combined, null, 2) }] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Tool execution failed';
        return { content: [{ type: 'text' as const, text: `Error: ${errorMsg}` }], isError: true };
      }
    }
  );
}

/**
 * read_email needs to try each account until it finds the email.
 */
function createReadEmailTool(
  gmailTool: GmailTool,
  accounts: { email: string; client: gmail_v1.Gmail }[]
) {
  return tool(
    gmailTool.name,
    `${gmailTool.description} (will check all connected accounts to find the email)`,
    gmailTool.schema.shape,
    async (args) => {
      try {
        for (const { email, client } of accounts) {
          try {
            const result = await gmailTool.execute(client, args);
            const parsed = JSON.parse(result);
            return { content: [{ type: 'text' as const, text: JSON.stringify({ found_in_account: email, ...parsed }, null, 2) }] };
          } catch {
            // Email not found in this account, try next
            continue;
          }
        }
        return { content: [{ type: 'text' as const, text: 'Email not found in any connected account' }], isError: true };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Tool execution failed';
        return { content: [{ type: 'text' as const, text: `Error: ${errorMsg}` }], isError: true };
      }
    }
  );
}

/**
 * list_labels shows labels from all accounts.
 */
function createListLabelsTool(
  gmailTool: GmailTool,
  accounts: { email: string; client: gmail_v1.Gmail }[]
) {
  return tool(
    gmailTool.name,
    `${gmailTool.description} (shows labels from ALL connected accounts)`,
    gmailTool.schema.shape,
    async (args) => {
      try {
        const allLabels = await Promise.all(
          accounts.map(async ({ email, client }) => {
            try {
              const result = await gmailTool.execute(client, args);
              return { email, labels: JSON.parse(result) };
            } catch (error) {
              return { email, labels: [], error: error instanceof Error ? error.message : 'Unknown error' };
            }
          })
        );
        return { content: [{ type: 'text' as const, text: JSON.stringify({ labels_by_account: allLabels }, null, 2) }] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Tool execution failed';
        return { content: [{ type: 'text' as const, text: `Error: ${errorMsg}` }], isError: true };
      }
    }
  );
}

/**
 * For write tools, add account selection parameter.
 */
function createWriteTool(
  gmailTool: GmailTool,
  accounts: { email: string; client: gmail_v1.Gmail }[]
) {
  const extendedSchema = {
    ...gmailTool.schema.shape,
    fromAccount: z.string().describe(`Which email account to use. Options: ${accounts.map(a => a.email).join(', ')}`),
  };

  return tool(
    gmailTool.name,
    `${gmailTool.description} (specify which account with fromAccount parameter: ${accounts.map(a => a.email).join(', ')})`,
    extendedSchema,
    async (args: Record<string, unknown>) => {
      try {
        const { fromAccount, ...toolArgs } = args;
        const account = accounts.find(a => a.email === fromAccount);
        if (!account) {
          return {
            content: [{ type: 'text' as const, text: `Error: Account "${fromAccount}" not found. Available accounts: ${accounts.map(a => a.email).join(', ')}` }],
            isError: true
          };
        }
        const result = await gmailTool.execute(account.client, toolArgs);
        return { content: [{ type: 'text' as const, text: result }] };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Tool execution failed';
        return { content: [{ type: 'text' as const, text: `Error: ${errorMsg}` }], isError: true };
      }
    }
  );
}
