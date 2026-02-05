import { clayTools } from './tools/index.js';

export interface ToolResult {
  success: boolean;
  result?: string;
  error?: string;
}

export class ClayMcpHandler {
  getToolDefinitions() {
    return clayTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: this.zodToJsonSchema(tool.schema),
    }));
  }

  async executeTool(name: string, args: unknown): Promise<ToolResult> {
    const tool = clayTools.find(t => t.name === name);
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
    }

    try {
      const validated = tool.schema.parse(args);
      const result = await tool.execute(validated);
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

      const isOptional = def.typeName === 'ZodOptional';
      const innerDef = isOptional ? (def as any).innerType._def : def;
      const innerTypeName = isOptional ? (def as any).innerType._def.typeName : def.typeName;

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
          const arrayDef = innerDef as any;
          if (arrayDef.type?._def?.typeName === 'ZodNumber') {
            prop.items = { type: 'number' };
          } else {
            prop.items = { type: 'string' };
          }
          break;
        case 'ZodEnum':
          prop.type = 'string';
          prop.enum = innerDef.values;
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
          } else if (innerInnerTypeName === 'ZodEnum') {
            prop.type = 'string';
            prop.enum = defaultDef.innerType._def.values;
            prop.default = defaultDef.defaultValue();
          }
          break;
        default:
          prop.type = 'string';
      }

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
