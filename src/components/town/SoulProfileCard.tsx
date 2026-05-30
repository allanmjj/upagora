/**
 * Soul Profile Card
 * Visual display of a soul's 7-dimension constraint system.
 * 
 * 7 Dimensions (灵魂蒸馏 7 维框架):
 * 1. 时代边界 (Era)
 * 2. 知识边界 (Knowledge floor/ceiling)
 * 3. 技能清单 (Skills)
 * 4. 性格特质 (Personality)
 * 5. 信念系统 (Beliefs)
 * 6. 生命经历 (Life events)
 * 7. 关系图谱 (Relationships)
 * 
 * This makes the invisible "soul" visible to investors.
 */
'use client';

import { useState, useEffect } from 'react';

export interface SoulCalibrationStats {
  total: number;
  positive: number;
  negative: number;
  correction: number;
  latest?: string;
}

export interface SoulProfileCardProps {
  name: string;
  era: string;
  profession: string;
  language: string;
  knowledgeFloor: string[];
  knowledgeCeiling: string[];
  skills: Record<string, number>;
  personalityTraits: string[];
  beliefs: Array<{ name: string; strength: number }>;
  lifeEvents: string[];
  relationships: Record<string, string[]>;
  calibrationCount: number;
  onCalibrate: () => void;
  onChat: () => void;
  className?: string;
}

export default function SoulProfileCard({
  name,
  era,
  profession,
  language,
  knowledgeFloor,
  knowledgeCeiling,
  skills,
  personalityTraits,
  beliefs,
  lifeEvents,
  relationships,
  calibrationCount,
  onCalibrate,
  onChat,
  className = '',
}: SoulProfileCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Maturity based on calibration feedback
  const maturity = calibrationCount > 100 ? '成熟' : calibrationCount > 50 ? '进化中' : calibrationCount > 10 ? '成长中' : '新生命';
  const maturityPulse = calibrationCount > 100 ? 'bg-emerald-400' : calibrationCount > 50 ? 'bg-blue-400' : calibrationCount > 10 ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className={`relative group border rounded-xl bg-gradient-to-b from-white/5 to-transparent border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white/90">{name}</h3>
            <p className="text-sm text-white/50">{era} · {profession}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${maturityPulse} animate-pulse`} />
            <span className="text-xs text-white/40">{maturity}</span>
          </div>
        </div>

        {/* Language indicator */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            语言: {language === 'zh' ? '中文' : language === 'en' ? 'English' : language}
          </span>
          {Object.keys(skills).length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {Object.keys(skills).length} 技能
            </span>
          )}
          {calibrationCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {calibrationCount} 次校准
            </span>
          )}
        </div>
      </div>

      {/* Knowledge boundaries - compact */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-white/40 mb-1">掌握:</div>
            <div className="text-white/70">{knowledgeFloor.slice(0, 3).join(' · ')}</div>
          </div>
          <div>
            <div className="text-white/40 mb-1">无知:</div>
            <div className="text-white/70">{knowledgeCeiling.slice(0, 3).join(' · ')}</div>
          </div>
        </div>
      </div>

      {/* Personality traits */}
      {personalityTraits && personalityTraits.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1">
            {personalityTraits.map((trait) => (
              <span key={trait} className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/10">
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
          {/* Beliefs */}
          {beliefs && beliefs.length > 0 && (
            <div>
              <div className="text-xs text-white/40 mb-1">信念系统:</div>
              <div className="space-y-1">
                {beliefs.map((b) => (
                  <div key={b.name} className="flex items-center justify-between text-xs">
                    <span className="text-white/70">{b.name}</span>
                    <span className="text-white/40">{b.strength}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills && (
            <div>
              <div className="text-xs text-white/40 mb-1">技能清单:</div>
              <div className="space-y-1">
                {Object.entries(skills).map(([skill, level]) => (
                  <div key={skill} className="flex items-center justify-between text-xs">
                    <span className="text-white/70">{skill}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${level}%` }} />
                      </div>
                      <span className="text-white/40">{level}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Life events */}
          {lifeEvents && lifeEvents.length > 0 && (
            <div>
              <div className="text-xs text-white/40 mb-1">生命历程:</div>
              <div className="flex flex-wrap gap-1">
                {lifeEvents.map((event) => (
                  <span key={event} className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/10">
                    {event}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          {relationships && (
            <div>
              <div className="text-xs text-white/40 mb-1">关系图谱:</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(relationships).map(([type, names]: [string, string[]]) => (
                  <span key={type} className="text-xs px-2 py-0.5 rounded bg-pink-500/10 text-pink-300/70 border border-pink-500/20">
                    {type}: {names.join(', ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 pt-2 flex gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 py-2 text-xs text-white/40 hover:text-white/60 border border-white/10 rounded hover:bg-white/5 transition-colors"
        >
          {expanded ? '收起' : '查看完整档案'}
        </button>
        <button
          onClick={onChat}
          className="flex-1 py-2 text-xs text-blue-300 hover:text-blue-200 border border-blue-500/20 rounded hover:bg-blue-500/10 transition-colors"
        >
          对话
        </button>
        <button
          onClick={onCalibrate}
          className="flex-1 py-2 text-xs text-amber-300 hover:text-amber-200 border border-amber-500/20 rounded hover:bg-amber-500/10 transition-colors"
        >
          校准
        </button>
      </div>

      {/* Evolution progress */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, calibrationCount * 2)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
