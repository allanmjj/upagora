'use client';

import { useEffect, useState } from 'react';
import {
  Calendar, BookOpen, Target, Lightbulb, Heart, MapPin,
  MessageSquare, Shield, Anchor, ChevronDown, ChevronUp, Globe,
  Clock, GraduationCap, Brain, Zap, Sparkles
} from 'lucide-react';

interface Constraints {
  soul_id: string;
  soul_name: string;
  era_name?: string;
  era_start?: number;
  era_end?: number;
  profession?: string;
  education?: string;
  knowledge_floor?: string[];
  knowledge_ceiling?: string[];
  knowledge_gaps?: string[];
  skills?: Record<string, number>;
  non_skills?: string[];
  personality_traits?: string[];
  communication_style?: string[];
  language_style?: string[];
  avoided_language?: string[];
  beliefs?: Array<{ name: string; strength: number }>;
  life_events?: string[];
  places_visited?: string[];
  relationships?: Record<string, any[]>;
  soul_anchor?: string[];
}

interface DimensionCard {
  icon: any;
  title: string;
  color: string;
  render: (d: Constraints) => React.ReactNode;
}

function renderList(items: string[] | undefined, color: string, cls: string) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span key={i} className={`px-2 py-0.5 rounded-full text-xs border ${cls}`}>{item}</span>
      ))}
    </div>
  );
}

function renderBars(items: Array<{name: string; strength: number}> | undefined, color: string) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-300">{item.name}</span>
            <span className="text-pink-300">{item.strength}%</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${item.strength}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function renderSkillBars(data: Constraints) {
  if (!data.skills || Object.keys(data.skills).length === 0) return null;
  return (
    <div className="space-y-2">
      {Object.entries(data.skills).map(([skill, level]) => (
        <div key={skill}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-300">{skill}</span>
            <span className="text-amber-300">{level}%</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${level}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const DIMENSIONS: DimensionCard[] = [
  {
    icon: Calendar,
    title: 'Era / 时代',
    color: 'from-blue-500 to-cyan-500',
    render: (c) => {
      if (!c.era_name) return <p className="text-zinc-600 text-sm">No era data</p>;
      return (
        <div className="space-y-2">
          <div className="text-lg font-semibold text-white">{c.era_name}</div>
          <div className="flex items-center gap-2 text-zinc-400">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>{c.era_start} → {c.era_end} CE</span>
          </div>
          {c.profession && (
            <div className="flex items-center gap-2 text-zinc-400">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>{c.profession}</span>
            </div>
          )}
        </div>
      );
    }
  },
  {
    icon: GraduationCap,
    title: 'Education / 教育',
    color: 'from-emerald-500 to-teal-500',
    render: (c) => {
      if (!c.education) return <p className="text-zinc-600 text-sm">No education data</p>;
      return <div className="text-zinc-200">{c.education}</div>;
    }
  },
  {
    icon: Brain,
    title: 'Knowledge / 知识',
    color: 'from-violet-500 to-purple-500',
    render: (c) => (
      <div className="space-y-3">
        {renderList(c.knowledge_floor, 'emerald', 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50') && (
          <div>
            <div className="text-xs font-semibold text-emerald-400 mb-1">✓ Knows deeply</div>
            {renderList(c.knowledge_floor, 'emerald', 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50')}
          </div>
        )}
        {renderList(c.knowledge_ceiling, 'red', 'bg-red-900/30 text-red-300 border-red-800/50') && (
          <div>
            <div className="text-xs font-semibold text-red-400 mb-1">✗ Does not know</div>
            {renderList(c.knowledge_ceiling, 'red', 'bg-red-900/30 text-red-300 border-red-800/50')}
          </div>
        )}
        {renderList(c.knowledge_gaps, 'amber', 'bg-amber-900/30 text-amber-300 border-amber-800/50') && (
          <div>
            <div className="text-xs font-semibold text-amber-400 mb-1">? Uncertain about</div>
            {renderList(c.knowledge_gaps, 'amber', 'bg-amber-900/30 text-amber-300 border-amber-800/50')}
          </div>
        )}
      </div>
    )
  },
  {
    icon: Sparkles,
    title: 'Skills / 技能',
    color: 'from-amber-500 to-orange-500',
    render: (c) => renderSkillBars(c) || <p className="text-zinc-600 text-sm">No skill data</p>
  },
  {
    icon: Lightbulb,
    title: 'Personality / 性格',
    color: 'from-yellow-500 to-amber-500',
    render: (c) => {
      if (!c.personality_traits?.length) return <p className="text-zinc-600 text-sm">No personality data</p>;
      return renderList(c.personality_traits, 'yellow', 'bg-yellow-900/30 text-yellow-200 border-yellow-800/50');
    }
  },
  {
    icon: Target,
    title: 'Beliefs / 信念',
    color: 'from-pink-500 to-rose-500',
    render: (c) => renderBars(c.beliefs, 'from-pink-500 to-rose-500') || <p className="text-zinc-600 text-sm">No belief data</p>
  },
  {
    icon: Heart,
    title: 'Soul Anchor / 灵魂锚点',
    color: 'from-rose-500 to-red-500',
    render: (c) => {
      if (!c.soul_anchor?.length) return <p className="text-zinc-600 text-sm">No soul anchor data</p>;
      return (
        <div className="space-y-2">
          {c.soul_anchor.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <Anchor className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-zinc-200 text-sm">{a}</span>
            </div>
          ))}
        </div>
      );
    }
  },
  {
    icon: MapPin,
    title: 'Experience / 经历',
    color: 'from-teal-500 to-cyan-500',
    render: (c) => (
      <div className="space-y-3">
        {c.life_events?.length ? (
          <div>
            <div className="text-xs font-semibold text-teal-400 mb-1">Life Events</div>
            <ul className="space-y-1">
              {c.life_events.map((e, i) => (
                <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                  <span className="text-teal-500 mt-0.5">•</span>{e}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {c.places_visited?.length ? (
          <div>
            <div className="text-xs font-semibold text-cyan-400 mb-1">Places Visited</div>
            {renderList(c.places_visited, 'cyan', 'bg-cyan-900/30 text-cyan-300 border-cyan-800/50')}
          </div>
        ) : null}
        {c.relationships && Object.entries(c.relationships).length > 0 ? (
          <div>
            <div className="text-xs font-semibold text-teal-400 mb-1">Relationships</div>
            <div className="space-y-1">
              {Object.entries(c.relationships).map(([rel, people]) => (
                <div key={rel}>
                  <span className="text-xs text-zinc-500">{rel}:</span>{' '}
                  {(people as string[]).join(', ')}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  },
  {
    icon: MessageSquare,
    title: 'Style / 风格',
    color: 'from-indigo-500 to-blue-500',
    render: (c) => (
      <div className="space-y-2">
        {c.communication_style?.length ? (
          <div>
            <div className="text-xs font-semibold text-indigo-400 mb-1">Communication</div>
            {renderList(c.communication_style, 'indigo', 'bg-indigo-900/30 text-indigo-200 border-indigo-800/50')}
          </div>
        ) : null}
        {c.language_style?.length ? (
          <div>
            <div className="text-xs font-semibold text-blue-400 mb-1">Language Style</div>
            {renderList(c.language_style, 'blue', 'bg-blue-900/30 text-blue-200 border-blue-800/50')}
          </div>
        ) : null}
      </div>
    )
  },
  {
    icon: Shield,
    title: 'Boundaries / 限制',
    color: 'from-red-500 to-orange-500',
    render: (c) => (
      <div className="space-y-3">
        {c.avoided_language?.length ? (
          <div>
            <div className="text-xs font-semibold text-red-400 mb-1">Never uses</div>
            {renderList(c.avoided_language, 'red', 'bg-red-900/30 text-red-300 border-red-800/50 line-through')}
          </div>
        ) : null}
        {c.non_skills?.length ? (
          <div>
            <div className="text-xs font-semibold text-orange-400 mb-1">Cannot do</div>
            {renderList(c.non_skills, 'orange', 'bg-orange-900/30 text-orange-300 border-orange-800/50')}
          </div>
        ) : null}
      </div>
    )
  }
];

export function SoulConstraintCard({ soulId }: { soulId: string }) {
  const [data, setData] = useState<Constraints | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(DIMENSIONS.slice(0, 3).map(d => d.title)));

  useEffect(() => {
    fetch(`/api/soul/constraints?soul_id=${encodeURIComponent(soulId)}`)
      .then(r => r.json())
      .then(d => {
        setData(d.constraints || d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [soulId]);

  const toggleDim = (title: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3 text-zinc-500 animate-pulse">
          <Sparkles className="w-5 h-5" />
          <span>Loading soul constraints...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="text-center text-zinc-500">
          <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No constraint data available for this soul</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-400" />
          <h3 className="font-bold text-white">9D Soul Constraints / 9维灵魂约束</h3>
        </div>
        <p className="text-xs text-zinc-500 mt-1">{data.soul_name} — comprehensive dimensional profile</p>
      </div>

      <div className="divide-y divide-zinc-800/50">
        {DIMENSIONS.map((dim) => (
          <div key={dim.title} className="bg-zinc-900/30">
            <button
              onClick={() => toggleDim(dim.title)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${dim.color}`}>
                  <dim.icon className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-zinc-200 text-sm">{dim.title}</span>
              </div>
              {expanded.has(dim.title) ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
            </button>

            {expanded.has(dim.title) && (
              <div className="px-4 pb-4">
                <div className="pl-10">
                  {dim.render(data)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
