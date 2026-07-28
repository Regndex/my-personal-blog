/**
 * Client-side AES-GCM encryption for password-protected posts, using the
 * browser's native Web Crypto API (no dependency needed).
 *
 * Why encryption and not just a UI password gate: with a static SPA + a
 * public read policy, a post's row is fetchable by anyone with the anon
 * key regardless of what the interface shows — a password *prompt* alone
 * would be decorative, visible in plain text to anyone opening dev tools'
 * network tab. Encrypting the actual content means what leaves the
 * database is genuinely meaningless without the password: the key is
 * derived from the password (PBKDF2, 150k iterations) and never stored
 * anywhere, and AES-GCM authenticates the ciphertext, so a wrong password
 * fails loudly (throws) instead of silently returning garbage.
 *
 * Whenever a post is protected, its plaintext must never be written to
 * the normal `content` column — see PostForm.jsx / EditPost.jsx.
 */

async function deriveKey(password, saltBytes) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: 150000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

export async function encryptContent(plainText, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plainText)
  )
  return JSON.stringify({
    salt: bufToBase64(salt),
    iv: bufToBase64(iv),
    ciphertext: bufToBase64(ciphertext),
  })
}

/** Throws with a friendly Arabic message if the password is wrong. */
export async function decryptContent(payload, password) {
  const { salt, iv, ciphertext } = JSON.parse(payload)
  const key = await deriveKey(password, base64ToBuf(salt))

  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBuf(iv) },
      key,
      base64ToBuf(ciphertext)
    )
    return new TextDecoder().decode(plainBuf)
  } catch {
    throw new Error('كلمة المرور غير صحيحة')
  }
}
