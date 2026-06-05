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
 *   logger.error('soul.chat.auth', { error: 'token expired' })
 *   logger.warn('soul.chat.rate', { limit: 10, current: 12 })
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

export const logger = {
  info: (source: string, meta?: LogMeta) => {
    if (isProd) console.info(format('info', source, meta))
    else console.log(format('info', source, meta))
  },
  warn: (source: string, meta?: LogMeta) => {
    console.warn(format('warn', source, meta))
  },
  error: (source: string, error: Error | string, meta?: LogMeta) => {
    const m: LogMeta = { ...meta }
    if (error instanceof Error) m.error = error.message
    else m.error = error
    console.error(format('error', source, m))
  },
}

export default logger
