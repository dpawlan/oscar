import { imessageTools } from './tools/index.js';

export interface ToolResult {
  success: boolean;
  result?: string;
  error?: string;
}

export class IMessageMcpHandler {
  getToolDefinitions() {
    return imessageTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: this.zodToJsonSchema(tool.schema),
    }));
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult> {
    console.log(`[iMessage] Executing tool: ${name}`, args);
    const tool = imessageTools.find(t => t.name === name);
    if (!tool) {
      console.log(`[iMessage] Unknown tool: ${name}`);
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
    }

    try {
      // Validate input
      const validated = tool.schema.parse(args);
      console.log(`[iMessage] Validated args for ${name}`);
      const result = await tool.execute(validated);
      console.log(`[iMessage] Tool ${name} returned ${result.length} chars`);
      return {
        success: true,
        result,
      };
    } catch (error) {
      console.error(`[iMessage] Error in ${name}:`, error);
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
          prop.items = { type: 'string' };
          break;
        case 'ZodDefault':
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
