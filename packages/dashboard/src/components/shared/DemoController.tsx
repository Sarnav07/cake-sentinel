import { useState } from 'react'
import { useNexus } from '../../context/NexusContext'
import { theme } from '../../styles/theme'

const STEPS = [
  'Market Intel detecting price movement',
  'Strategy Agent generating signals',
  'Simulation validating signal',
  'Risk Management checking limits',
  'Execution Agent submitting trade',
  'Portfolio Agent recording P&L',
  'Anomaly score spiking — risk breach',
  'System paused — circuit breaker active',
  'Rearming the system',
  'Demo complete — system restored ✓',
]

export default function DemoController() {
  const { demo, realBNBPrice } = useNexus()
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [stepMsg, setStepMsg] = useState('')
  const [freqVal, setFreqVal] = useState(8)
  const [autoExec, setAutoExec] = useState(false)

  const handleDemoSequence = async () => {
    setRunning(true)
    setCurrentStep(0)
    await demo.runDemoSequence((stepNum: number, msg: string) => {
      setCurrentStep(stepNum)
      setStepMsg(msg)
    })
    setRunning(false)
    setCurrentStep(-1)
  }

  const handleAutoExec = (val: boolean) => {
    setAutoExec(val)
    demo.setAutoExecute(val)
  }

  const handleFreq = (val: number) => {
    setFreqVal(val)
    demo.setSignalFrequency(val * 1000)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          zIndex: 9999,
          background: theme.bg.panel,
          border: `1px solid ${theme.border.strong}`,
          borderRadius: '8px', padding: '8px 14px',
          color: theme.accent.primary, fontSize: '11px', fontWeight: 600,
          letterSpacing: '0.08em', cursor: 'pointer',
          boxShadow: `0 0 20px ${theme.glow.primary}`,
          fontFamily: 'monospace'
        }}
      >
        ◈ DEMO
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      zIndex: 9999, width: '280px',
      background: theme.bg.base,
      border: `1px solid ${theme.border.accent}`,
      borderRadius: '12px', padding: '16px',
      boxShadow: `0 0 40px rgba(0,0,0,0.6), 0 0 20px ${theme.glow.cardOuter}`,
      fontFamily: 'monospace'
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', 
        alignItems:'center', marginBottom:'14px' }}>
        <span style={{ color: theme.accent.primary, fontSize:'11px', 
          fontWeight:700, letterSpacing:'0.1em' }}>
          ◈ NEXUS DEMO CONTROLS
        </span>
        <button onClick={() => setOpen(false)} 
          style={{ background:'none', border:'none', 
            color: theme.text.inactive, cursor:'pointer', fontSize:'16px' }}>
          ×
        </button>
      </div>

      {/* Live BNB price indicator */}
      <div style={{ 
        background: theme.glow.cardOuter,
        border: `0.5px solid ${theme.border.faint}`,
        borderRadius:'6px', padding:'7px 10px', marginBottom:'12px',
        display:'flex', justifyContent:'space-between', alignItems:'center'
      }}>
        <span style={{ color: theme.text.inactive, fontSize:'10px' }}>
          BNB LIVE (Testnet)
        </span>
        <span style={{ 
          color: realBNBPrice ? theme.accent.primary : theme.text.inactive, 
          fontSize:'12px', fontWeight:700 
        }}>
          {realBNBPrice 
            ? `$${realBNBPrice.toFixed(2)}` 
            : 'Connecting...'}
        </span>
      </div>

      {/* Demo Sequence */}
      <button
        onClick={handleDemoSequence}
        disabled={running}
        style={{
          width: '100%', padding: '10px',
          background: running 
            ? 'rgba(245,158,11,0.1)' 
            : 'rgba(0,229,255,0.08)',
          border: `1px solid ${running ? 'rgba(245,158,11,0.4)' : theme.border.strong}`,
          borderRadius: '7px', cursor: running ? 'not-allowed' : 'pointer',
          color: running ? theme.accent.warning : theme.accent.primary,
          fontSize: '11px', fontWeight: 700,
          letterSpacing: '0.06em', marginBottom: '8px'
        }}
      >
        {running ? `▶ STEP ${currentStep}/10` : '▶ RUN DEMO SEQUENCE (60s)'}
      </button>

      {/* Step progress */}
      {running && (
        <div style={{ marginBottom:'10px' }}>
          <div style={{ display:'flex', gap:'3px', marginBottom:'5px' }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: '3px', borderRadius: '2px',
                background: i < currentStep 
                  ? theme.chart.line5
                  : i === currentStep 
                    ? theme.accent.primary 
                    : theme.bg.elevated6
              }}/>
            ))}
          </div>
          <div style={{ 
            color: theme.text.secondary, fontSize: '10px', lineHeight: 1.4 
          }}>
            {stepMsg}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', 
        gap:'6px', marginBottom:'12px' }}>
        {[
          { label: '⚡ FORCE TRADE',    action: () => demo.forceTrade(),    color: theme.accent.warning },
          { label: '💥 TRIGGER BREACH', action: () => demo.triggerBreach(), color: theme.accent.danger  },
          { label: '🔄 RESET ALL',      action: () => demo.resetAll(),      color: theme.accent.sim     },
          { label: '✓ REARM',           action: () => demo.rearm?.(),       color: theme.accent.success },
        ].map(({ label, action, color }) => (
          <button key={label} onClick={action} style={{
            padding: '7px 6px', background: theme.bg.elevated2,
            border: `0.5px solid ${theme.border.subtle}`,
            borderRadius: '6px', cursor: 'pointer',
            color: color, fontSize: '10px', fontWeight: 600
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Signal frequency */}
      <div style={{ marginBottom:'10px' }}>
        <div style={{ display:'flex', justifyContent:'space-between',
          marginBottom:'5px' }}>
          <span style={{ color: theme.text.inactive, fontSize:'10px' }}>
            Signal frequency
          </span>
          <span style={{ color: theme.text.secondary, fontSize:'10px' }}>
            {freqVal}s
          </span>
        </div>
        <input type="range" min={1} max={30} value={freqVal}
          onChange={e => handleFreq(Number(e.target.value))}
          style={{ width:'100%', accentColor: theme.accent.primary }} />
      </div>

      {/* Auto-execute toggle */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'center' }}>
        <span style={{ color: theme.text.secondary, fontSize:'10px' }}>
          Auto-execute
        </span>
        <div
          onClick={() => handleAutoExec(!autoExec)}
          style={{
            width: '36px', height: '20px', borderRadius: '10px',
            background: autoExec 
              ? 'rgba(0,255,136,0.3)' 
              : theme.bg.elevated6,
            border: `1px solid ${autoExec ? theme.accent.success : theme.border.neutral}`,
            cursor: 'pointer', position: 'relative', transition: 'all 0.2s'
          }}
        >
          <div style={{
            position: 'absolute', top: '2px',
            left: autoExec ? '18px' : '2px',
            width: '14px', height: '14px', borderRadius: '50%',
            background: autoExec ? theme.accent.success : theme.text.inactive,
            transition: 'all 0.2s'
          }}/>
        </div>
      </div>
    </div>
  )
}
