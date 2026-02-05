import { Router, Request, Response } from 'express';
import { query, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { getAllGmailClients } from '../services/gmail.js';
import { imessageTools } from '../agent/imessage/tools/index.js';
import { clayTools } from '../agent/clay/tools/index.js';
import { listDriveFilesTool } from '../agent/tools/listDriveFiles.js';
import { sendEmailWithAttachmentTool } from '../agent/tools/sendEmailWithAttachment.js';
import { getCalendarEventsTool } from '../agent/tools/getCalendarEvents.js';
import { listCalendarsTool } from '../agent/tools/listCalendars.js';
import { createMultiAccountGmailTools, createGenericTools } from '../agent/toolFactories/index.js';
import { SYSTEM_PROMPT } from '../agent/systemPrompt.js';

const router = Router();

// Store session IDs for resumption
const sessions = new Map<string, string>();

// Disabled built-in Claude Code tools - only use our MCP tools
const DISALLOWED_TOOLS = [
  'Task', 'TaskOutput', 'Bash', 'Glob', 'Grep', 'ExitPlanMode',
  'Read', 'Edit', 'Write', 'NotebookEdit', 'WebFetch', 'TodoWrite',
  'WebSearch', 'KillShell', 'AskUserQuestion', 'Skill', 'EnterPlanMode', 'LSP',
];

router.get('/stream', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const userMessage = req.query.message as string;
  const sessionId = req.query.sessionId as string || `session-${Date.now()}`;

  if (!userId || !userMessage) {
    res.status(400).json({ error: 'userId and message are required' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    // Get Gmail clients for ALL connected accounts
    const gmailAccounts = await getAllGmailClients(userId);
    console.log(`[Oscar] Found ${gmailAccounts.length} Gmail accounts: ${gmailAccounts.map(a => a.email).join(', ')}`);

    // Create MCP servers for all tools
    const mcpServers = {
      gmail: createSdkMcpServer({
        name: 'gmail',
        tools: createMultiAccountGmailTools(gmailAccounts),
      }),
      imessage: createSdkMcpServer({
        name: 'imessage',
        tools: createGenericTools(imessageTools),
      }),
      clay: createSdkMcpServer({
        name: 'clay',
        tools: createGenericTools(clayTools),
      }),
      drive: createSdkMcpServer({
        name: 'drive',
        tools: [listDriveFilesTool(userId), sendEmailWithAttachmentTool(userId)],
      }),
      calendar: createSdkMcpServer({
        name: 'calendar',
        tools: [getCalendarEventsTool(userId), listCalendarsTool(userId)],
      }),
    };

    // Get existing agent session ID if resuming
    const existingSessionId = sessions.get(sessionId);

    // Run the agent with the SDK
    console.log('[Oscar] Starting query with prompt:', userMessage);

    const agentQuery = query({
      prompt: userMessage,
      options: {
        model: 'claude-sonnet-4-20250514',
        systemPrompt: SYSTEM_PROMPT,
        maxTurns: 20,
        maxThinkingTokens: 10000,
        disallowedTools: DISALLOWED_TOOLS,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        includePartialMessages: true,
        env: {
          HOME: process.env.HOME,
          PATH: process.env.PATH,
        },
        ...(existingSessionId ? { resume: existingSessionId } : {}),
        mcpServers,
      },
    });

    // Track whether the last thing we sent was a tool_use so we can
    // emit a synthetic tool_result when text resumes (gives the
    // frontend a chance to insert a paragraph break).
    let lastToolName: string | null = null;

    // Stream messages to client
    for await (const message of agentQuery) {
      if (res.writableEnded) break;

      switch (message.type) {
        case 'system':
          if (message.subtype === 'init') {
            sessions.set(sessionId, message.session_id);
            console.log('[Oscar] Session initialized:', message.session_id);
          }
          break;

        case 'assistant':
          // Handle tool_use notifications
          const content = message.message?.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_use') {
                console.log('[Oscar] Tool call:', block.name, JSON.stringify(block.input));
                res.write(`data: ${JSON.stringify({ type: 'tool_use', name: block.name })}\n\n`);
                lastToolName = block.name;
              }
            }
          }
          break;

        case 'stream_event':
          // Handle streaming text (incremental deltas)
          const event = (message as { event?: { type?: string; delta?: { type?: string; text?: string } } }).event;
          if (event?.type === 'content_block_delta' && event?.delta?.type === 'text_delta') {
            // If text is arriving after a tool call, emit a synthetic
            // tool_result so the frontend inserts a paragraph break.
            if (lastToolName) {
              res.write(`data: ${JSON.stringify({ type: 'tool_result', name: lastToolName, success: true })}\n\n`);
              lastToolName = null;
            }
            res.write(`data: ${JSON.stringify({
              type: 'text',
              content: event.delta.text,
              sessionId,
            })}\n\n`);
          }
          break;

        case 'result':
          console.log(`[Oscar] Session ${sessionId}: ${message.num_turns} turns, $${message.total_cost_usd?.toFixed(4) || '0.00'}`);
          break;
      }
    }

    // Send completion event
    res.write(`data: ${JSON.stringify({ type: 'done', sessionId })}\n\n`);

  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';

    const errorPayload = errorMessage.includes('not authenticated')
      ? { type: 'error', message: 'Please connect your Gmail account first', code: 'AUTH_REQUIRED' }
      : { type: 'error', message: errorMessage };

    res.write(`data: ${JSON.stringify(errorPayload)}\n\n`);
  } finally {
    res.end();
  }
});

// Clear session history
router.delete('/session/:sessionId', (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

export { router as chatRouter };
