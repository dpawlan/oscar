import { gmail_v1 } from 'googleapis';
import { gmailTools } from './tools/index.js';

export interface ToolCall {
  name: string;
  arguments: unknown;
}

export interface ToolResult {
  success: boolean;
  result?: string;
  error?: string;
}

export class GmailMcpHandler {
  private gmail: gmail_v1.Gmail;

  constructor(gmail: gmail_v1.Gmail) {
    this.gmail = gmail;
  }

  getToolDefinitions() {
    return gmailTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: this.zodToJsonSchema(tool.schema),
    }));
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult> {
    const tool = gmailTools.find(t => t.name === name);
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
    }

    try {
      // Validate input
      const validated = tool.schema.parse(args);
      const result = await tool.execute(this.gmail, validated);
      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }

  private zodToJsonSchema(schema: import('zod').ZodObject<Record<string, import('zod').ZodTypeAny>>) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodType = value as import('zod').ZodTypeAny;
      const def = zodType._def;

      let prop: Record<string, unknown> = {};

      // Handle optional wrapper
      const isOptional = def.typeName === 'ZodOptional';
      const innerDef = isOptional ? (def as any).innerType._def : def;
      const innerTypeName = isOptional ? (def as any).innerType._def.typeName : def.typeName;

      // Map Zod types to JSON Schema
      switch (innerTypeName) {
        case 'ZodString':
          prop.type = 'string';
          break;
        case 'ZodNumber':
          prop.type = 'number';
          break;
        case 'ZodBoolean':
          prop.type = 'boolean';
          break;
        case 'ZodArray':
          prop.type = 'array';
          prop.items = { type: 'string' }; // Simplified
          break;
        case 'ZodDefault':
          // Get the default value and inner type
          const defaultDef = innerDef as any;
          const innerInnerTypeName = defaultDef.innerType._def.typeName;
          if (innerInnerTypeName === 'ZodNumber') {
            prop.type = 'number';
            prop.default = defaultDef.defaultValue();
          } else if (innerInnerTypeName === 'ZodString') {
            prop.type = 'string';
            prop.default = defaultDef.defaultValue();
          }
          break;
        default:
          prop.type = 'string';
      }

      // Get description
      if (def.description) {
        prop.description = def.description;
      } else if (isOptional && (def as any).innerType._def.description) {
        prop.description = (def as any).innerType._def.description;
      }

      properties[key] = prop;

      if (!isOptional && innerTypeName !== 'ZodDefault') {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }
}
