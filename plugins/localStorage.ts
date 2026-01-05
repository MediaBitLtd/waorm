import type { Resource, WaormConnectionPlugin, WaormDatabaseConfig, WaormDatabaseConnection } from '../index'

const getByKey = (db: string, store: string, key?: string): Resource|undefined => {
  if (! key) {
    return undefined
  }

  const data = localStorage.getItem(`WAORM:${db}_${store}:${key.toString()}`)

  return data ? JSON.parse(data) as Resource : undefined
}

const createDB = (config: WaormDatabaseConfig<WindowLocalStorage>): WaormDatabaseConnection<WindowLocalStorage> => {
  config.stores.forEach(store => {
    const indexTable = JSON.parse(localStorage.getItem(`WAORM:__${config.name}_${store.name}`) || '{}')

    store.indexes.forEach(index => {
      indexTable[index.name] = {
        ...indexTable[index.name],
        ...index,
        key: index.path || index.name,
        table: `__${config.name}_${store.name}_${index.name}`
      }
    })

    indexTable['__keys'] = []

    localStorage.setItem(`WAORM:__${config.name}_${store.name}`, JSON.stringify(indexTable))
  })

  return {
    name: config.name,
    config,
    get: async (store, key) => getByKey(config.name, store, key.toString()),
    set: async (store, key, data) => {
      const storeConfig = config.stores.find(s => s.name === store)
      if (! storeConfig) {
        throw new Error('Invalid store')
      }

      const indexTable = JSON.parse(localStorage.getItem(`WAORM:__${config.name}_${store}`) || '{}')

      storeConfig.indexes.forEach(index => {
        const indexConfig = indexTable[index.name]
        const value = (data as any)[indexConfig.key]?.toString()

        if (! value) {
          return
        }

        const values = JSON.parse(localStorage.getItem(`WAORM:__${config.name}_${store}_${index.name}`) || '{}')
        for (const k in values) {
          if (values[k] && values[k].includes(key)) {
            values[k].splice(values[k].indexOf(key), 1)
          }
        }

        if (! values[value]) {
          values[value] = []
        }
        values[value].push(key)

        localStorage.setItem(`WAORM:__${config.name}_${store}_${index.name}`, JSON.stringify(values))
      })

      if (! indexTable.__keys.includes(key)) {
        indexTable.__keys.push(key)
        indexTable.__keys.sort()
        localStorage.setItem(`WAORM:__${config.name}_${store}`, JSON.stringify(indexTable))
      }

      localStorage.setItem(`WAORM:${config.name}_${store}:${key.toString()}`, JSON.stringify(data))

      return data
    },
    where:  async (store, index, search, options) => {
      const limit = options?.limit
      const offset = options?.offset || 0
      const operator = options?.operator || 'equals'
      const direction = options?.direction || 'asc'
      const items: Resource[] = []
      let i = 0;

      const indexValues = JSON.parse(localStorage.getItem(`WAORM:__${config.name}_${store}_${index}`) || '{}')

      if (direction !== 'asc') {
        indexValues.reverse()
      }

      switch (operator) {
        case 'equals': return getByKey(config.name, store, indexValues[search] ? indexValues[search][0] : undefined)
        case 'equals_many':
          for (const k in indexValues) {
            if (i++ < offset) {
              continue
            }

            if (k.toString().toLowerCase() === search.toString().toLowerCase()) {
              indexValues[k].forEach((idKey: string | number) => {
                const resource = getByKey(config.name, store, idKey.toString())

                if (limit && items.length >= limit) {
                  return
                }

                if (resource) {
                  items.push(resource)
                }
              })

              if (limit && items.length >= limit) {
                return items
              }
            }
          }

          return items
        case 'not_equals':
          for (const k in indexValues) {
            if (i++ < offset) {
              continue
            }

            if (k.toString().toLowerCase() !== search.toString().toLowerCase()) {
              indexValues[k].forEach((idKey: string | number) => {
                const resource = getByKey(config.name, store, idKey.toString())

                if (limit && items.length >= limit) {
                  return
                }

                if (resource) {
                  items.push(resource)
                }
              })
            }

            if (limit && items.length >= limit) {
              return items
            }
          }

          return items
        case 'includes':
          for (const k in indexValues) {
            if (i++ < offset) {
              continue
            }

            if (k.toString().toLowerCase().includes(search.toString().toLowerCase())) {
              indexValues[k].forEach((idKey: string | number) => {
                const resource = getByKey(config.name, store, idKey.toString())

                if (limit && items.length >= limit) {
                  return
                }

                if (resource) {
                  items.push(resource)
                }
              })
            }

            if (limit && items.length >= limit) {
              return items
            }
          }

          return items
        case 'not_includes':
          for (const k in indexValues) {
            if (i++ < offset) {
              continue
            }

            if (! k.toString().toLowerCase().includes(search.toString().toLowerCase())) {
              indexValues[k].forEach((idKey: string | number) => {
                const resource = getByKey(config.name, store, idKey.toString())

                if (limit && items.length >= limit) {
                  return
                }

                if (resource) {
                  items.push(resource)
                }
              })
            }

            if (limit && items.length >= limit) {
              return items
            }
          }

          return items
      }
    },
    all: async (store, index = undefined, options = {}) => {
      const limit = options?.limit
      const offset = options?.offset || 0
      const direction = options?.direction || 'asc'

      const items: Resource[] = []
      let i = 0;

      const bag = index
        ? JSON.parse(localStorage.getItem(`WAORM:__${config.name}_${store}_${index}`) || '{}')
        : JSON.parse(localStorage.getItem(`WAORM:__${config.name}_${store}`) || '{}')
      const values = []

      if (index) {
        const orderedBag = Object.keys(bag).sort().reduce((newBag: any, key) => {
          newBag[key] = bag[key]
          return newBag
        }, {})

        for (const k in orderedBag) {
          if (bag[k] && Array.isArray(bag[k])) {
            values.push(...bag[k])
          }
        }
      } else {
        values.push(...bag.__keys)
      }

      if (direction !== 'asc') {
        values.reverse()
      }

      values.forEach(key => {
        if (i++ < offset) {
          return
        }

        if (limit && items.length >= limit) {
          return
        }

        const resource = getByKey(config.name, store, key.toString())

        if (resource) {
          items.push(resource)
        }
      })

      return items
    },
    getEngine: () => localStorage as unknown as WindowLocalStorage,
  }
}

const plugin: WaormConnectionPlugin<WindowLocalStorage> = {
  setup: async (config) => createDB(config),
}

export default plugin
