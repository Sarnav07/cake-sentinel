import React from 'react'
import { theme } from '../../styles/theme'

interface LiveDotProps {
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-2.5 h-2.5' }

export default function LiveDot({ color = theme.accent.success, size = 'md' }: LiveDotProps) {
  return (
    <span
      className={`rounded-full inline-block flex-shrink-0 pulse-dot ${sizeMap[size]}`}
      style={{ background: color }}
    />
  )
}
