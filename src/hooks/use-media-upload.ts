'use client'

import { useState, useCallback } from 'react'

const STORAGE_BUCKET = 'user-uploads'

type MediaType = 'image' | 'avatar' | 'document'

export function useMediaUpload(userId: string | null) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File, type: MediaType = 'image') => {
    if (!userId) { setError('Not authenticated'); return }
    setUploading(true)
    setProgress(0)
    setError(null)
    setUrl(null)

    try {
      const ext = file.name.split('.').pop() || 'png'
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const path = `${type}/${userId}/${filename}`

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type: file.type, base64: await fileToBase64(file) }),
      })

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setUrl(data.url)
      setProgress(100)
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [userId])

  const remove = useCallback(async () => {
    if (!url) return
    try {
      await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
    } finally {
      setUrl(null)
      setProgress(0)
    }
  }, [url])

  return { upload, remove, uploading, progress, url, error }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
