'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [glucose, setGlucose] = useState(6.2)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [password, setPassword] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)

  const updateGlucose = () => {
    // Mock update from Dexcom
    // In real app, call API
    const newValue = Math.random() * 10 + 3 // 3-13 mmol/L
    setGlucose(Math.round(newValue * 10) / 10)
  }

  const simulateValue = () => {
    setIsSimulating(true)
    updateGlucose()
    setTimeout(() => setIsSimulating(false), 1000)
  }

  const handleLogin = () => {
    // Simple password check, in real app use proper auth
    if (password === 'follower123') {
      setIsLoggedIn(true)
    } else {
      alert('Fel lösenord')
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      const interval = setInterval(updateGlucose, 120000) // 2 min
      return () => clearInterval(interval)
    }
  }, [isLoggedIn])

  const getStatus = () => {
    if (glucose >= 4.5 && glucose <= 7.5) return { text: 'Perfekt zon', emoji: '🐾', color: 'text-green-600' }
    if (glucose < 4 || glucose > 10) return { text: 'Farlig zon', emoji: '😟', color: 'text-red-600' }
    return { text: 'Hög/låg', emoji: '😐', color: 'text-yellow-600' }
  }

  const status = getStatus()

  if (!isLoggedIn) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">GlukoBuddy</h1>
        <p className="mb-4">Ange lösenord för att följa:</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 mb-4"
          placeholder="Lösenord"
        />
        <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded">
          Logga in
        </button>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">GlukoBuddy</h1>
      <h2 className="text-2xl mb-4">Din Tamagotchi Chow Chow</h2>
      
      <div className="text-center mb-8">
        <p className="text-lg">Glukos (mmol/L)</p>
        <p className="text-6xl font-bold">{glucose}</p>
        <p className={`text-xl ${status.color}`}>{status.text}! {status.emoji}</p>
        <p className="text-sm mt-2">Valpen är {glucose >= 4.5 && glucose <= 7.5 ? 'jätteglad och viftar på svansen' : 'orolig'}</p>
      </div>

      <div className="flex gap-4 mb-8">
        <button onClick={updateGlucose} className="bg-green-500 text-white px-4 py-2 rounded">
          Uppdatera
        </button>
        <button onClick={simulateValue} disabled={isSimulating} className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50">
          {isSimulating ? 'Simulerar...' : 'Simulera värde'}
        </button>
      </div>

      <div className="text-center">
        <button className="bg-red-500 text-white px-4 py-2 rounded">
          Koppla Dexcom G7
        </button>
        <p className="text-sm mt-2 text-gray-600">Kunde inte koppla (kör backend? se README)</p>
      </div>
    </main>
  )
}