import { globalEventBus } from '../events/event-bus.js';

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(tool) {
    if (!tool.name) throw new Error('Tool must have a name');
    this.tools.set(tool.name, tool);
  }

  get(name) {
    return this.tools.get(name);
  }

  list() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      permissions: t.permissions || ['read']
    }));
  }

  async execute(name, input = {}, context = {}) {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Tool not found in registry: ${name}`);
    }

    const traceId = `trc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const startTime = Date.now();

    globalEventBus.emitEvent('tool.started', {
      tool: name,
      input,
      trace_id: traceId
    });

    try {
      const output = await tool.execute(input, context);
      const duration = Date.now() - startTime;

      globalEventBus.emitEvent('tool.completed', {
        tool: name,
        input,
        output,
        duration_ms: duration,
        trace_id: traceId,
        status: 'success'
      });

      return { success: true, tool: name, output, duration_ms: duration };
    } catch (err) {
      const duration = Date.now() - startTime;

      globalEventBus.emitEvent('tool.failed', {
        tool: name,
        input,
        error: err.message,
        duration_ms: duration,
        trace_id: traceId,
        status: 'error'
      });

      return { success: false, tool: name, error: err.message, duration_ms: duration };
    }
  }
}

export const globalToolRegistry = new ToolRegistry();
