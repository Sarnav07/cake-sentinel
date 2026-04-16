import React from 'react'
import { theme } from '../../styles/theme'

interface SectionTitleProps {
  title: string
  dotColor?: string
}

export default function SectionTitle({ title, dotColor = theme.accent.primary }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
      />
      <span
        className="text-xs font-bold uppercase tracking-[0.25em]"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
      >
        {title}
      </span>
    </div>
  )
}
