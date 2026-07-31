/**
 * The World is the entire engine's data store. It knows nothing about
 * creatures, PixiJS, or the DOM — it is a generic Entity-Component-System
 * substrate. This genericity is what lets new species, new components
 * (weather-affected, flying, nocturnal, ...) and new systems get added
 * later without ever touching this file.
 *
 * - Entities are just numeric ids (recycled when destroyed).
 * - Components are plain data, grouped by type in a Map<entityId, data>
 *   per type — a "sparse set" store. Cheap to add new component types.
 * - Resources are singleton, non-per-entity state (Clock, Geography,
 *   Weather, ...), looked up by string key.
 */
export class World {
  constructor() {
    this._nextId = 1
    this._freeIds = []
    this._alive = new Set()
    this._components = new Map()
    this._resources = new Map()
  }

  createEntity() {
    const id = this._freeIds.length > 0 ? this._freeIds.pop() : this._nextId++
    this._alive.add(id)
    return id
  }

  destroyEntity(id) {
    if (!this._alive.has(id)) return
    this._alive.delete(id)
    for (const store of this._components.values()) {
      store.delete(id)
    }
    this._freeIds.push(id)
  }

  isAlive(id) {
    return this._alive.has(id)
  }

  addComponent(entityId, type, data) {
    if (!this._components.has(type)) this._components.set(type, new Map())
    this._components.get(type).set(entityId, data)
    return data
  }

  getComponent(entityId, type) {
    return this._components.get(type)?.get(entityId)
  }

  hasComponent(entityId, type) {
    return this._components.get(type)?.has(entityId) ?? false
  }

  removeComponent(entityId, type) {
    this._components.get(type)?.delete(entityId)
  }

  /** All alive entities having every one of `types`. */
  query(types) {
    if (types.length === 0) return []

    const stores = types.map((type) => this._components.get(type) ?? new Map())
    stores.sort((a, b) => a.size - b.size)
    const [smallest, ...rest] = stores

    const results = []
    for (const id of smallest.keys()) {
      if (!this._alive.has(id)) continue
      if (rest.every((store) => store.has(id))) results.push(id)
    }
    return results
  }

  setResource(key, value) {
    this._resources.set(key, value)
  }

  getResource(key) {
    return this._resources.get(key)
  }

  entities() {
    return Array.from(this._alive)
  }

  get entityCount() {
    return this._alive.size
  }
}
