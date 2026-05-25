"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { name?: string; size?: "sm" | "md" | "lg" | "xl" }
>(({ className, name = "?", size = "md", ...props }, ref) => {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
    xl: "h-20 w-20 text-2xl",
  }

  const colors = ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-cyan-600"]
  const colorIndex = name.charCodeAt(0) % colors.length
  const bgColor = colors[colorIndex]

  return (
    <div
      ref={ref}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-white",
        bgColor,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
})
Avatar.displayName = "Avatar"

export interface AvatarGroupProps {
  avatars: { name: string; href: string }[]
  max?: number
  size?: "sm" | "md" | "lg"
  className?: string
}

export function AvatarGroup({ avatars, max = 5, size = "md", className }: AvatarGroupProps) {
  const displayed = avatars.slice(0, max)
  const remaining = avatars.length - max

  return (
    <div className={cn("flex -space-x-2", className)}>
      {displayed.map((avatar, i) => (
        <a key={i} href={avatar.href}>
          <Avatar name={avatar.name} size={size} className="ring-2 ring-zinc-950" />
        </a>
      ))}
      {remaining > 0 && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-800 text-[10px] font-medium text-zinc-400 ring-2 ring-zinc-950">
          +{remaining}
        </div>
      )}
    </div>
  )
}

export { Avatar }
