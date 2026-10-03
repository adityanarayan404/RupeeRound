import type { MerchantCategory } from '@rupeeround/shared'
import { Bus, Pill, ShoppingBag, ShoppingBasket, Store, Utensils, type LucideIcon } from 'lucide-react'

export const CATEGORY_ICONS: Record<MerchantCategory, LucideIcon> = {
  food: Utensils,
  grocery: ShoppingBasket,
  transport: Bus,
  shopping: ShoppingBag,
  health: Pill,
  other: Store,
}

/** One-tap merchants on the Pay screen. */
export const QUICK_MERCHANTS: { label: string; merchant: string; category: MerchantCategory }[] = [
  { label: 'Canteen', merchant: 'College Canteen', category: 'food' },
  { label: 'Café', merchant: 'Campus Café', category: 'food' },
  { label: 'Grocery', merchant: 'Corner Grocery', category: 'grocery' },
  { label: 'Auto', merchant: 'Auto Ride', category: 'transport' },
  { label: 'Pharmacy', merchant: 'City Pharmacy', category: 'health' },
  { label: 'Shopping', merchant: 'Fashion Store', category: 'shopping' },
]
