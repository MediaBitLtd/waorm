import type {
  Resource, WaormCursorOptions,
  WaormDatabaseConnection,
  WaormRelationship,
  WaormRelationshipBag,
  WaormSearchOptions
} from './index'

let connection: WaormDatabaseConnection<any>|undefined

export const setDBConnection = <T>(databaseConnection: WaormDatabaseConnection<T>) => connection = databaseConnection

export default abstract class Model <R = Resource> {
  public id?: Resource['id'] = undefined

  protected __preloadRelations?: WaormRelationshipBag | undefined = {}

  public static PER_PAGE = 30

  abstract storeName(): string

  relationships(): WaormRelationshipBag {
    return {}
  }

  getKey(): Resource['id'] | undefined {
    return this.id
  }

  newInstance(): this {
    // @ts-ignore
    return new this.constructor()
  }

  connection(): WaormDatabaseConnection<any>|undefined {
    return connection
  }

  hydrate<T = R>(data: T): this {
    // todo maybe move this into a parameter bag
    const preloadedRelationships = this.__preloadRelations

    for (const k in data) {
      // @ts-ignore
      this[k] = data[k]
    }

    this.__preloadRelations = preloadedRelationships

    return this
  }

  resource<T = R>(): T {
    const data = {
      ...this
    }

    delete data.__preloadRelations

    return JSON.parse(JSON.stringify(data)) as T
  }

  async get(key: Resource['id']): Promise<this | undefined> {
    try {
      const data = await this.connection()?.get(this.storeName(), this.parseKey(key))

      if (! data) {
        return undefined
      }

      this.hydrate(data)


      return await this.loadRelationships()
    } catch (err) {
      // todo handle errors
      throw err
    }
  }

  async save(): Promise<this> {
    const key = this.getKey()
    if (! key) {
      throw new Error('Model has no key to store. Make sure your key is hydrated')
    }

    try {
      delete this.__preloadRelations
      await this.connection()?.set(this.storeName(), this.parseKey(key), this.resource())
    } catch (err) {
      // todo handle errors
      throw err
    }

    return this
  }

  async find(field: string, search: any): Promise<this|undefined> {
    try {
      const data = await this.connection()?.where(this.storeName(), field, search)
      if (! data) {
        return
      }

      this.hydrate(data)

      return await this.loadRelationships()
    } catch (err) {
      // todo handle errors
      throw err
    }
  }

  async many(field: string, search: any, options?: WaormSearchOptions): Promise<this[]> {
    if (! options) {
      options = {}
    }

    options.operator = options.operator || 'includes'
    options.offset = options.offset || 0
    options.limit = options.limit || Model.PER_PAGE

    try {
      const items: this[] = []
      const resources = await this.connection()?.where(this.storeName(), field, search, options) as R[]

      for (const k in resources) {
        if (resources[k]) {
          const model = this.newInstance().hydrate(resources[k])
          model.__preloadRelations = this.__preloadRelations
          items.push(await model.loadRelationships())
        }
      }

      return items
    } catch (err) {
      // todo handle errors
      throw err
    }
  }

  async all(index?: string, options?: WaormCursorOptions): Promise<this[]> {
    if (! options) {
      options = {}
    }

    options.offset = options.offset || 0
    options.limit = options.limit || Model.PER_PAGE
    options.direction = options.direction || 'asc'

    try {
      const items: this[] = []
      const resources = await this.connection()?.all(this.storeName(), index, options) as R[]

      for (const k in resources) {
        if (resources[k]) {
          const model = this.newInstance().hydrate(resources[k])
          model.__preloadRelations = this.__preloadRelations
          items.push(await model.loadRelationships())
        }
      }

      return items
    } catch (err) {
      // todo handle errors
      throw err
    }
  }

  with(relationship: string): this {
    const relation: WaormRelationship | undefined = this.relationships()[relationship]

    if (! relation) {
      throw new Error(`No relationship setup for this model with the key: ${relationship}`)
    }

    if (! this.__preloadRelations) {
      this.__preloadRelations = {}
    }

    this.__preloadRelations[relationship] = relation

    return this
  }

  protected async loadRelationships(): Promise<this> {
    for (const relationship in this.__preloadRelations) {
      if (this.__preloadRelations[relationship]) {
        const relation: WaormRelationship | undefined = this.__preloadRelations[relationship]

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
      return key
    }

    // @ts-ignore
    if (isNaN(key)) {
      return key.toString()
    }

    return parseInt(key.toString())
  }
}
