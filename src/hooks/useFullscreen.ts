import { useCallback, useEffect, useRef, useState } from 'react'

// screen.orientation.lock is not consistently typed across TS lib versions
interface ScreenOrientationWithLock extends Omit<ScreenOrientation, 'lock'> {
  lock?: (orientation: string) => Promise<void>
}

function triggerResize() {
  // Give browser time to settle then tell Phaser to rescale
  setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
  setTimeout(() => window.dispatchEvent(new Event('resize')), 400)
}

export function useFullscreen() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      triggerResize()
    }

    const handleOrientationChange = () => {
      triggerResize()
    }

    document.addEventListener('fullscreenchange', handleChange)
    window.addEventListener('orientationchange', handleOrientationChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  const enter = useCallback(async () => {
    const el = containerRef.current
    if (!el || document.fullscreenElement) return

    try {
      await el.requestFullscreen({ navigationUI: 'hide' })

      // Request landscape on mobile devices that support the Screen Orientation API
      const orientation = screen.orientation as ScreenOrientationWithLock
      if (orientation?.lock) {
        await orientation.lock('landscape').catch(() => { /* not available on this device */ })
        triggerResize()
      }
    } catch {
      // Fullscreen was denied (e.g. permissions policy)
    }
  }, [])

  const exit = useCallback(async () => {
    if (!document.fullscreenElement) return
    try {
      await document.exitFullscreen()
      // Unlock orientation so device can go back to portrait
      const orientation = screen.orientation as ScreenOrientationWithLock
      if (orientation?.unlock) {
        orientation.unlock()
      }
    } catch {
      // ignore
    }
  }, [])

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      exit()
    } else {
      enter()
    }
  }, [enter, exit])

  return { containerRef, isFullscreen, toggle }
}
