import { Application, Container, Graphics, Sprite } from 'pixi.js'

const INK = 0x24302a
const HIGHLIGHT = 0xffffff
const EXPRESSIONS = ['neutral', 'curious', 'scared', 'sleepy', 'happy', 'shy']

/**
 * The ONLY file in world-engine allowed to import from 'pixi.js'. Every
 * simulation system works purely with World/components and knows nothing
 * about rendering — so swapping renderers later (or adding a second one,
 * e.g. a minimap) never touches simulation code, and simulation logic
 * stays testable without a real browser (see the test scripts used while
 * building this).
 *
 * Creatures are drawn procedurally with Graphics rather than loaded from
 * image assets, rendered to a texture ONCE per (species, expression) pair
 * via generateTexture, then every creature instance is a pooled Sprite
 * swapping between those cached textures as its expression changes — this
 * is what lets the same architecture scale from 3 creatures to hundreds
 * without a rewrite (PixiJS's own guidance: Graphics only batches
 * efficiently below ~100 points; a pooled Sprite always batches).
 *
 * Squash/stretch, breathing and the hide fade (AnimationState, computed
 * by AnimationSystem) are applied here as transform/alpha changes on the
 * existing sprite — no new textures needed for those, keeping the cache
 * small (species x expression, not species x expression x every possible
 * stretch amount).
 */
export class PixiRenderer {
  constructor() {
    this.app = null
    this.creatureLayer = null
    this._textureCache = new Map()
    this._spritePool = []
    this._tailPool = []
    this._activeSprites = new Map()
    this._activeTails = new Map()
    this._tailLag = new Map()
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

  _textureKey(speciesId, expression) {
    return `${speciesId}:${expression}`
  }

  _getTexture(speciesId, appearance, expression) {
    const key = this._textureKey(speciesId, expression)
    if (this._textureCache.has(key)) return this._textureCache.get(key)

    const graphic = drawCreature(appearance, expression)
    const texture = this.app.renderer.generateTexture(graphic)
    graphic.destroy()
    this._textureCache.set(key, texture)
    return texture
  }

  _acquireSprite(appearance, expression) {
    const sprite = this._spritePool.pop() ?? makePooledSprite()
    sprite.texture = this._getTexture(appearance.speciesId, appearance, expression)
    sprite.visible = true
    sprite.cullable = true
    this.creatureLayer.addChild(sprite)
    return sprite
  }

  _acquireTail(appearance) {
    const tail = this._tailPool.pop() ?? this._makeTailSprite()
    tail.tint = appearance.baseColor
    tail.visible = true
    tail.cullable = true
    this.creatureLayer.addChild(tail)
    return tail
  }

  _makeTailSprite() {
    if (!this._tailTexture) {
      const dot = new Graphics().circle(0, 0, 6).fill(0xffffff)
      this._tailTexture = this.app.renderer.generateTexture(dot)
      dot.destroy()
    }
    const sprite = new Sprite(this._tailTexture)
    sprite.anchor.set(0.5)
    return sprite
  }

  _release(sprite, tail) {
    this.creatureLayer.removeChild(sprite)
    sprite.visible = false
    this._spritePool.push(sprite)

    this.creatureLayer.removeChild(tail)
    tail.visible = false
    this._tailPool.push(tail)
  }

  /** Called every frame by RenderSyncSystem for each visible entity. */
  syncEntity(entityId, appearance, position, facing, anim) {
    let sprite = this._activeSprites.get(entityId)
    let tail = this._activeTails.get(entityId)
    if (!sprite) {
      sprite = this._acquireSprite(appearance, anim?.expression ?? 'neutral')
      tail = this._acquireTail(appearance)
      this._activeSprites.set(entityId, sprite)
      this._activeTails.set(entityId, tail)
      this._tailLag.set(entityId, { x: position.x, y: position.y })
    }

    const desiredTexture = this._getTexture(appearance.speciesId, appearance, anim?.expression ?? 'neutral')
    if (sprite.texture !== desiredTexture) sprite.texture = desiredTexture

    const baseScale = appearance.scale * (anim?.displayScale ?? 1)
    sprite.x = position.x
    sprite.y = position.y
    sprite.rotation = facing.angle
    sprite.alpha = anim?.displayAlpha ?? 1
    // Stretch is applied in the sprite's LOCAL space (before its own
    // rotation), so after rotation it visually aligns with the direction
    // of travel — "along" maps to local X by convention of how the
    // creature shapes are drawn facing +X.
    sprite.scale.set(baseScale * (anim?.stretchAlong ?? 1), baseScale * (anim?.stretchAcross ?? 1))

    // Trailing secondary part: eases toward the main body's PREVIOUS
    // position rather than its current one, so it lags behind — a cheap
    // stand-in for "follow through / overlapping action" without a
    // second physics body.
    const lag = this._tailLag.get(entityId)
    const lagEase = 0.14
    lag.x += (position.x - lag.x) * lagEase
    lag.y += (position.y - lag.y) * lagEase
    tail.x = lag.x
    tail.y = lag.y
    tail.alpha = (anim?.displayAlpha ?? 1) * 0.8
    tail.scale.set(baseScale * 0.55)
  }

  removeEntity(entityId) {
    const sprite = this._activeSprites.get(entityId)
    const tail = this._activeTails.get(entityId)
    if (!sprite) return
    this._release(sprite, tail)
    this._activeSprites.delete(entityId)
    this._activeTails.delete(entityId)
    this._tailLag.delete(entityId)
  }

  activeEntityIds() {
    return this._activeSprites.keys()
  }

  destroy() {
    this._textureCache.forEach((texture) => texture.destroy(true))
    this._textureCache.clear()
    this._tailTexture?.destroy(true)
    this._tailTexture = null
    this._activeSprites.clear()
    this._activeTails.clear()
    this._tailLag.clear()
    this._spritePool = []
    this._tailPool = []
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

// --- Procedural drawing -----------------------------------------------

function drawCreature(appearance, expression) {
  const g = new Graphics()
  const { shape, baseColor } = appearance

  if (shape === 'wisp') {
    drawWispBody(g, baseColor)
    drawFace(g, 0, 1, expression, { spacing: 6, size: 2.6 })
  } else if (shape === 'skitter') {
    drawSkitterBody(g, baseColor)
    drawFace(g, 0, -1, expression, { spacing: 6.5, size: 2.4 })
  } else {
    drawBlobBody(g, baseColor)
    drawFace(g, 0, -1, expression, { spacing: 8, size: 3 })
  }

  return g
}

function drawWispBody(g, color) {
  // Slightly egg-shaped rather than a perfect circle — a small silhouette
  // asymmetry that reads as softer/more organic than pure geometry.
  g.ellipse(0, 2, 14, 16).fill({ color, alpha: 0.9 })
  g.ellipse(0, 2, 17.5, 19.5).stroke({ color, width: 2, alpha: 0.25 })
}

function drawSkitterBody(g, color) {
  g.ellipse(0, 0, 16, 11).fill(color)
  for (const [lx, ly] of [[-10, 8], [0, 10], [10, 8], [-10, -8], [0, -10], [10, -8]]) {
    g.moveTo(0, 0).lineTo(lx, ly).stroke({ color, width: 2 })
  }
  // Antennae with small ball tips — a bit of silhouette charm.
  g.moveTo(-4, -10).quadraticCurveTo(-8, -18, -6, -20).stroke({ color, width: 1.6 })
  g.moveTo(4, -10).quadraticCurveTo(8, -18, 6, -20).stroke({ color, width: 1.6 })
  g.circle(-6, -20, 1.8).fill(color)
  g.circle(6, -20, 1.8).fill(color)
}

function drawBlobBody(g, color) {
  // Wider than tall, "sat down" silhouette.
  g.ellipse(0, 4, 21, 15).fill(color)
}

function drawFace(g, cx, cy, expression, { spacing, size }) {
  const leftX = cx - spacing
  const rightX = cx + spacing

  if (expression === 'sleepy') {
    closedEye(g, leftX, cy)
    closedEye(g, rightX, cy)
    return
  }

  if (expression === 'shy') {
    halfEye(g, leftX, cy)
    halfEye(g, rightX, cy)
    g.circle(leftX - 2, cy + 4, 1.6).fill({ color: 0xd98a5f, alpha: 0.45 })
    g.circle(rightX + 2, cy + 4, 1.6).fill({ color: 0xd98a5f, alpha: 0.45 })
    return
  }

  const eyeSize = expression === 'curious' || expression === 'scared' ? size * 1.35 : size
  openEye(g, leftX, cy, eyeSize)
  openEye(g, rightX, cy, eyeSize)

  if (expression === 'happy') {
    g.moveTo(cx - 4, cy + eyeSize + 2)
      .quadraticCurveTo(cx, cy + eyeSize + 5.5, cx + 4, cy + eyeSize + 2)
      .stroke({ color: INK, width: 1.4 })
  } else if (expression === 'scared') {
    g.circle(cx, cy + eyeSize + 4, 1.7).stroke({ color: INK, width: 1.3 })
  }
}

function openEye(g, x, y, size) {
  g.circle(x, y, size).fill(INK)
  g.circle(x - size * 0.32, y - size * 0.32, size * 0.4).fill(HIGHLIGHT)
}

function closedEye(g, x, y) {
  g.moveTo(x - 3, y).quadraticCurveTo(x, y + 2.5, x + 3, y).stroke({ color: INK, width: 1.4 })
}

function halfEye(g, x, y) {
  g.moveTo(x - 2.5, y).lineTo(x + 2.5, y).stroke({ color: INK, width: 1.4 })
}

export const KNOWN_EXPRESSIONS = EXPRESSIONS
