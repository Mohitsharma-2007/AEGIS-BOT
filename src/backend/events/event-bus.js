import { EventEmitter } from 'events';

export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.history = [];
    this.maxHistory = 200;
    this.counter = 1000;
  }

  emitEvent(type, payload = {}, sessionId = 'aegis-session-001') {
    const event = {
      event_id: `evt-${this.counter++}`,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      type,
      payload
    };

    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.emit('event', event);
    this.emit(type, event);
    return event;
  }

  getHistory(limit = 100) {
    return this.history.slice(-limit);
  }

  clearHistory() {
    this.history = [];
  }
}

export const globalEventBus = new EventBus();
