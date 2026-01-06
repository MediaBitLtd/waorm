import type { WaormQueryCollector } from './index'
import { Model } from './index'

export const collect = <T = typeof Model>(query: Promise<Model[]>): WaormQueryCollector<T> => ({
  delete: async () => {
    const items = await query
    let result = true

    for (const k in items) {
      if (items[k]) {
        result = (await items[k].delete()) && result
      }
    }

    return result
  },
  each: async (callback) => {
    const items = await query

    for (const k in items) {
      if (items[k]) {
        await callback(items[k] as T)
      }
    }
  },
  count: async () => {
    const items = await query

    return items.length
  },
  items: async () => {
    return await query as T[]
  },
})
