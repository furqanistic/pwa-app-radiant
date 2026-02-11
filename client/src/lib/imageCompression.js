const MAX_IMAGE_SIZE_BYTES = 1024 * 1024

export const compressImage = (file, opts = {}) => {
  const maxWidth = opts.maxWidth || 1280
  const maxHeight = opts.maxHeight || 1280
  const quality = opts.quality || 0.7

  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'))

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Failed to compress image'))
            resolve(blob)
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = (err) => reject(err)
      img.src = e.target.result
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

export const isUnderSizeLimit = (blobOrFile, limitBytes = MAX_IMAGE_SIZE_BYTES) =>
  Boolean(blobOrFile && blobOrFile.size <= limitBytes)

export const IMAGE_SIZE_LIMIT_BYTES = MAX_IMAGE_SIZE_BYTES
