import { initDB } from './database'
import Model from './model'

export type WaormRelationshipBag = { [k: string]: WaormRelationship }

export interface Resource {
  id: string | number;
  created_at: string; // todo maybe a date type
}

export interface WaormConnectionPlugin<T> {
  setup: (config: WaormDatabaseConfig<T>) => Promise<WaormDatabaseConnection<T>>
}

export interface WaormDatabaseConnection<T> {
  name: WaormDatabaseConfig<T>['name'];
  config: WaormDatabaseConfig<T>;
  getEngine: () => T | undefined;
  get: (store: string, key: Resource['id']) => Promise<Resource | undefined>;
  set: (store: string, key: Resource['id'], data: Resource) => Promise<Resource>;
  all: (store: string, index?: string, options?: WaormCursorOptions) => Promise<Resource[]|Resource|undefined>;
  delete: (store: string, key: Resource['id']) => Promise<boolean>;
  where: (store: string, index: string, search: string, options?: WaormSearchOptions) => Promise<Resource[]|Resource|undefined>;
}

export interface WaormDatabaseConfig<T> {
  name: string;
  plugin?: WaormConnectionPlugin<T>;
  version?: number;
  default?: boolean;
  stores: WaormStore[];
}

export interface WaormRelationship {
  related: typeof Model;
  relationship:  'one' | 'many' | 'belongs';
  foreignKey: string;
}

export interface WaormCursorOptions {
  direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface WaormSearchOptions extends WaormCursorOptions {
  operator?: 'equals' | 'equals_many' | 'includes' | 'not_equals' | 'not_includes';
}

export interface WaormStore {
  name: string;
  indexes: WaormStoreIndex[];
}

export interface WaormStoreIndex {
  name: string;
  path?: string;
  unique?: boolean;
}

export { initDB, Model }
