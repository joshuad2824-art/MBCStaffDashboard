/** Supabase stores session tokens here, never a person's password.
 * New devices use tab storage until the person chooses to stay signed in.
 * Existing remembered sessions survive the upgrade. */
export interface SessionStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const PREFERENCE = 'mbc.auth.remember-device'

export function createDeviceStorage(local: SessionStorage, tab: SessionStorage, sessionKey: string) {
  const memory = new Map<string, string>()
  const keys = new Set([sessionKey, sessionKey + '-code-verifier'])
  let notice: string | null = null
  const read = (storage: SessionStorage, key: string) => {
    try { return storage.getItem(key) } catch { return null }
  }
  const remove = (storage: SessionStorage, key: string) => {
    try { storage.removeItem(key) } catch { /* Nothing was stored here. */ }
  }
  let remember = read(local, PREFERENCE) === 'true' ||
    (read(local, PREFERENCE) === null && read(local, sessionKey) !== null)
  const syncChoice = () => {
    const choice = read(local, PREFERENCE)
    if (choice === 'true' || choice === 'false') remember = choice === 'true'
    return remember
  }

  const storage: SessionStorage = {
    getItem(key) {
      syncChoice()
      keys.add(key)
      return read(remember ? local : tab, key) ?? memory.get(key) ?? null
    },
    setItem(key, value) {
      syncChoice()
      keys.add(key)
      memory.set(key, value)
      try {
        ;(remember ? local : tab).setItem(key, value)
        remove(remember ? tab : local, key)
      } catch {
        notice = remember
          ? 'You can sign in, but this browser could not remember the device. Allow site storage to stay signed in.'
          : 'This browser could not save the session. You may need to sign in again after a reload.'
      }
    },
    removeItem(key) {
      memory.delete(key)
      remove(local, key)
      remove(tab, key)
    },
  }

  return {
    storage,
    isRemembered: syncChoice,
    notice: () => notice,
    choose(value: boolean) {
      const saved = new Map([...keys].map(key => [key, storage.getItem(key)]))
      remember = value
      notice = null
      try {
        local.setItem(PREFERENCE, String(value))
        if (value) {
          const probe = PREFERENCE + '.probe'
          local.setItem(probe, '1')
          local.removeItem(probe)
        }
      } catch {
        if (value) notice = 'This browser could not remember the device. You can still sign in for this visit.'
      }
      for (const [key, data] of saved) {
        storage.removeItem(key)
        if (data !== null) storage.setItem(key, data)
      }
      return notice
    },
    clear() {
      for (const key of keys) storage.removeItem(key)
      remember = false
      remove(local, PREFERENCE)
      notice = null
    },
  }
}

function browserStorage(kind: 'localStorage' | 'sessionStorage'): SessionStorage {
  return {
    getItem: key => window[kind].getItem(key),
    setItem: (key, value) => window[kind].setItem(key, value),
    removeItem: key => window[kind].removeItem(key),
  }
}

export function browserDeviceStorage(sessionKey: string) {
  return createDeviceStorage(browserStorage('localStorage'), browserStorage('sessionStorage'), sessionKey)
}
