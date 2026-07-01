const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off'])

function parseBooleanFlag(raw: string | undefined, fallback: boolean) {
  if (raw == null || raw.trim() === '') return fallback
  const normalized = raw.trim().toLowerCase()
  if (TRUE_VALUES.has(normalized)) return true
  if (FALSE_VALUES.has(normalized)) return false
  return fallback
}

export const WITHOUT_DB_MODE = parseBooleanFlag(process.env.NEXT_PUBLIC_WITHOUT_DB, true)

export function isWithoutDbMode() {
  return WITHOUT_DB_MODE
}

export function isWithDbMode() {
  return !WITHOUT_DB_MODE
}
