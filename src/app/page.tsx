'use client'

import { useEffect, useRef, useState } from 'react'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number, glucose: number, tick: number, mood: 'happy' | 'neutral' | 'sad') {
  const sky = ctx.createLinearGradient(0, 0, 0, height)
  sky.addColorStop(0, '#7dd3fc')
  sky.addColorStop(1, '#bae6fd')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, width, height)

  const groundY = height * 0.74
  ctx.fillStyle = '#4d7c0f'
  ctx.fillRect(0, groundY, width, height - groundY)

  for (let i = 0; i < 3; i += 1) {
    const x = ((tick * 0.35 + i * 140) % (width + 120)) - 120
    const y = 40 + i * 28
    ctx.fillStyle = '#ffffffcc'
    ctx.beginPath()
    ctx.arc(x + 36, y, 18, 0, Math.PI * 2)
    ctx.arc(x + 60, y + 4, 22, 0, Math.PI * 2)
    ctx.arc(x + 84, y, 18, 0, Math.PI * 2)
    ctx.fill()
  }

  for (let i = 0; i < 10; i += 1) {
    const leafX = ((tick * 1.4 + i * 45) % (width + 30)) - 30
    const leafY = ((tick * 0.7 + i * 72) % (groundY - 20))
    ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#f97316'
    ctx.fillRect(leafX, leafY, 8, 4)
    ctx.fillRect(leafX + 2, leafY + 4, 4, 12)
  }

  ctx.fillStyle = mood === 'sad' ? '#94a3b8' : '#fde047'
  ctx.beginPath()
  ctx.arc(width - 86, 80, 30, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = '18px monospace'
  ctx.fillText('GlukoBuddy', 22, 34)
  ctx.fillText(`Glukos: ${glucose.toFixed(1)} mmol/L`, 22, 60)

  const bodyX = width * 0.52
  const bodyY = groundY - 36
  const tailL = mood === 'happy' ? 32 + Math.sin(tick * 0.14) * 10 : 20

  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.ellipse(bodyX, bodyY, 44, 28, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.ellipse(bodyX - 24, bodyY - 58, 44, 42, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.ellipse(bodyX + 40 + tailL / 4, bodyY - 10, 24, 12, Math.PI / 10, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(bodyX - 28, bodyY - 72, 20, 14, 0, 0, Math.PI * 2)
  ctx.ellipse(bodyX + 14, bodyY - 72, 20, 14, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.arc(bodyX - 28, bodyY - 74, 5, 0, Math.PI * 2)
  ctx.arc(bodyX + 14, bodyY - 74, 5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#7c2d12'
  ctx.fillRect(bodyX - 18, bodyY - 56, 36, 14)
  ctx.fillRect(bodyX - 6, bodyY - 44, 12, 6)

  ctx.fillStyle = '#1f2937'
  if (mood === 'happy') {
    ctx.beginPath()
    ctx.arc(bodyX - 2, bodyY - 34, 12, 0, Math.PI, false)
    ctx.fill()
    ctx.fillStyle = '#f472b6'
    ctx.fillRect(bodyX - 10, bodyY - 30, 20, 10)
  } else if (mood === 'sad') {
    ctx.fillRect(bodyX - 12, bodyY - 36, 24, 8)
    ctx.fillStyle = '#93c5fd'
    ctx.fillRect(bodyX - 18, bodyY - 58, 6, 18)
    ctx.fillRect(bodyX + 12, bodyY - 58, 6, 18)
  } else {
    ctx.fillRect(bodyX - 10, bodyY - 38, 8, 4)
    ctx.fillRect(bodyX + 2, bodyY - 38, 8, 4)
    ctx.fillStyle = '#f97316'
    ctx.fillRect(bodyX - 8, bodyY - 28, 16, 6)
  }

  const blush = mood === 'happy' ? '#fde68a' : '#fca5a5'
  ctx.fillStyle = blush
  ctx.beginPath()
  ctx.arc(bodyX - 35, bodyY - 58, 6, 0, Math.PI * 2)
  ctx.arc(bodyX + 21, bodyY - 58, 6, 0, Math.PI * 2)
  ctx.fill()
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [glucose, setGlucose] = useState(6.2)
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [dexcomEmail, setDexcomEmail] = useState('')
  const [dexcomConnected, setDexcomConnected] = useState(false)
  const [connectionState, setConnectionState] = useState('Ingen Dexcom G7 ansluten ännu')
  const [dexcomError, setDexcomError] = useState('')
  const [manualInput, setManualInput] = useState('6.2')
  const tickRef = useRef(0)

  const getMood = () => {
    if (glucose > 10 || glucose < 4) return 'sad' as const
    if (glucose >= 4.5 && glucose <= 7.5) return 'happy' as const
    return 'neutral' as const
  }

  const getStatus = () => {
    if (glucose > 10) return { text: 'Hög nivå', emoji: '😟', color: 'text-red-500' }
    if (glucose < 4) return { text: 'Låg nivå', emoji: '😢', color: 'text-red-500' }
    if (glucose >= 4.5 && glucose <= 7.5) return { text: 'Perfekt zon', emoji: '🐾', color: 'text-emerald-400' }
    return { text: 'På gränsen', emoji: '😐', color: 'text-amber-400' }
  }

  const updateGlucose = () => {
    const nextValue = clamp(Math.random() * 9 + 3, 2.5, 13.5)
    const rounded = Math.round(nextValue * 10) / 10
    setGlucose(rounded)
    setManualInput(`${rounded}`)
  }

  const simulateValue = () => {
    setIsSimulating(true)
    updateGlucose()
    setTimeout(() => setIsSimulating(false), 1000)
  }

  const applyManualValue = () => {
    const parsed = parseFloat(manualInput.replace(',', '.'))
    if (!Number.isFinite(parsed)) return
    setGlucose(clamp(Math.round(parsed * 10) / 10, 2, 15))
  }

  const handleLogin = () => {
    if (password === 'follower123') {
      setIsLoggedIn(true)
    } else {
      alert('Fel lösenord. Prova follower123')
    }
  }

  const connectDexcom = () => {
    if (!dexcomEmail.trim()) {
      setDexcomError('Fyll i e-post för Dexcom.')
      return
    }

    setDexcomError('')
    setConnectionState('Loggar in mot Dexcom G7...')

    // Simulera lyckad anslutning efter kort tid
    setTimeout(() => {
      setDexcomConnected(true)
      setConnectionState(`Dexcom G7 ansluten som ${dexcomEmail}`)
    }, 500) // Snabbare
  }

  useEffect(() => {
    if (!isLoggedIn) return
    const interval = setInterval(updateGlucose, 120000)
    return () => clearInterval(interval)
  }, [isLoggedIn])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frame = 0
    let animationId: number
    const render = () => {
      frame += 1
      tickRef.current = frame
      drawScene(ctx, canvas.width, canvas.height, glucose, frame, getMood())
      animationId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationId)
  }, [glucose])

  const status = getStatus()

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-700 bg-slate-950/95 p-8 shadow-2xl shadow-slate-950/40">
          <h1 className="text-4xl font-black mb-4">GlukoBuddy</h1>
          <p className="mb-6 text-slate-400">Logga in som följare med lösenordet <span className="font-semibold text-white">follower123</span>.</p>
          <label className="block text-sm uppercase tracking-[0.3em] text-slate-500 mb-2">Lösenord</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
          <button onClick={handleLogin} className="mt-6 w-full rounded-3xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400">
            Logga in
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-cyan-950 text-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 shadow-2xl shadow-cyan-900/20 backdrop-blur-xl">
          <h1 className="text-5xl font-black tracking-tight text-cyan-200">GlukoBuddy</h1>
          <p className="mt-3 max-w-2xl text-slate-300">Din Tamagotchi Chow Chow. Appen är byggd för att visualisera glukosintervall med en pixel-hund som blir glad, neutral eller ledsen.</p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
            <canvas ref={canvasRef} width={640} height={420} className="w-full rounded-[2rem] border border-slate-800 bg-slate-900" />
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Glukosstatus</p>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-6xl font-black text-cyan-300">{glucose.toFixed(1)}</p>
                  <p className="text-slate-400">mmol/L</p>
                </div>
                <div className="rounded-3xl bg-slate-900/90 px-4 py-3 text-sm font-semibold text-slate-100 shadow-inner shadow-slate-900/40">
                  <p className={status.color}>{status.text} {status.emoji}</p>
                </div>
              </div>
              <p className="mt-4 text-slate-400">Valpen är {getMood() === 'happy' ? 'glad och viftar på svansen' : getMood() === 'sad' ? 'ledsen och orolig' : 'neutral och lugn'}.</p>
            </div>

            <div className="rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
              <button onClick={updateGlucose} className="w-full rounded-3xl bg-emerald-500 px-4 py-3 text-slate-950 font-semibold transition hover:bg-emerald-400">Uppdatera värde</button>
              <button onClick={simulateValue} disabled={isSimulating} className="mt-4 w-full rounded-3xl bg-violet-500 px-4 py-3 text-slate-950 font-semibold transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60">
                {isSimulating ? 'Simulerar...' : 'Simulera värde'}
              </button>
              <div className="mt-5 rounded-3xl bg-slate-900/90 p-4">
                <label className="text-sm uppercase tracking-[0.3em] text-slate-400">Manuell glukos</label>
                <div className="mt-3 flex gap-3">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                  />
                  <button onClick={applyManualValue} className="rounded-3xl bg-slate-700 px-4 py-3 text-white transition hover:bg-slate-600">Använd</button>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-700/60 bg-slate-950/90 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Dexcom G7</p>
              <p className="mt-3 text-slate-300">Logga in med Dexcom-e-post och lösenord här. Backend krävs för riktig anslutning, men denna version visar login-fälten direkt.</p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">E-post</label>
                  <input
                    type="email"
                    value={dexcomEmail}
                    onChange={(e) => setDexcomEmail(e.target.value)}
                    className="w-full rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-400"
                    placeholder="exempel@mail.com"
                  />
                </div>
                {dexcomError && <p className="text-sm text-red-400">{dexcomError}</p>}
                <button onClick={connectDexcom} className="w-full rounded-3xl bg-amber-400 px-4 py-3 text-slate-950 font-semibold transition hover:bg-amber-300">Logga in Dexcom G7</button>
              </div>
              <p className="mt-3 text-slate-300">{connectionState}</p>
              {dexcomConnected && <p className="mt-2 text-sm text-emerald-400">Dexcom-inloggning aktiverad.</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
