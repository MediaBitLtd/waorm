import type {
  Resource,
  WaormConnectionPlugin,
  WaormDatabaseConfig,
  WaormDatabaseConnection,
  WaormStore
} from '../index'

interface CursorRequestEventTarget extends EventTarget{
  result: IDBCursorWithValue
}

interface CursorRequestEvent extends Event {
  target: CursorRequestEventTarget;
}

const handleRequest = async <T = any>(request: IDBRequest, callback?: (e: CursorRequestEvent) => boolean) => new Promise<T>(async (resolve, reject) => {
  let resolved = false
  let attempts = 0

  request.onerror = () => {
    resolved = false
    reject(request.error)
  }

  request.onsuccess = e => {
    if (callback && ! callback(e as CursorRequestEvent)) {
      return
    }
    resolved = true
    resolve(request.result as T)
  }

  // Waiting for a second max
  while(! resolved && attempts++ < 100) {
    await (() => new Promise<void>((resolveWait) => {
      setTimeout(() => resolveWait(), 10)
    }))()
  }

  if (! resolved) {
    throw new Error('Database request timed out')
  }
})

const createStore = (database: IDBDatabase, store: WaormStore) => {
  if (database.objectStoreNames.contains(store.name)) {
    return
  }

  const dbStore = database.createObjectStore(store.name)
  store.indexes.forEach(({ name, path, unique }) =>
    // @ts-ignore
    dbStore.createIndex(name, path || name, { unique }))
}

const createDatabaseConnection = (config: WaormDatabaseConfig<IDBDatabase>, idb: IDBDatabase): WaormDatabaseConnection<IDBDatabase> => {
  return {
    name: idb.name,
    config,
    getEngine: () => idb,
    get: async (store, key) => {
      return await handleRequest<Resource|undefined>(idb
        .transaction(store, 'readonly')
        .objectStore(store)
        .get(key))
    },
    set: async (store, key, data) => {
      await handleRequest<Resource|undefined>(idb
        .transaction(store, 'readwrite')
        .objectStore(store)
        .put(data, key))

      return data
    },
    where: async (store, index, search, options) => {
      const limit = options?.limit
      const offset = options?.offset || 0
      const operator = options?.operator || 'equals'
      const direction = options?.direction || 'asc'
      const items: Resource[] = []

      let idbDirection: IDBCursorDirection = 'next'
      let range: IDBKeyRange | undefined
      let hasAdvanced = false

      switch (direction) {
        case 'asc': idbDirection = 'next'; break
        case 'desc': idbDirection = 'prev'; break
      }

      switch (operator) {
        case 'equals': range = IDBKeyRange.only(search); break
      }

      await handleRequest<IDBCursorWithValue>(idb
        .transaction(store, 'readonly')
        .objectStore(store)
        .index(index)
        .openCursor(range, idbDirection),
      e => {
          const cursor = e.target.result

          if (cursor) {
            if (! hasAdvanced) {
              hasAdvanced = true

              if (offset) {
                cursor.advance(offset)
                return false
              }
            }

            if (limit && items.length >= limit) {
              // stop iterating
              return true
            }

            switch (operator) {
              case 'equals':
                items.push(cursor.value)
                break
              case 'not_equals':
                if (cursor.value[index].toString() !== search) {
                  items.push(cursor.value)
                }
                break
              case 'includes':
                if (cursor.value[index].toString().includes(search)) {
                  items.push(cursor.value)
                }
                break
              case 'not_includes':
                if (! cursor.value[index].toString().includes(search)) {
                  items.push(cursor.value)
                }
                break
            }

            cursor.continue()
            return false
          }

          // we are done looping :)
          return true
        })

      if (operator === 'equals') {
        return items[0]
      }

      return items
    },
    all: async (store, index, options) => {
      const limit = options?.limit
      const offset = options?.offset || 0
      const direction = options?.direction || 'asc'
      const items: Resource[] = []
      const idbDirection: IDBCursorDirection = direction === 'asc' ? 'next' : 'prev'

      let hasAdvanced = false

      const transaction = index
        ? idb.transaction(store, 'readonly')
          .objectStore(store)
          .index(index)
        : idb.transaction(store, 'readonly')
          .objectStore(store)

      await handleRequest<IDBCursorWithValue>(
        transaction.openCursor(undefined, idbDirection),
        e => {
          const cursor = e.target.result

          if (cursor) {
            if (! hasAdvanced) {
              hasAdvanced = true

              if (offset) {
                cursor.advance(offset)
                return false
              }
            }

            if (limit && items.length >= limit) {
              // stop iterating
              return true
            }

            items.push(cursor.value)

            cursor.continue()
            return false
          }

          // we are done looping :)
          return true
        })

      return items
    }
  }
}

const plugin: WaormConnectionPlugin<IDBDatabase> = {
  setup: async (config) => {
    const openRequest = indexedDB.open(config.name, config.version)

    openRequest.onblocked = () => {
      // todo this
    }

    openRequest.onupgradeneeded = () => {
      const idb = openRequest.result

      config.stores.forEach(store => {
        createStore(idb, store)
      })
    }

    const idb = await handleRequest(openRequest)

    return createDatabaseConnection(config, idb)
  }
}

export default plugin;
