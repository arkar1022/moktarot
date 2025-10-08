export function digitsOnly(input: string): string {
  return (input || '').replace(/\D+/g, '')
}

// Normalize phone input: 
// - code: keep digits only (e.g., '+95' -> '95')
// - number: keep digits only and remove a single leading '0' if present
export function normalizePhone(codeRaw: string, numberRaw: string): { code: string; number: string } {
  const code = digitsOnly(codeRaw)
  let number = digitsOnly(numberRaw)
  if (number.startsWith('0')) number = number.slice(1)
  return { code, number }
}

