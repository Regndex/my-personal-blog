/**
 * Uniform spatial hash grid — a generic engine service, not creature-
 * specific. Rebuilt each tick (clear + reinsert) rather than incrementally
 * updated: O(n) and simple/robust at the "hundreds of entities" scale this
 * is designed for. Any system needing "what's near point P" uses this —
 * Social now, future predator/prey or regional-weather-effect systems
 * later — without their own separate spatial logic.
 */
export class SpatialGrid {
  constructor(cellSize = 150) {
    this.cellSize = cellSize
    this._cells = new Map()
  }

  _key(cx, cy) {
    return `${cx},${cy}`
  }

  _cellCoords(x, y) {
    return [Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)]
  }

  clear() {
    this._cells.clear()
  }

  insert(entityId, x, y) {
    const [cx, cy] = this._cellCoords(x, y)
    const key = this._key(cx, cy)
    if (!this._cells.has(key)) this._cells.set(key, [])
    this._cells.get(key).push(entityId)
  }

  /** All entity ids inserted within `radius` of (x, y) — a superset check
   *  against the enclosing cells; callers still compare actual distance. */
  queryRadius(x, y, radius) {
    const results = []
    const minCx = Math.floor((x - radius) / this.cellSize)
    const maxCx = Math.floor((x + radius) / this.cellSize)
    const minCy = Math.floor((y - radius) / this.cellSize)
    const maxCy = Math.floor((y + radius) / this.cellSize)

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this._cells.get(this._key(cx, cy))
        if (bucket) results.push(...bucket)
      }
    }
    return results
  }
}
