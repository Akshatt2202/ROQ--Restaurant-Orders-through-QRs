// The table a customer scanned is only known from the QR url, so it is kept in
// sessionStorage for the rest of that browsing session (menu -> checkout).
const STORAGE_PREFIX = "qr-menu:table:"

const storageKey = (merchantId: string) => `${STORAGE_PREFIX}${merchantId}`

export const rememberTable = (merchantId: string, table?: string | null) => {
  if (typeof window === "undefined" || !merchantId) return

  const value = table?.trim()
  if (!value) return

  try {
    sessionStorage.setItem(storageKey(merchantId), value)
  } catch {
    // Private mode / storage disabled - the order simply has no table.
  }
}

export const getRememberedTable = (merchantId: string): string => {
  if (typeof window === "undefined" || !merchantId) return ""

  try {
    return sessionStorage.getItem(storageKey(merchantId)) || ""
  } catch {
    return ""
  }
}

