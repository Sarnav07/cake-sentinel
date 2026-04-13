import { useEffect, useRef } from 'react';

export function useWebSocket(url: string, onMessage: (payload: any) => void) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retries = 0;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      socket = new WebSocket(url);
      socket.onmessage = (event) => {
        try {
          handlerRef.current(JSON.parse(event.data));
        } catch {
          handlerRef.current({ type: 'log', data: event.data });
        }
      };
      socket.onclose = () => {
        if (!cancelled) {
          retries += 1;
          window.setTimeout(connect, Math.min(5000, 500 * retries));
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, [url]);
}