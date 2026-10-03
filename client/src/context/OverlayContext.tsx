import { createContext, useContext } from 'react'

/**
 * The element inside the phone frame that sheets, toasts and confetti render into,
 * so they stay inside the phone on desktop instead of covering the whole browser.
 */
export const OverlayContext = createContext<HTMLElement | null>(null)

export function useOverlayRoot(): HTMLElement | null {
  return useContext(OverlayContext)
}
