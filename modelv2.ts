import type {
  ModelParamBag,
  Resource,
  WaormKey,
  WaormRelationship,
  WaormRelationshipBag,
  WaormDatabaseConnection,
} from './index'
import { dispatch, MODEL_OP_ERROR } from './events'


interface ModelResource extends Resource {
  [paramBagSymbol]: ModelParamBag;
}

let connection: WaormDatabaseConnection<any>|undefined

export const paramBagSymbol = Symbol('waorm:params')

export const setDBConnection = <T>(databaseConnection: WaormDatabaseConnection<T>) => connection = databaseConnection

export const generateNewId = (): string => 'generated_' + (Math.random() + 1).toString(36).substring(2)

export const generateNewSlug = (): string => Math.floor((new Date).getTime() / 1000) + (Math.random() + 1).toString(36).substring(2) + (new Date).getFullYear()

export default abstract class Model <R = ModelResource, E = any> {
  public id?: ModelResource['id'] = undefined;
  public [paramBagSymbol]?: ModelParamBag<E> = undefined;

  public static PER_PAGE = 15

  // Definitions
  abstract storeName(): string

  relationships(): WaormRelationshipBag {
    return {}
  }

  fields(): string[] | undefined {
    return undefined
  }

  getKeyField(): string {
    return 'id'
  }

  getKey(): WaormKey | undefined {
    // @ts-ignore
    return this[this.getKeyField()]
  }

  connection(): WaormDatabaseConnection<any>|undefined {
    return connection
  }

  // Mutators
  generateKey(): WaormKey {
    const key = generateNewId()

    if (this[paramBagSymbol]?.instance) {
      // @ts-ignore
      this[this.getKeyField()] = key
    }

    return key
  }

  with(relationship: string): this {
    const relation: WaormRelationship | undefined = this.relationships()[relationship]

    if (! relation) {
      throw new Error(`No relationship setup for this model with the key: ${relationship}`)
    }


    this[paramBagSymbol] = this.prepareBag()

    if (! this[paramBagSymbol].preloadRelations) {
      this[paramBagSymbol].preloadRelations = {}
    }

    this[paramBagSymbol].preloadRelations[relationship] = relation

    return this
  }

  hydrate<T = R>(data: T): this {
    const fields = this.fields()
    const preloadedRelationships = this[paramBagSymbol]?.preloadRelations

    for (const k in data) {
      if (! fields || fields.includes(k)) {
        // @ts-ignore
        this[k] = data[k]
      }
    }

    this[paramBagSymbol] = this.prepareBag(data)

    this[paramBagSymbol].new = this.getKey()?.toString().startsWith('generated') || ! this.getKey()
    this[paramBagSymbol].instance = true
    this[paramBagSymbol].original = JSON.stringify(this)
    this[paramBagSymbol].preloadRelations = preloadedRelationships

    return this
  }

  resource<T = R>(): T {
    const data = JSON.parse(JSON.stringify(this))

    data[paramBagSymbol] = this[paramBagSymbol]

    return data as T
  }

  newInstance(): this {
    // @ts-ignore
    return new this.constructor()
  }

  // IO
  async get(key: Resource['id']): Promise<this | undefined> {
    try {
      const data = await this.connection()?.get(this.storeName(), this.parseKey(key))

      if (! data) {
        return undefined
      }

      this.hydrate(data)

      return await this.loadRelationships()
    } catch (err) {
      dispatch(MODEL_OP_ERROR, err)
      throw err
    }
  }

  async save(): Promise<this> {
    let key = this.getKey()

    if (! key) {
      key = this.generateKey()
    }

    try {
      await this.connection()?.set(this.storeName(), this.parseKey(key), this.resource())
    } catch (err) {
      dispatch(MODEL_OP_ERROR, err)
      throw err
    }

    return this
  }

  async delete(): Promise<boolean> {
    const key = this.getKey()

    if (! key) {
      throw new Error('Model has no key to store. Make sure your key is hydrated')
    }

    try {
      return await this.connection()?.delete(this.storeName(), this.parseKey(key)) || false
    } catch (err) {
      dispatch(MODEL_OP_ERROR, err)
      throw err
    }
  }

  // Protected

  protected prepareBag(data?: any): ModelParamBag {
    return this[paramBagSymbol] || {
      lastUpdated: data[paramBagSymbol]?.lastUpdated,
      lastSynced: data[paramBagSymbol]?.lastSynced,
      syncErrors: data[paramBagSymbol]?.syncErrors || [],
    }
  }

  protected async loadRelationships(): Promise<this> {
    for (const relationship in this[paramBagSymbol]?.preloadRelations) {
      if (this[paramBagSymbol].preloadRelations[relationship]) {
        const relation: WaormRelationship | undefined = this[paramBagSymbol].preloadRelations[relationship]

        // @ts-ignore
        const model = (new relation.related)

        switch (relation.relationship) {
          case 'belongs':
            // @ts-ignore
            this[relationship] = await model.get(this.parseKey(this[relation.foreignKey]))
            break
          case 'one':
            // @ts-ignore
            this[relationship] = await model.find(relation.foreignKey, this.parseKey(this.getKey()))
            break
          case 'many':
            // @ts-ignore
            this[relationship] = await model.many(relation.foreignKey, this.parseKey(this.getKey()), { limit: 10_000, operator: 'equals_many' })
            break
        }
      }
    }

    return this
  }

  protected parseKey(key: Resource['id']|undefined): number|string {
    if (! key) {
      return ''
    }

    if (key.toString().trim() === '') {
      return key.toString().trim()
    }

    // @ts-ignore
    if (isNaN(key)) {
      return key.toString()
    }

    return parseInt(key.toString())
  }
}
