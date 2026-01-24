import Store from 'electron-store'
import { HISTORY_RETENTION_DAYS } from '../shared/constants'
import { HistoryItem } from '../shared/types'

interface HistorySchema {
  items: HistoryItem[]
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export class HistoryManager {
  private store: Store<HistorySchema>

  constructor() {
    this.store = new Store<HistorySchema>({
      name: 'voice-key-history',
      defaults: {
        items: [],
      },
    })
  }

  getAll(): HistoryItem[] {
    return this.pruneOldItems(this.store.get('items', []))
  }

  add(item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
    const items = this.store.get('items', [])
    const newItem: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...item,
    }

    items.unshift(newItem)
    const prunedItems = this.pruneOldItems(items, false)
    this.store.set('items', prunedItems)
    return newItem
  }

  delete(id: string): boolean {
    const items = this.getAll()
    const filteredItems = items.filter((item) => item.id !== id)

    if (filteredItems.length === items.length) {
      return false
    }

    this.store.set('items', filteredItems)
    return true
  }

  clear(): void {
    this.store.set('items', [])
  }

  getCount(): number {
    return this.getAll().length
  }

  private pruneOldItems(items: HistoryItem[], persist = true): HistoryItem[] {
    if (HISTORY_RETENTION_DAYS <= 0) {
      return items
    }

    const cutoff = Date.now() - HISTORY_RETENTION_DAYS * MS_PER_DAY
    const filteredItems = items.filter((item) => item.timestamp >= cutoff)

    if (persist && filteredItems.length !== items.length) {
      this.store.set('items', filteredItems)
    }

    return filteredItems
  }
}

export const historyManager = new HistoryManager()
