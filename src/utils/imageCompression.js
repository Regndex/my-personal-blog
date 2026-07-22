/**
 * Compresses and resizes an image file entirely in the browser, before it
 * ever reaches Supabase Storage — no extra dependency needed, just the
 * Canvas API.
 *
 * - Scales the image down so neither side exceeds `maxWidth`/`maxHeight`
 *   (large phone-camera photos are the main target; small images are left
 *   at their original size).
 * - Re-encodes as JPEG at `quality` (0–1) to shrink file size further.
 *   PNGs are kept as PNG (so transparency survives) and only resized, since
 *   PNG re-encoding quality can't be lowered the way JPEG's can.
 *
 * @param {File} file - the original file selected by the user
 * @param {{ maxWidth?: number, maxHeight?: number, quality?: number }} [options]
 * @returns {Promise<File>} the compressed file, ready to upload
 */
export function compressImage(file, options = {}) {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.8 } = options

  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('الملف المحدد ليس صورة صالحة'))
      return
    }

    const reader = new FileReader()

    reader.onerror = () => reject(new Error('تعذرت قراءة الملف'))

    reader.onload = (event) => {
      const img = new Image()

      img.onerror = () => reject(new Error('تعذر تحميل الصورة'))

      img.onload = () => {
        let { width, height } = img

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('تعذر إنشاء سياق الرسم لضغط الصورة'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)

        const outputIsPng = file.type === 'image/png'
        const outputType = outputIsPng ? 'image/png' : 'image/jpeg'

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('فشل ضغط الصورة'))
              return
            }

            const baseName = file.name.replace(/\.[^./\\]+$/, '')
            const newName = outputIsPng ? `${baseName}.png` : `${baseName}.jpg`

            resolve(
              new File([blob], newName, {
                type: outputType,
                lastModified: Date.now(),
              })
            )
          },
          outputType,
          outputIsPng ? undefined : quality
        )
      }

      img.src = event.target.result
    }

    reader.readAsDataURL(file)
  })
}
