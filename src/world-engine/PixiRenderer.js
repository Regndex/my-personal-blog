import { Application, Container, Graphics, Sprite } from 'pixi.js'

/**
 * The ONLY file in world-engine allowed to import from 'pixi.js'. Every
 * simulation system works purely with World/components and knows nothing
 * about rendering — so swapping renderers later (or adding a second one,
 * e.g. a minimap) never touches simulation code, and simulation logic
 * stays testable without a real browser (see the test scripts used while
 * building this).
 *
 * Creatures are drawn procedurally with Graphics rather than loaded from
 * image assets (no art pipeline needed), rendered to a texture ONCE per
 * species via generateTexture, then every creature instance is a plain
 * Sprite sharing that texture — this is what lets the same architecture
 * scale from 3 creatures to hundreds without a rewrite: at 3, drawing
 * live Graphics per-instance would already be fine, but a shared-texture
 * Sprite is what actually stays cheap at hundreds (PixiJS's own guidance:
 * Graphics only batches efficiently below ~100 points; a pooled Sprite
 * always batches).
 */
export class PixiRenderer {
  constructor() {
    this.app = null
    this.creatureLayer = null
    this._textureCache = new Map()
    this._spritePool = []
    this._activeSprites = new Map()
  }

  async init(canvasContainer) {
    this.app = new Application()
    await this.app.init({
      resizeTo: canvasContainer,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    })

    canvasContainer.appendChild(this.app.canvas)

    this.creatureLayer = new Container()
    this.creatureLayer.cullable = true
    this.creatureLayer.cullableChildren = true
    this.app.stage.addChild(this.creatureLayer)
  }

  /** Draws a species' appearance once and caches the resulting texture. */
  _getTexture(speciesId, appearance) {
    if (this._textureCache.has(speciesId)) return this._textureCache.get(speciesId)

    const graphic = drawCreatureShape(appearance)
    const texture = this.app.renderer.generateTexture(graphic)
    graphic.destroy()
    this._textureCache.set(speciesId, texture)
    return texture
  }

  _acquireSprite(speciesId, appearance) {
    const sprite = this._spritePool.pop() ?? makePooledSprite()
    sprite.texture = this._getTexture(speciesId, appearance)
    sprite.scale.set(appearance.scale)
    sprite.visible = true
    sprite.cullable = true
    this.creatureLayer.addChild(sprite)
    return sprite
  }

  _releaseSprite(sprite) {
    this.creatureLayer.removeChild(sprite)
    sprite.visible = false
    this._spritePool.push(sprite)
  }

  /** Called every frame by RenderSyncSystem for each visible entity. */
  syncEntity(entityId, appearance, position, facing) {
    let sprite = this._activeSprites.get(entityId)
    if (!sprite) {
      sprite = this._acquireSprite(appearance.speciesId, appearance)
      this._activeSprites.set(entityId, sprite)
    }
    sprite.x = position.x
    sprite.y = position.y
    sprite.rotation = facing.angle
  }

  removeEntity(entityId) {
    const sprite = this._activeSprites.get(entityId)
    if (!sprite) return
    this._releaseSprite(sprite)
    this._activeSprites.delete(entityId)
  }

  activeEntityIds() {
    return this._activeSprites.keys()
  }

  destroy() {
    this._textureCache.forEach((texture) => texture.destroy(true))
    this._textureCache.clear()
    this._activeSprites.clear()
    this._spritePool = []
    this.app?.destroy(
      { removeView: true, releaseGlobalResources: true },
      { children: true, texture: true, textureSource: true }
    )
    this.app = null
  }
}

function makePooledSprite() {
  const sprite = new Sprite()
  sprite.anchor.set(0.5)
  return sprite
}

function drawCreatureShape({ shape, baseColor }) {
  const g = new Graphics()

  if (shape === 'wisp') {
    g.circle(0, 0, 16).fill({ color: baseColor, alpha: 0.85 })
    g.circle(0, 0, 20).stroke({ color: baseColor, width: 2, alpha: 0.3 })
    g.circle(-5, -3, 2).fill(0x24302a)
    g.circle(5, -3, 2).fill(0x24302a)
  } else if (shape === 'skitter') {
    g.ellipse(0, 0, 16, 11).fill(baseColor)
    for (const [lx, ly] of [
      [-10, 8], [0, 10], [10, 8], [-10, -8], [0, -10], [10, -8],
    ]) {
      g.moveTo(0, 0).lineTo(lx, ly).stroke({ color: baseColor, width: 2 })
    }
    g.circle(-6, -4, 1.6).fill(0x24302a)
    g.circle(6, -4, 1.6).fill(0x24302a)
  } else {
    // 'blob' and any unrecognized shape fall back to this simplest form —
    // so a future species that forgets to specify a shape still renders.
    g.ellipse(0, 0, 20, 16).fill(baseColor)
    g.circle(-6, -3, 2.2).fill(0x24302a)
    g.circle(6, -3, 2.2).fill(0x24302a)
    g.moveTo(-6, 6).quadraticCurveTo(0, 10, 6, 6).stroke({ color: 0x24302a, width: 1.6 })
  }

  return g
}
