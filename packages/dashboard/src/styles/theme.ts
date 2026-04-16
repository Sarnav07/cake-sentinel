// ── NEXUS Master Theme ────────────────────────────────────────────────────────
// Single source of truth for all colors.
// To re-theme the entire UI: change accent.primary + the three derived values
// in border.strong, border.dim, glow.primary, glow.card.
//
// These values are also mirrored as CSS variables in index.css (:root).
// Keep both in sync when changing colors.
// ─────────────────────────────────────────────────────────────────────────────

export const theme = {
  bg: {
    base:      '#0b0e14',                     // page root
    panel:     'rgba(14, 20, 32, 0.95)',       // card / panel
    panelHover:'rgba(20, 28, 44, 0.95)',      // card hover
    sidebar:   'rgba(14, 20, 32, 0.97)',       // side drawers & sheets
    navbar:    'rgba(14, 20, 32, 0.85)',       // top navbar
    boot:      'rgba(14, 20, 32, 0.85)',       // landing boot box
    elevated1: 'rgba(255,255,255,0.02)',      // very subtle raised surface
    elevated2: 'rgba(255,255,255,0.03)',      // action button bg
    elevated3: 'rgba(255,255,255,0.04)',      // chart empty fill
    elevated4: 'rgba(255,255,255,0.05)',      // bar track / badge version
    elevated5: 'rgba(255,255,255,0.06)',      // confidence/gas bar track
    elevated6: 'rgba(255,255,255,0.08)',      // inactive toggle / step bar
    elevated15:'rgba(255,255,255,0.15)',      // handle, breach badge
  },

  accent: {
    primary:  '#7ec8e3',   // ice blue
    success:  '#3ecf8e',   // confirmed, online, profit, armed
    warning:  '#e6a020',   // executing, caution, SIM badge (amber in trade table)
    danger:   '#e05c5c',   // breach, loss, error, disarmed
    sim:      '#9b7fe8',   // simulation badge, strategy agent, trend, benchmark
    magenta:  '#8899cc',   // anomaly score, Total Trades sparkline
    // Ambient orb accents (background decoration only)
    orbCyan:  'rgba(126,200,227,0.12)',
    orbPurple:'rgba(155,127,232,0.15)',
    orbMagenta:'rgba(136,153,204,0.08)',
  },

  text: {
    primary:   '#d4dce8',              // main readable text
    secondary: '#7a8fa8',             // labels, table columns, subtitles
    inactive:  '#3a4a5c',             // disabled, placeholder, dim
    dim:       'rgba(126,200,227,0.6)', // cyan-dim: landing subtitle
    white:     'rgba(255,255,255,0.85)', // breach banner badge
    white65:   'rgba(255,255,255,0.65)', // boot sequence text
  },

  border: {
    dim:     'rgba(126,200,227,0.08)',  // default card borders
    accent:  'rgba(126,200,227,0.25)', // highlighted borders
    strong:  'rgba(126,200,227,0.3)',  // buttons, pagination
    faint:   'rgba(255,255,255,0.05)', // faint
    subtle:  'rgba(255,255,255,0.08)', // action button border (neutral)
    neutral: 'rgba(255,255,255,0.15)', // mobile handle, toggle border off
    white40: 'rgba(255,255,255,0.4)', // breach reset button
    breach:  'rgba(224,92,92,0.5)',  // firewall banner bottom border
  },

  glow: {
    primary:   'rgba(126,200,227,0.08)',    // button boxShadow
    card:      'rgba(126,200,227,0.06)',   // GlowCard hover
    cardOuter: 'rgba(126,200,227,0.03)',   // secondary GlowCard layer
    strong:    'rgba(126,200,227,0.5)',    // confidence bar, IL slider
    track:     'rgba(126,200,227,0.4)',    // RiskGuardian slider track
    thumb:     'rgba(126,200,227,0.8)',    // RiskGuardian limit thumb
    success:   'rgba(62,207,142,0.12)',   // ARMED hover, MEV shield
    danger:    'rgba(224,92,92,0.18)',    // disarmed glow layer
    dangerPulse:'rgba(224,92,92,0.3)',   // disarmed pulse start
    dangerPeak:'rgba(224,92,92,0.6)',    // disarmed pulse peak
    amber:     'rgba(230,160,32,0.5)',   // gas bar, amber glow
  },

  chart: {
    line1:     '#7ec8e3',   // ice blue
    line2:     '#3ecf8e',   // mint
    line3:     '#e6a020',   // amber
    line4:     '#9b7fe8',   // purple
    line5:     '#3ecf8e',   // P&L sparkline
    line6:     '#8899cc',   // total trades sparkline
    grid:      'rgba(255,255,255,0.04)',   // CartesianGrid stroke
    tooltip:   'rgba(14,20,32,0.95)',       // Tooltip background
    emptyFill: 'rgba(255,255,255,0.04)',   // Donut empty arc, inactive bars
  },

  status: {
    online:   '#3ecf8e',  // ● agent active/online
    booting:  '#e6a020',  // ◐ agent executing
    offline:  '#3a4a5c',  // ○ agent idle/inactive
    active:   '#7ec8e3',  // ◈ agent selected/highlighted
    breached: '#e05c5c',  // ⬛ system paused / breach
  },

  // ── Agent identity colors — fixed, not changed by theme.
  agent: {
    'Market Intel': '#7ec8e3', // primary
    'Strategy':     '#9b7fe8', // sim
    'Execution':    '#e6a020', // warning
    'Risk':         '#e05c5c', // danger
    'Portfolio':    '#3ecf8e', // success
    'Liquidity':    '#38bdf8',   // sky blue — unique to Liquidity
    'Simulation':   '#f472b6',   // pink — unique to Simulation
  },

  // ── Tab nav agent accent colors (breadcrumb + active underline)
  tab: {
    market:    '#7ec8e3',
    strategy:  '#9b7fe8',
    execution: '#e6a020',
    risk:      '#e05c5c',
    portfolio: '#3ecf8e',
    liquidity: '#38bdf8',
  },

  // ── Breach banner (special — deliberately darker/purer red, not --red)
  breach: {
    gradStart: 'rgba(224,92,92,0.85)',
    gradEnd:   'rgba(224,92,92,0.95)',
    bg:        'linear-gradient(90deg, rgba(224,92,92,0.85) 0%, rgba(224,92,92,0.95) 100%)',
  },
} as const

export type Theme = typeof theme
