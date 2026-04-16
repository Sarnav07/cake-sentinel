export function startOrchestrator(onStateUpdate: (action: string, payload: any) => void): Promise<void>
export function stopOrchestrator(): void
export function rearm(): void
export function setAutoExecute(val: boolean): void
export function setSignalFrequency(ms: number): void
export function forceTrade(): void
export function triggerBreachManual(): void
export function resetAll(): void
export function runDemoSequence(onStep: (n: number, msg: string) => void): Promise<void>
export function executeSignal(signal: any): Promise<any>
