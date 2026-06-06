'use client'

import { logger } from '@/lib/logger';
import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('[ErrorBoundary]', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/50 p-8 text-center backdrop-blur">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-100">Something went wrong</h2>
            <p className="mb-2 text-sm text-zinc-400">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={this.handleReset}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
              <Button
                size="sm"
                className="gap-1 bg-indigo-500 hover:bg-indigo-600"
                onClick={this.handleReload}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
