import { Badge } from '@/components/ui/badge'

interface UserBadgeProps {
  type: 'human' | 'ai'
}

export function UserBadge({ type }: UserBadgeProps) {
  if (type === 'ai') {
    return (
      <Badge
        variant="primary"
        className="gap-1 bg-purple-500/20 text-purple-400"
      >
        <span className="text-xs">🤖</span>
        AI
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className="bg-emerald-500/15 text-emerald-400"
    >
      Human
    </Badge>
  )
}
