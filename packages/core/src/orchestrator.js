"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishError = exports.orchestratorBus = void 0;
const events_1 = require("events");
// Strictly typed EventEmitter
class TypedEventEmitter extends events_1.EventEmitter {
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    once(event, listener) {
        return super.once(event, listener);
    }
}
exports.orchestratorBus = new TypedEventEmitter();
// Prevent Node.js from crashing if an error is emitted before agents attach listeners
exports.orchestratorBus.on('error', (err) => {
    console.error('[Orchestrator Defaults] Unhandled Agent Error:', err.message);
});
// Utility for agents to publish errors safely
const publishError = (source, error) => {
    const e = error instanceof Error ? error : new Error(String(error));
    e.message = `[${source}] ${e.message}`;
    exports.orchestratorBus.emit('error', e);
};
exports.publishError = publishError;
