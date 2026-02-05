import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

/**
 * Generic tool definition interface for tools that don't require external clients.
 */
export interface GenericToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  execute: (args: TInput) => Promise<string>;
}

/**
 * Wraps an array of generic tools into SDK tool format with consistent error handling.
 */
export function createGenericTools<T extends GenericToolDefinition>(tools: T[]) {
  return tools.map(toolDef =>
    tool(
      toolDef.name,
      toolDef.description,
      toolDef.schema.shape,
      async (args) => {
        try {
          const validated = toolDef.schema.parse(args);
          const result = await toolDef.execute(validated);
          return { content: [{ type: 'text' as const, text: result }] };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Tool execution failed';
          return { content: [{ type: 'text' as const, text: `Error: ${errorMsg}` }], isError: true };
        }
      }
    )
  );
}
