import { useCallback, useEffect, useRef, useState } from 'react'

export function useFullscreen() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  const enter = useCallback(async () => {
    const el = containerRef.current
    if (!el || document.fullscreenElement) return

    try {
      await el.requestFullscreen({ navigationUI: 'hide' })

      // Request landscape on mobile devices that support the Screen Orientation API
      const orientation = (screen as ScreenOrientationExtended).orientation
      if (orientation?.lock) {
        await orientation.lock('landscape').catch(() => {/* not available on this device */})
      }
    } catch {
      // Fullscreen was denied (e.g. permissions policy)
    }
  }, [])

  const exit = useCallback(async () => {
    if (!document.fullscreenElement) return
    try {
      await document.exitFullscreen()
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

// Screen Orientation lock is not in the standard TS lib yet
interface ScreenOrientationExtended extends ScreenOrientation {
  lock?: (orientation: OrientationLockType) => Promise<void>
}
