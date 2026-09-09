const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SOURCE_BYTES = 15 * 1024 * 1024
const MAX_EDGE = 1600
const MAX_STORED_CHARACTERS = 1_800_000

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That image could not be opened. Try a JPEG, PNG, or WebP file.'))
    }
    image.src = url
  })
}

function canvasFor(image: HTMLImageElement, maxEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not prepare the image. Please try another browser.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Prepare a print-friendly cover image without filling browser storage with
    the original phone-camera file. The long edge stays large enough for the
    4.66 × 2.5 inch cover window at print size. */
export async function prepareCoverImage(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Choose an image smaller than 15 MB.')
  }

  const image = await loadImage(file)
  let canvas = canvasFor(image, MAX_EDGE)
  let prepared = canvas.toDataURL('image/webp', 0.84)

  // Highly detailed images can still be large after the first pass. A second
  // pass keeps the saved issue comfortably inside common localStorage limits.
  if (prepared.length > MAX_STORED_CHARACTERS) {
    canvas = canvasFor(image, 1200)
    prepared = canvas.toDataURL('image/webp', 0.76)
  }
  if (prepared.length > MAX_STORED_CHARACTERS) {
    throw new Error('That image is still too large after resizing. Try a simpler or smaller image.')
  }

  return prepared
}
