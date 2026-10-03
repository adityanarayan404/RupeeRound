/** Set once the user has seen the intro slides. */
export const ONBOARDED_KEY = 'rr.onboarded'

// localStorage can throw (private mode, blocked storage), so every access is guarded.
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // ignore
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}
