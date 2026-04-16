import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { AnimatePresence } from 'framer-motion'
import { useExecutionFeed, useNexus } from '../context/NexusContext'
import type { Trade } from '../data/MockDataEngine'

// ── Trade Detail Drawer ───────────────────────────────────────────────────────
function TradeDrawer({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const isPos = trade.pnl >= 0
  const isBuy = trade.side === 'BUY'

  const rows = [
    { label: 'Trade ID',     value: trade.id },
    { label: 'Time',         value: trade.time },
    { label: 'Pair',         value: trade.pair },
    { label: 'Side',         value: trade.side },
    { label: 'Size',         value: trade.size },
    { label: 'Entry Price',  value: `$${trade.entry.toFixed(4)}` },
    { label: 'Exit Price',   value: `$${trade.exit.toFixed(4)}` },
    { label: 'Gas Cost',     value: `${trade.gas} BNB` },
    { label: 'Gross P&L',    value: `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` },
    { label: 'Net P&L',      value: `${(trade.pnl - trade.gas * 310).toFixed(2) >= '0' ? '+' : ''}$${(trade.pnl - trade.gas * 310).toFixed(2)}` },
    { label: 'Route',        value: `${trade.pair} via PancakeSwap V3` },
    { label: 'Status',       value: trade.status },
  ]

  return (
    <AnimatePresence>
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose} />

        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm overflow-y-auto"
          style={{ background: 'rgba(8,11,18,0.97)', borderLeft: '1px solid var(--border-dim)', backdropFilter: 'blur(30px)' }}
        >
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] mb-0.5"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Trade Detail</p>
              <p className="text-[14px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {trade.id}
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-lg leading-none transition-colors"
              style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-dim)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              ×
            </button>
          </div>

          <div className="px-6 py-6 text-center" style={{ borderBottom: '1px solid var(--border-dim)' }}>
            <p className="text-[10px] uppercase tracking-[0.25em] mb-2"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Net P&L</p>
            <p className="text-4xl font-black" style={{
              fontFamily: 'var(--font-mono)',
              color: isPos ? 'var(--green)' : 'var(--red)',
              textShadow: `0 0 20px ${isPos ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.5)'}`,
            }}>
              {trade.pnl >= 0 ? '+' : ''}${Math.abs(trade.pnl).toFixed(2)}
            </p>
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{
                background: isBuy ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,68,0.08)',
                border: `1px solid ${isBuy ? 'rgba(0,255,136,0.25)' : 'rgba(255,68,68,0.25)'}`,
                color: isBuy ? 'var(--green)' : 'var(--red)',
                fontFamily: 'var(--font-mono)',
              }}>
              <span className="w-1 h-1 rounded-full" style={{ background: isBuy ? 'var(--green)' : 'var(--red)' }} />
              {trade.side} · {trade.pair}
            </span>
          </div>

          <div className="px-6 py-4 space-y-0">
            {rows.map(r => (
              <div key={r.label} className="flex justify-between items-center py-3"
                style={{ borderBottom: '1px solid var(--border-dim)' }}>
                <span className="text-[10px] uppercase tracking-[0.15em]"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{r.label}</span>
                <span className="text-[11px] font-bold"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-4xl mb-4" style={{ opacity: 0.2 }}>◎</div>
      <p className="text-[13px] font-semibold mb-1"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        No trades executed yet
      </p>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        The Execution Agent is scanning for opportunities...
      </p>
    </motion.div>
  )
}

// ── Gas Tooltip ───────────────────────────────────────────────────────────────
const GasTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
      borderRadius: 6, padding: '4px 10px', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 11 }}>
      {payload[0].value.toFixed(4)} BNB
    </div>
  )
}

// ── Gas Tracker ───────────────────────────────────────────────────────────────
function GasTracker() {
  const trades = useExecutionFeed()
  // Build a rolling gas sparkline from the last 30 confirmed trades
  const gasSpark = useMemo(() =>
    trades.slice(0, 30).reverse().map(t => ({ v: t.gas })), [trades])
  const latestGas = trades[0]?.gas ?? 0.003
  // Convert BNB gas to gwei-equivalent for display (1 BNB ≈ 300 USD, 1 gwei = 0.000000001 BNB)
  const gweiEst   = (latestGas * 1e9).toFixed(1)
  const gasColor  = latestGas > 0.007 ? 'var(--red)' : latestGas > 0.004 ? 'var(--amber)' : 'var(--green)'

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>

      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--amber)', boxShadow: '0 0 6px var(--amber)' }} />
        <span className="text-xs font-bold uppercase tracking-[0.25em]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Gas Tracker</span>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-1"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Last Trade Gas</p>
        <p className="text-[28px] font-black leading-none" style={{ color: gasColor, fontFamily: 'var(--font-mono)' }}>
          {latestGas.toFixed(4)} <span style={{ fontSize: 13, opacity: 0.6 }}>BNB</span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={50}>
        <LineChart data={gasSpark} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <Line type="monotone" dataKey="v" stroke={gasColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Tooltip content={<GasTip />} />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex justify-between py-2 rounded-lg px-3"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)' }}>
        <span className="text-[10px] uppercase tracking-[0.15em]"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Total Gas Cost</span>
        <span className="text-[12px] font-bold" style={{ color: gasColor, fontFamily: 'var(--font-mono)' }}>
          {trades.reduce((s, t) => s + t.gas, 0).toFixed(4)} BNB
        </span>
      </div>
    </motion.div>
  )
}

// ── MEV Shield ────────────────────────────────────────────────────────────────
function MevShield() {
  const trades  = useExecutionFeed()
  const protected_ = trades.filter(t => t.status === 'CONFIRMED').length

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
          <span className="text-xs font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>MEV Shield</span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em]"
          style={{ background: 'rgba(0,255,136,0.08)', color: 'var(--green)',
            border: '1px solid rgba(0,255,136,0.2)', fontFamily: 'var(--font-mono)' }}>ACTIVE</span>
      </div>

      {[
        { label: 'Private Mempool',   value: 'Connected',         ok: true  },
        { label: 'Flashloan Guard',   value: 'Enabled',           ok: true  },
        { label: 'Trades Protected',  value: String(protected_),  ok: true  },
      ].map(row => (
        <div key={row.label} className="flex justify-between items-center py-2"
          style={{ borderBottom: '1px solid var(--border-dim)' }}>
          <span className="text-[10px] uppercase tracking-[0.15em]"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{row.label}</span>
          <span className="text-[11px] font-bold"
            style={{ color: row.ok ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>{row.value}</span>
        </div>
      ))}
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

export default function ExecutionPage() {
  const allTrades = useExecutionFeed()
  const { activePairFilter, setActivePairFilter, activeSideFilter, setActiveSideFilter } = useNexus()
  const [page, setPage]  = useState(0)
  const [selected, setSelected] = useState<Trade | null>(null)

  const pairs = ['All Pairs', ...Array.from(new Set(allTrades.map(t => t.pair)))]

  const filtered = allTrades.filter(t => {
    if (activePairFilter !== 'All Pairs' && t.pair !== activePairFilter) return false
    if (activeSideFilter !== 'All Sides' && t.side !== activeSideFilter) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const rows       = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const selectStyle: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border-dim)', color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px', borderRadius: 8, outline: 'none', cursor: 'pointer',
  }

  const exportCSV = () => {
    const header = 'Time,Pair,Side,Size,Entry,Exit,Gas,PNL,Status\n'
    const body   = allTrades.map(t =>
      `${t.time},${t.pair},${t.side},${t.size},${t.entry.toFixed(2)},${t.exit.toFixed(2)},${t.gas},${t.pnl},${t.status}`
    ).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'nexus_trades.csv'; a.click()
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5 items-start">

        {/* Left: Trade log */}
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <select value={activePairFilter}
              onChange={e => { setActivePairFilter(e.target.value); setPage(0) }} style={selectStyle}>
              {pairs.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={activeSideFilter}
              onChange={e => { setActiveSideFilter(e.target.value); setPage(0) }} style={selectStyle}>
              {['All Sides', 'BUY', 'SELL'].map(s => <option key={s}>{s}</option>)}
            </select>
            <motion.button whileHover={{ background: 'rgba(0,229,255,0.1)' }} whileTap={{ scale: 0.96 }}
              onClick={exportCSV} className="ml-auto px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
              style={{ border: '1px solid rgba(0,229,255,0.3)', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', background: 'transparent' }}>
              ↓ Export CSV
            </motion.button>
          </div>

          {/* Table */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
            <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)' }} />
              <span className="text-xs font-bold uppercase tracking-[0.25em]"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                Trade Log <span style={{ color: 'var(--text-muted)' }}>— {filtered.length} records</span>
              </span>
            </div>

            {rows.length === 0 ? <EmptyState /> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      {['Time','Pair','Side','Size','Entry','Exit','Gas','Net PNL','Status'].map(c => (
                        <th key={c} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.2em]"
                          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: Trade, i) => {
                      const isBuy  = row.side === 'BUY'
                      const isPos  = row.pnl >= 0
                      const isFail = row.status === 'FAILED'
                      return (
                        <motion.tr key={row.id}
                          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          style={{ borderBottom: '1px solid var(--border-dim)', cursor: 'pointer' }}
                          onClick={() => setSelected(row)}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.03)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{row.time}</td>
                          <td className="px-4 py-3 text-[11px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{row.pair}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{
                              fontFamily: 'var(--font-mono)',
                              background: isBuy ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
                              color: isBuy ? 'var(--green)' : 'var(--red)',
                              border: `1px solid ${isBuy ? 'rgba(0,255,136,0.25)' : 'rgba(255,68,68,0.25)'}`,
                            }}>{row.side}</span>
                          </td>
                          <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{row.size}</td>
                          <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>${row.entry.toFixed(2)}</td>
                          <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>${row.exit.toFixed(2)}</td>
                          <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>{row.gas.toFixed(4)}</td>
                          <td className="px-4 py-3 text-[11px] font-bold"
                            style={{ color: isFail ? 'var(--text-muted)' : isPos ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                            {isFail ? '—' : `${isPos ? '+' : '-'}$${Math.abs(row.pnl).toFixed(2)}`}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{
                              fontFamily: 'var(--font-mono)',
                              background: isFail ? 'rgba(255,68,68,0.08)' : 'rgba(0,255,136,0.06)',
                              color: isFail ? 'var(--red)' : 'rgba(0,255,136,0.6)',
                              border: `1px solid ${isFail ? 'rgba(255,68,68,0.2)' : 'rgba(0,255,136,0.1)'}`,
                            }}>{row.status}</span>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, idx) => (
                  <button key={idx} onClick={() => setPage(idx)}
                    className="w-7 h-7 rounded text-[10px] font-bold transition-all"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: idx === page ? 'rgba(0,229,255,0.15)' : 'transparent',
                      color:      idx === page ? 'var(--cyan)' : 'var(--text-muted)',
                      border:     idx === page ? '1px solid rgba(0,229,255,0.3)' : '1px solid var(--border-dim)',
                    }}>
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <GasTracker />
          <MevShield />
        </div>
      </div>

      {selected && <TradeDrawer trade={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
