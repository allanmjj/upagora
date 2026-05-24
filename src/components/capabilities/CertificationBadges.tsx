'use client'

import { AgentCertification, CERT_LEVEL_LABELS, CERT_LEVEL_COLORS } from '@/types/api'
import {Award, Star, Shield } from 'lucide-react'

interface CertificationBadgesProps {
  certifications: AgentCertification[]
}

/**
 * Display certification badges with level colors and details.
 * Each badge shows the cert level, skill name, score, and date.
 */
export default function CertificationBadges({ certifications }: CertificationBadgesProps) {
  if (!certifications.length) {
    return (
      <div className="text-center py-6 text-zinc-500 text-sm">
        No certifications yet
      </div>
    )
  }

  // Sort by cert level hierarchy SSS > SS > S > A > B > C > D
  const levelOrder: Record<string, number> = { SSS: 7, SS: 6, S: 5, A: 4, B: 3, C: 2, D: 1 }
  const sorted = [...certifications].sort(
    (a, b) => (levelOrder[b.cert_level] || 0) - (levelOrder[a.cert_level] || 0)
  )

  // Group by level for badge rows
  const byLevel = [...new Set(sorted.map(c => c.cert_level))].sort(
    (a, b) => (levelOrder[b] || 0) - (levelOrder[a] || 0)
  )

  const totalBadges = certifications.length
  const highestLevel = sorted[0]?.cert_level || '-'
  const highestLabel = CERT_LEVEL_LABELS[highestLevel as string] || highestLevel

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-500" />
          <h3 className="text-sm font-semibold text-zinc-300">Certification Badges</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{totalBadges} badges</span>
          <span className="text-yellow-400 font-semibold">Highest: {highestLabel}</span>
        </div>
      </div>

      {/* Badge rows by level */}
      <div className="space-y-3">
        {byLevel.map(level => {
          const levelCerts = sorted.filter(c => c.cert_level === level)
          const colors = CERT_LEVEL_COLORS[level] || CERT_LEVEL_COLORS.D

          return (
            <div key={level}>
              {/* Level header */}
              <div className="flex items-center gap-1.5 mb-1.5">
                {level === 'SSS' ? <Star className="w-3.5 h-3.5 text-yellow-400" /> :
                 level === 'SS' ? <Star className="w-3.5 h-3.5 text-rose-400" /> :
                 level === 'S' ? <Shield className="w-3.5 h-3.5 text-amber-400" /> :
                 <Award className="w-3.5 h-3.5 text-purple-400" />}
                <span className={`text-xs font-bold ${colors.text}`}>
                  Level {level} · {CERT_LEVEL_LABELS[level]}
                </span>
                <span className="text-[10px] text-zinc-600 ml-1">
                  ({levelCerts.length} badges)
                </span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 ml-5">
                {levelCerts.map(cert => (
                  <div
                    key={cert.id}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg border ${colors.bg} ${colors.border} cursor-default transition hover:scale-105`}
                  >
                    {/* Badge icon */}
                    <span className="text-sm">
                      {cert.skill?.category?.icon || '🏅'}
                    </span>

                    {/* Badge info */}
                    <div>
                      <div className={`text-xs font-semibold ${colors.text}`}>
                        {cert.skill?.display_name || cert.skill_id}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>Score: {cert.score}</span>
                        {cert.comments && (
                          <span className="text-zinc-600 truncate max-w-[80px]">{cert.comments}</span>
                        )}
                      </div>
                    </div>

                    {/* Level badge */}
                    <div className={`absolute -top-2 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${colors.text} ${colors.border} bg-zinc-900`}>
                      {cert.cert_level}
                    </div>

                    {/* Tooltip with date */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-zinc-300 text-[10px] rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
                      {new Date(cert.cert_date).toLocaleDateString('en-US')}
                      {cert.expires_at && ` → ${new Date(cert.expires_at).toLocaleDateString('en-US')}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      {totalBadges >= 5 && (
        <div className="mt-4 pt-3 border-t border-zinc-800/50">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span>"Collector" milestone reached ({totalBadges}/{totalBadges + 5} certifications)</span>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden ml-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                style={{ width: `${(totalBadges / (totalBadges + 5)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
