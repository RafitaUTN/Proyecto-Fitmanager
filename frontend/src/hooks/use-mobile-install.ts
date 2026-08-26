import { useEffect, useMemo, useState } from 'react'

type MobilePlatform = 'android' | 'ios' | 'desktop'

type InstallOutcome = 'accepted' | 'dismissed'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: InstallOutcome; platform: string }>
  prompt: () => Promise<void>
}

function isIosUserAgent(userAgent: string) {
  return /iphone|ipad|ipod/i.test(userAgent)
}

function isAndroidUserAgent(userAgent: string) {
  return /android/i.test(userAgent)
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

/**
 * Detecta la plataforma móvil y conserva el evento nativo de instalación PWA.
 *
 * @returns Estado del dispositivo, disponibilidad del prompt e instalador seguro para la landing.
 */
export function useMobileInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsStandalone(isStandaloneMode())

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const platform = useMemo<MobilePlatform>(() => {
    if (typeof navigator === 'undefined') return 'desktop'
    const userAgent = navigator.userAgent
    if (isAndroidUserAgent(userAgent)) return 'android'
    if (isIosUserAgent(userAgent)) return 'ios'
    return 'desktop'
  }, [])

  const installPwa = async () => {
    if (!deferredPrompt) return null

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return choice.outcome
  }

  return {
    platform,
    canInstallPwa: Boolean(deferredPrompt),
    isStandalone,
    installPwa,
  }
}
