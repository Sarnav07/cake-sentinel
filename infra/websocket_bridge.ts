import { WebSocketServer } from 'ws';
import { orchestratorBus } from '@pancakeswap-agent/core';

export function startWebSocketBridge(port = 3002) {
  const wss = new WebSocketServer({ port });

  const forward = (type: string) => (data: unknown) => {
    const payload = JSON.stringify({ type, data });
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  };

  orchestratorBus.on('market:update', forward('market_update'));
  orchestratorBus.on('strategy:signal', forward('signal'));
  orchestratorBus.on('risk:decision', forward('risk_decision'));
  orchestratorBus.on('execution:trade', forward('trade'));
  orchestratorBus.on('risk:circuit_break', forward('risk_alert'));

  return wss;
}