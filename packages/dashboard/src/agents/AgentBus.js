class AgentBus {
  constructor() {
    this._listeners = {}
    this.history = []  // last 100 events for ActivityFeed
  }
  
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(fn)
    return () => this.off(event, fn)
  }
  
  off(event, fn) {
    if (!this._listeners[event]) return
    this._listeners[event] = this._listeners[event].filter(f => f !== fn)
  }
  
  emit(event, data) {
    const entry = { event, data, ts: Date.now() }
    this.history.unshift(entry)
    if (this.history.length > 100) this.history.pop()
    const fns = this._listeners[event] || []
    fns.forEach(fn => fn(data))
    // AGENT_LOG always broadcasts so UI feed picks it up
    if (event === 'AGENT_LOG') {
      const allFns = this._listeners['*'] || []
      allFns.forEach(fn => fn(entry))
    }
  }
}

export default new AgentBus()
