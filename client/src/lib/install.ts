// Captures the browser's "Add to Home Screen" prompt so Profile can offer an Install button.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function listenForInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    listeners.forEach((listener) => listener())
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((listener) => listener())
  })
}

export function canInstall(): boolean {
  return deferredPrompt !== null
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  listeners.forEach((listener) => listener())
  return outcome === 'accepted'
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}
