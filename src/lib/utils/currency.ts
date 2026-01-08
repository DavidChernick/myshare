// Currency utility functions

export type Currency = 'USD' | 'ZAR' | 'GBP' | 'EUR'

/**
 * Get the currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: Currency | string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    ZAR: 'R',
    GBP: '£',
    EUR: '€',
  }
  return symbols[currency] || '$'
}

/**
 * Format an amount in cents with the appropriate currency symbol
 * @param cents - Amount in cents
 * @param currency - Currency code (USD, ZAR, GBP, EUR)
 * @returns Formatted string like "R2,346.00" or "$1,234.50"
 */
export function formatAmount(cents: number, currency: Currency | string): string {
  const symbol = getCurrencySymbol(currency)
  const amount = (cents / 100).toFixed(2)

  // Add thousand separators
  const parts = amount.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return `${symbol}${parts.join('.')}`
}

/**
 * Get the currency name for display
 */
export function getCurrencyName(currency: Currency | string): string {
  const names: Record<string, string> = {
    USD: 'US Dollar',
    ZAR: 'South African Rand',
    GBP: 'British Pound',
    EUR: 'Euro',
  }
  return names[currency] || currency
}
