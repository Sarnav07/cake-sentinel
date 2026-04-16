import { useState } from 'react'
import { useNexus } from '../../context/NexusContext'

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
          background: 'rgba(13, 18, 30, 0.95)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: '8px', padding: '8px 14px',
          color: '#00e5ff', fontSize: '11px', fontWeight: 600,
          letterSpacing: '0.08em', cursor: 'pointer',
          boxShadow: '0 0 20px rgba(0,229,255,0.1)',
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
      background: 'rgba(8, 11, 18, 0.98)',
      border: '1px solid rgba(0, 229, 255, 0.25)',
      borderRadius: '12px', padding: '16px',
      boxShadow: '0 0 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,229,255,0.05)',
      fontFamily: 'monospace'
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', 
        alignItems:'center', marginBottom:'14px' }}>
        <span style={{ color:'#00e5ff', fontSize:'11px', 
          fontWeight:700, letterSpacing:'0.1em' }}>
          ◈ NEXUS DEMO CONTROLS
        </span>
        <button onClick={() => setOpen(false)} 
          style={{ background:'none', border:'none', 
            color:'#3d4558', cursor:'pointer', fontSize:'16px' }}>
          ×
        </button>
      </div>

      {/* Live BNB price indicator */}
      <div style={{ 
        background:'rgba(0,229,255,0.06)', 
        border:'0.5px solid rgba(0,229,255,0.15)',
        borderRadius:'6px', padding:'7px 10px', marginBottom:'12px',
        display:'flex', justifyContent:'space-between', alignItems:'center'
      }}>
        <span style={{ color:'#3d4558', fontSize:'10px' }}>
          BNB LIVE (Testnet)
        </span>
        <span style={{ 
          color: realBNBPrice ? '#00e5ff' : '#3d4558', 
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
          border: `1px solid ${running ? 'rgba(245,158,11,0.4)' : 'rgba(0,229,255,0.3)'}`,
          borderRadius: '7px', cursor: running ? 'not-allowed' : 'pointer',
          color: running ? '#f59e0b' : '#00e5ff',
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
                  ? '#00ff88' 
                  : i === currentStep 
                    ? '#00e5ff' 
                    : 'rgba(255,255,255,0.08)'
              }}/>
            ))}
          </div>
          <div style={{ 
            color: '#7a8499', fontSize: '10px', lineHeight: 1.4 
          }}>
            {stepMsg}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', 
        gap:'6px', marginBottom:'12px' }}>
        {[
          { label: '⚡ FORCE TRADE',    action: () => demo.forceTrade(),
            color: '#f59e0b' },
          { label: '💥 TRIGGER BREACH', action: () => demo.triggerBreach(),
            color: '#ff4444' },
          { label: '🔄 RESET ALL',      action: () => demo.resetAll(),
            color: '#a855f7' },
          { label: '✓ REARM',           action: () => demo.rearm?.(),
            color: '#00ff88' },
        ].map(({ label, action, color }) => (
          <button key={label} onClick={action} style={{
            padding: '7px 6px', background: 'rgba(255,255,255,0.03)',
            border: `0.5px solid rgba(255,255,255,0.1)`,
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
          <span style={{ color:'#3d4558', fontSize:'10px' }}>
            Signal frequency
          </span>
          <span style={{ color:'#7a8499', fontSize:'10px' }}>
            {freqVal}s
          </span>
        </div>
        <input type="range" min={1} max={30} value={freqVal}
          onChange={e => handleFreq(Number(e.target.value))}
          style={{ width:'100%', accentColor:'#00e5ff' }} />
      </div>

      {/* Auto-execute toggle */}
      <div style={{ display:'flex', justifyContent:'space-between',
        alignItems:'center' }}>
        <span style={{ color:'#7a8499', fontSize:'10px' }}>
          Auto-execute
        </span>
        <div
          onClick={() => handleAutoExec(!autoExec)}
          style={{
            width: '36px', height: '20px', borderRadius: '10px',
            background: autoExec 
              ? 'rgba(0,255,136,0.3)' 
              : 'rgba(255,255,255,0.08)',
            border: `1px solid ${autoExec ? '#00ff88' : 'rgba(255,255,255,0.15)'}`,
            cursor: 'pointer', position: 'relative', transition: 'all 0.2s'
          }}
        >
          <div style={{
            position: 'absolute', top: '2px',
            left: autoExec ? '18px' : '2px',
            width: '14px', height: '14px', borderRadius: '50%',
            background: autoExec ? '#00ff88' : '#3d4558',
            transition: 'all 0.2s'
          }}/>
        </div>
      </div>
    </div>
  )
}
