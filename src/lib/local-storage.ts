type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function getBrowserStorage(): StorageAdapter | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Safe JSON-backed access to the browser's local storage. */
export class LocalStorageService {
  constructor(private readonly storage: StorageAdapter | null = getBrowserStorage()) {}

  get<T>(key: string, fallback: T): T {
    try {
      const value = this.storage?.getItem(key)
      return value === null || value === undefined ? fallback : (JSON.parse(value) as T)
    } catch {
      return fallback
    }
  }

  set<T>(key: string, value: T) {
    try {
      this.storage?.setItem(key, JSON.stringify(value))
    } catch {
      // Storage can be unavailable in private browsing or when its quota is full.
    }
  }

  remove(key: string) {
    try {
      this.storage?.removeItem(key)
    } catch {
      // Keep the application usable when browser storage is unavailable.
    }
  }
}

export const localStorageService = new LocalStorageService()
