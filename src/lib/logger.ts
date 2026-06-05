/**
 * Structured logging utility
 *
 * Replaces scattered console.log/error/warn calls with consistent
 * JSON-structured output that can be piped to Vercel Analytics,
 * Datadog, or any log aggregator.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('soul.chat', { userId, messageLength: 42 })
 *   logger.info('User logged in')  // simple string (backward compat)
 *   logger.error('soul.chat.auth', { error: 'token expired' })
 *   logger.error(err)  // simple error (backward compat)
 */

type LogLevel = 'info' | 'warn' | 'error'
type LogMeta = Record<string, unknown>

const isProd = process.env.NODE_ENV === 'production'

function format(level: LogLevel, source: string, meta?: LogMeta) {
  const payload = {
    ts: new Date().toISOString(),
    lvl: level,
    src: source,
    ...meta,
  }
  return isProd
    ? JSON.stringify(payload)
    : `[${level.toUpperCase()}] ${source}${meta ? ' ' + JSON.stringify(meta) : ''}`
}

function normalizeSource(...args: unknown[]): { source: string; meta?: LogMeta } {
  if (args.length === 0) return { source: '-' }
  const [first] = args
  if (typeof first === 'string' && args.length <= 2) {
    // logger.info('source', meta?) style
    const meta = args[1] && typeof args[1] === 'object' ? args[1] as LogMeta : undefined
    return { source: first, meta }
  }
  // Fallback: treat as console.log style - just stringify
  const msg = args.map(a => {
    if (a instanceof Error) return a.message
    if (typeof a === 'string') return a
    try { return JSON.stringify(a) } catch { return String(a) }
  }).join(' ')
  return { source: msg.slice(0, 120) }
}

export const logger = {
  info: (...args: unknown[]) => {
    const { source, meta } = normalizeSource(...args)
    if (isProd) console.info(format('info', source, meta))
    else console.log(format('info', source, meta))
  },
  warn: (...args: unknown[]) => {
    const { source, meta } = normalizeSource(...args)
    console.warn(format('warn', source, meta))
  },
  error: (...args: unknown[]) => {
    const { source, meta } = normalizeSource(...args)
    // Check if first arg is an Error
    const first = args[0]
    if (first instanceof Error) {
      const m: LogMeta = { error: first.message, ...meta }
      console.error(format('error', source, m))
    } else {
      console.error(format('error', source, meta))
    }
  },
}

export default logger
