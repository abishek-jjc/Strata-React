/**
 * Utility to load an image, apply transparency, and add it as a background watermark on all pages of a jsPDF document.
 */

/**
 * Loads an image from a URL, draws it to a canvas with opacity, and returns a PNG Data URL.
 * @param {string} logoUrl - The URL of the image/logo.
 * @param {number} opacity - The opacity value (0 to 1).
 * @returns {Promise<string|null>} Resolves to a base64 data URL, or null if loading fails.
 */
export function loadLogoWithOpacity(logoUrl, opacity = 0.05) {
  return new Promise((resolve) => {
    if (!logoUrl) {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.globalAlpha = opacity
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL('image/png'))
          return
        }
      } catch (err) {
        console.error('Failed to apply opacity to logo:', err)
      }
      resolve(null)
    }
    img.onerror = () => {
      console.error('Failed to load watermark logo from:', logoUrl)
      resolve(null)
    }
    img.src = logoUrl
  })
}

/**
 * Adds the pre-loaded transparent watermark to all pages of a jsPDF document.
 * @param {Object} doc - The jsPDF instance.
 * @param {string} watermarkDataUrl - The base64 data URL of the translucent logo.
 * @param {number} scale - Scaling factor relative to the page dimensions (default 0.5 for 50%).
 */
export function addWatermarkToAllPages(doc, watermarkDataUrl, scale = 0.5) {
  if (!watermarkDataUrl) return
  
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pdfW = doc.internal.pageSize.getWidth()
    const pdfH = doc.internal.pageSize.getHeight()
    const size = Math.min(pdfW, pdfH) * scale
    const x = (pdfW - size) / 2
    const y = (pdfH - size) / 2
    
    // Add image on top. Because the image is pre-rendered with opacity,
    // it acts as a subtle watermark overlay.
    doc.addImage(watermarkDataUrl, 'PNG', x, y, size, size)
  }
}
