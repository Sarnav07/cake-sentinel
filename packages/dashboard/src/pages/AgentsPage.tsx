import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../lib/api';

export function AgentsPage() {
  const { data } = useQuery({ queryKey: ['health'], queryFn: fetchHealth, refetchInterval: 5000 });
  const statuses = Object.values(data?.agentStatuses ?? {});

  return (
    <div className="page-grid">
      <div className="page-panel">
        <h1>Agent Mesh</h1>
        <div className="agent-grid">
          {statuses.length === 0 ? (
            <div className="muted">No heartbeat data yet. Start agents to populate status cards.</div>
          ) : statuses.map((agent) => (
            <article key={agent.agentName} className="agent-card">
              <header>
                <strong>{agent.agentName}</strong>
                <span className={`status-pill ${agent.status}`}>{agent.status.toUpperCase()}</span>
              </header>
              <div>Events processed: {agent.eventsProcessed}</div>
              <div>Last event: {new Date(agent.lastEventTime).toLocaleTimeString()}</div>
            </article>
          ))}
        </div>
      </div>

      <div className="page-panel">
        <h1>Decision Flow</h1>
        <svg viewBox="0 0 900 220" className="flow-graph" role="img" aria-label="Agent decision flow graph">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto">
              <polygon points="0,0 10,4 0,8" fill="#00ff88" />
            </marker>
          </defs>
          <g>
            <rect x="30" y="60" width="150" height="60" rx="12" className="flow-node" />
            <text x="105" y="95" textAnchor="middle">Market Update</text>
            <rect x="220" y="60" width="150" height="60" rx="12" className="flow-node" />
            <text x="295" y="95" textAnchor="middle">Strategy Signal</text>
            <rect x="410" y="60" width="150" height="60" rx="12" className="flow-node" />
            <text x="485" y="95" textAnchor="middle">Risk Eval</text>
            <rect x="600" y="60" width="150" height="60" rx="12" className="flow-node" />
            <text x="675" y="95" textAnchor="middle">Execution</text>
            <rect x="770" y="60" width="110" height="60" rx="12" className="flow-node" />
            <text x="825" y="95" textAnchor="middle">Trade</text>
            <path d="M180 90 L220 90" className="flow-edge" markerEnd="url(#arrow)" />
            <path d="M370 90 L410 90" className="flow-edge" markerEnd="url(#arrow)" />
            <path d="M560 90 L600 90" className="flow-edge" markerEnd="url(#arrow)" />
            <path d="M750 90 L770 90" className="flow-edge" markerEnd="url(#arrow)" />
            <path d="M485 120 L485 180 L760 180" className="flow-edge reject" markerEnd="url(#arrow)" />
            <text x="780" y="184" className="reject-label">REJECTED</text>
          </g>
        </svg>
      </div>
    </div>
  );
}