import React from 'react'
import { theme } from '../../styles/theme'

// Map badge color names to their theme accent values and derived rgba bg/border
const COLOR_MAP: Record<string, { text: string; bg: string; border: string }> = {
  green:  { text: theme.accent.success, bg: 'rgba(0,255,136,0.1)',   border: 'rgba(0,255,136,0.25)'   },
  red:    { text: theme.accent.danger,  bg: 'rgba(255,68,68,0.1)',   border: 'rgba(255,68,68,0.25)'   },
  cyan:   { text: theme.accent.primary, bg: 'rgba(0,229,255,0.1)',   border: 'rgba(0,229,255,0.25)'   },
  purple: { text: theme.accent.sim,     bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.25)'  },
  amber:  { text: theme.accent.warning, bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)'  },
}

interface StatBadgeProps {
  label: string
  color?: 'green' | 'red' | 'cyan' | 'purple' | 'amber'
}

export default function StatBadge({ label, color = 'cyan' }: StatBadgeProps) {
  const c = COLOR_MAP[color]
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] font-mono"
      style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {label}
    </span>
  )
}
