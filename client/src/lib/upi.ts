import { MAX_PAYMENT_PAISE, parseRupeesInput } from '@rupeeround/shared'

/** What a shop's UPI QR tells us. Amount is only present on "dynamic" QRs. */
export interface ScannedPayment {
  payeeName: string
  upiId: string
  amountPaise: number | null
}

/**
 * Reads a UPI payment QR, e.g.
 *   upi://pay?pa=sharma.kirana@okhdfcbank&pn=Sharma%20Kirana&am=34.00&cu=INR
 * Returns null if the QR isn't a UPI payment code.
 */
export function parseUpiQr(text: string): ScannedPayment | null {
  const trimmed = text.trim()
  if (!/^upi:\/\/pay\?/i.test(trimmed)) return null

  const params = new URLSearchParams(trimmed.slice(trimmed.indexOf('?') + 1))
  const upiId = params.get('pa')?.trim() ?? ''
  if (!/^[\w.-]+@[\w.-]+$/.test(upiId)) return null

  const payeeName = (params.get('pn') ?? '').trim().slice(0, 40) || upiId.split('@')[0]!
  const amount = params.get('am') ? parseRupeesInput(params.get('am')!) : null
  return {
    payeeName,
    upiId,
    amountPaise: amount && amount > 0 && amount <= MAX_PAYMENT_PAISE ? amount : null,
  }
}

/** A few made-up shops for demos on laptops without a camera or a QR to hand. */
const DEMO_SHOPS = [
  { name: 'Sharma Kirana Store', id: 'sharma.kirana@demo', amount: '34' },
  { name: 'Chai Point Corner', id: 'chaipoint.corner@demo', amount: '27' },
  { name: 'Campus Book Depot', id: 'bookdepot.campus@demo', amount: '148' },
  { name: 'City Medicos', id: 'citymedicos@demo', amount: '263.50' },
]

export function demoUpiQr(): string {
  const shop = DEMO_SHOPS[Math.floor(Math.random() * DEMO_SHOPS.length)]!
  return `upi://pay?pa=${shop.id}&pn=${encodeURIComponent(shop.name)}&am=${shop.amount}&cu=INR`
}
