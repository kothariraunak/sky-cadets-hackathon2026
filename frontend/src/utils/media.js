import client from '../api/client'

// Shrink a camera photo before upload (phones produce 5–12 MB images).
export function resizeImage(file, max = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read photo'))), 'image/jpeg', quality)
    }
    img.onerror = () => reject(new Error('Could not read photo'))
    img.src = url
  })
}

// Create a journal entry; `image` is an optional Blob (photo or drawing).
export async function saveJournalEntry(fields, image) {
  const form = new FormData()
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') form.append(k, v)
  })
  if (image) form.append('photo', image, image.type === 'image/png' ? 'drawing.png' : 'photo.jpg')
  const { data } = await client.post('/journal/', form)
  return data
}

// Journal photos are private: fetch them with the cadet's token and show them as blob URLs.
const cache = new Map()
export async function photoUrl(path) {
  if (cache.has(path)) return cache.get(path)
  const { data } = await client.get(path.replace(/^\/api/, ''), { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  cache.set(path, url)
  return url
}
