export interface AgentEvent {
  event: string
  data: any
  ts: number
}

declare class AgentBus {
  history: AgentEvent[]
  on(event: string, fn: (data: any) => void): () => void
  off(event: string, fn: (data: any) => void): void
  emit(event: string, data: any): void
}

declare const bus: AgentBus
export default bus
