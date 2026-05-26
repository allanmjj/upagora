'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  /** Initial page number (default 1) */
  initialPage?: number
  /** Distance in px from the sentinel to trigger loading (default 200) */
  rootMargin?: string
}

interface UseInfiniteScrollReturn {
  page: number
  hasMore: boolean
  loading: boolean
  sentinelRef: (node: Element | null) => void
  loadMore: () => void
  reset: () => void
  setHasMore: (value: boolean) => void
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions = {}): UseInfiniteScrollReturn {
  const { initialPage = 1, rootMargin = '200px' } = options
  const [page, setPage] = useState(initialPage)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelNodeRef = useRef<Element | null>(null)

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1)
    }
  }, [loading, hasMore])

  const reset = useCallback(() => {
    setPage(initialPage)
    setHasMore(true)
    setLoading(false)
  }, [initialPage])

  // IntersectionObserver callback
  const sentinelRef = useCallback(
    (node: Element | null) => {
      // Clean up previous observer
      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      sentinelNodeRef.current = node

      if (!node || !hasMore) return

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !loading && hasMore) {
            loadMore()
          }
        },
        { rootMargin }
      )

      observerRef.current.observe(node)
    },
    [hasMore, loading, loadMore, rootMargin]
  )

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // When page changes, mark loading
  useEffect(() => {
    if (page > initialPage) {
      setLoading(true)
    }
  }, [page, initialPage])

  return {
    page,
    hasMore,
    loading,
    sentinelRef,
    loadMore,
    reset,
    setHasMore,
  }
}
