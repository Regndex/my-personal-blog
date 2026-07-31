/**
 * Generic pub/sub so systems can react to what other systems do without
 * calling each other directly — e.g. SocialSystem emits 'creature:met',
 * a future AchievementSystem or ProceduralEventSystem can listen without
 * SocialSystem ever knowing they exist. This decoupling is what lets new
 * systems be added later without editing old ones.
 */
export class EventBus {
  constructor() {
    this._listeners = new Map()
  }

  on(eventName, callback) {
    if (!this._listeners.has(eventName)) this._listeners.set(eventName, new Set())
    this._listeners.get(eventName).add(callback)
    return () => this.off(eventName, callback)
  }

  off(eventName, callback) {
    this._listeners.get(eventName)?.delete(callback)
  }

  emit(eventName, payload) {
    this._listeners.get(eventName)?.forEach((callback) => callback(payload))
  }

  clear() {
    this._listeners.clear()
  }
}
