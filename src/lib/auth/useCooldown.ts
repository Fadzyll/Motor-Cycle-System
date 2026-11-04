import { useEffect, useState } from 'react'

/** Seconds left before an action (e.g. "resend code") can be used again. */
export function useCooldown(): [number, (seconds: number) => void] {
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (until <= now) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [until, now])
  const left = Math.max(0, Math.ceil((until - now) / 1000))
  return [
    left,
    (seconds) => {
      setNow(Date.now())
      setUntil(Date.now() + seconds * 1000)
    },
  ]
}
