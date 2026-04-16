import React, { useEffect, useRef, useState } from 'react'
import { theme } from '../../styles/theme'

const sizeMap: Record<string, string> = {
  sm:  'text-sm',
  md:  'text-base',
  lg:  'text-xl',
  xl:  'text-3xl',
  '2xl': 'text-4xl',
}

interface MonoValueProps {
  value: string | number
  color?: string
  size?: string
  className?: string
  /** If true, flashes green on increase, red on decrease */
  flash?: boolean
}

export default function MonoValue({ value, color = 'var(--text-primary)', size = 'md', className = '', flash = false }: MonoValueProps) {
  const prevRef      = useRef<string | number>(value)
  const [bg, setBg]  = useState<string | null>(null)

  useEffect(() => {
    if (!flash) return
    const prev = prevRef.current
    prevRef.current = value
    if (value === prev) return

    const numVal  = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''))
    const numPrev = typeof prev  === 'number' ? prev  : parseFloat(String(prev).replace(/[^0-9.-]/g, ''))
    if (isNaN(numVal) || isNaN(numPrev)) return

    const flashColor = numVal > numPrev ? 'rgba(0,255,136,0.18)' : 'rgba(255,68,68,0.18)'   // theme.accent.success / danger @ 18% alpha
    setBg(flashColor)
    const t = setTimeout(() => setBg(null), 400)
    return () => clearTimeout(t)
  }, [value, flash])

  return (
    <span
      className={`font-bold tabular-nums ${sizeMap[size] ?? 'text-base'} ${className}`}
      style={{
        fontFamily: 'var(--font-mono)',
        color,
        borderRadius: 4,
        padding: bg ? '0 3px' : undefined,
        background: bg ?? 'transparent',
        transition: 'background 0.1s ease',
      }}
    >
      {value}
    </span>
  )
}
