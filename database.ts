import type { WaormDatabaseConfig, WaormDatabaseConnection } from './index'
import indexedDB from './plugins/indexedDB'
import { setDBConnection } from './model'

const databases: {[k: string]: WaormDatabaseConnection<any>} = {}

export const initDB = async <T = IDBDatabase> (config: WaormDatabaseConfig<T>) => {
  if (databases[config.name]) {
    return databases[config.name] as WaormDatabaseConnection<T>
  }

  databases[config.name] = config.plugin
    ? await config.plugin.setup(config)
    : await indexedDB.setup(config as WaormDatabaseConfig<any>)

  if (config.default !== false) {
    setDBConnection(databases[config.name] as WaormDatabaseConnection<T>)
  }

  return databases[config.name] as WaormDatabaseConnection<T>
}
