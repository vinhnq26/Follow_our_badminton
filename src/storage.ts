import { initialMembers } from './data'
import type { Match, Member } from './types'

export const MATCHES_KEY = 'foflo-matches-v2'
export const MEMBERS_KEY = 'foflo-members-v1'
export const MIGRATION_KEY = 'foflo-storage-migrated-v2'
const LEGACY_MATCHES_KEY = 'foflo-matches-v1'

export const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

export const writeJson = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* localStorage can be unavailable in private browsing */ }
}

export const loadMatches = (): Match[] => {
  const migrated = localStorage.getItem(MIGRATION_KEY)
  if (!migrated) {
    localStorage.removeItem(LEGACY_MATCHES_KEY)
    writeJson(MATCHES_KEY, [])
    localStorage.setItem(MIGRATION_KEY, '1')
    return []
  }
  return readJson<Match[]>(MATCHES_KEY, [])
}

export const loadMembers = (): Member[] => readJson<Member[]>(MEMBERS_KEY, initialMembers)
