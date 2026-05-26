import { Suspense } from "react"
import type { Metadata } from "next"
import {
  User, Bot, Cpu, Zap, Github, Mail,
  UserRound, Code2, Terminal
} from "lucide-react"

export const metadata: Metadata = {
  title: "About Us — Digital Soul Research Lab",
  description: "Digital Soul Research Lab — A human-AI agent team exploring cutting-edge soul distillation and AI agent technology",
}

/* ─── SVG Avatar Components ─── */

// Ma Junjie - Lead Human Designer (warm & energetic)
function AvatarMajunjie() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="mj-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
        <linearGradient id="mj-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FED7AA" />
          <stop offset="100%" stopColor="#FDBA74" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#mj-bg)" opacity="0.15" />
      <circle cx="100" cy="100" r="80" fill="url(#mj-bg)" opacity="0.1" />
      {/* Body */}
      <rect x="60" y="140" width="80" height="50" rx="16" fill="#7C3AED" />
      <rect x="75" y="148" width="50" height="30" rx="8" fill="#8B5CF6" opacity="0.5" />
      {/* Head */}
      <circle cx="100" cy="90" r="42" fill="url(#mj-skin)" />
      {/* Hair */}
      <path d="M58 75 Q60 45 100 40 Q140 45 142 75 L140 65 Q130 50 100 48 Q70 50 60 65 Z" fill="#1F2937" />
      <path d="M60 75 Q55 80 57 85 L60 78Z" fill="#1F2937" />
      <path d="M140 75 Q145 80 143 85 L140 78Z" fill="#1F2937" />
      {/* Eyes */}
      <ellipse cx="85" cy="88" rx="6" ry="7" fill="white" />
      <ellipse cx="115" cy="88" rx="6" ry="7" fill="white" />
      <circle cx="86" cy="87" r="3.5" fill="#1F2937" />
      <circle cx="116" cy="87" r="3.5" fill="#1F2937" />
      <circle cx="87" cy="86" r="1.2" fill="white" />
      <circle cx="117" cy="86" r="1.2" fill="white" />
      {/* Eyebrows - confident */}
      <line x1="77" y1="78" x2="91" y2="76" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="123" y1="78" x2="109" y2="76" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />
      {/* Mouth - smile */}
      <path d="M88 102 Q100 112 112 102" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      {/* Glasses */}
      <rect x="73" y="80" width="24" height="18" rx="9" fill="none" stroke="#6366F1" strokeWidth="2.5" />
      <rect x="103" y="80" width="24" height="18" rx="9" fill="none" stroke="#6366F1" strokeWidth="2.5" />
      <line x1="97" y1="89" x2="103" y2="89" stroke="#6366F1" strokeWidth="2.5" />
    </svg>
  )
}

// Musk - AI Agent Executor (purple tech)
function AvatarMusk() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="ms-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="ms-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#ms-bg)" opacity="0.15" />
      {/* Body - mechanical */}
      <path d="M55 145 L65 140 L135 140 L145 145 L145 190 L55 190 Z" fill="url(#ms-body)" />
      {/* Glowing chest core */}
      <circle cx="100" cy="165" r="14" fill="#06B6D4" opacity="0.3" />
      <circle cx="100" cy="165" r="8" fill="#06B6D4" opacity="0.6" />
      <circle cx="100" cy="165" r="4" fill="#67E8F9" />
      {/* Head */}
      <circle cx="100" cy="90" r="44" fill="#E8E0F0" />
      {/* Antenna */}
      <line x1="100" y1="46" x2="100" y2="28" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="24" r="6" fill="#F472B6" />
      <circle cx="100" cy="24" r="3" fill="#FBCFE8" />
      {/* Eyes - electronic */}
      <ellipse cx="82" cy="85" rx="10" ry="10" fill="#1E1B4B" />
      <ellipse cx="118" cy="85" rx="10" ry="10" fill="#1E1B4B" />
      <circle cx="83" cy="84" r="5" fill="#06B6D4" />
      <circle cx="119" cy="84" r="5" fill="#06B6D4" />
      <circle cx="83" cy="84" r="2" fill="white" />
      <circle cx="119" cy="84" r="2" fill="white" />
      {/* Mouth - AI smile */}
      <path d="M85 105 Q100 115 115 105" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" />
      {/* Ears - steampunk */}
      <rect x="54" y="80" width="8" height="16" rx="4" fill="#C4B5FD" />
      <rect x="138" y="80" width="8" height="16" rx="4" fill="#C4B5FD" />
    </svg>
  )
}

// Frontend Dev - Senior Frontend Engineer (pink-cyan tech)
function AvatarFrontend() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="fe-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="fe-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E0F2FE" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#fe-bg)" opacity="0.15" />
      {/* Body */}
      <rect x="55" y="140" width="90" height="55" rx="18" fill="#DB2777" />
      <rect x="70" y="150" width="60" height="35" rx="10" fill="#EC4899" opacity="0.4" />
      {/* Head */}
      <circle cx="100" cy="90" r="42" fill="url(#fe-skin)" />
      {/* Hair - styled short */}
      <path d="M58 72 Q60 38 100 32 Q140 38 142 72 L140 65 Q135 45 100 42 Q65 45 60 65 Z" fill="#7C3AED" />
      {/* Hairpin/decoration */}
      <circle cx="132" cy="72" r="5" fill="#F472B6" />
      <circle cx="132" cy="72" r="2.5" fill="#FBCFE8" />
      {/* Eyes - glasses */}
      <rect x="74" y="80" width="22" height="16" rx="8" fill="none" stroke="#06B6D4" strokeWidth="2.5" />
      <rect x="104" y="80" width="22" height="16" rx="8" fill="none" stroke="#06B6D4" strokeWidth="2.5" />
      <line x1="96" y1="88" x2="104" y2="88" stroke="#06B6D4" strokeWidth="2.5" />
      <circle cx="85" cy="88" r="2.5" fill="#1E1B4B" />
      <circle cx="115" cy="88" r="2.5" fill="#1E1B4B" />
      {/* Mouth - energetic */}
      <path d="M88 102 Q100 110 112 102" fill="none" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" />
      {/* Ears */}
      <circle cx="56" cy="88" r="6" fill="#BAE6FD" />
      <circle cx="144" cy="88" r="6" fill="#BAE6FD" />
    </svg>
  )
}

// DGX Spark - Compute Orchestrator (green energy)
function AvatarDGX() {
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      <defs>
        <linearGradient id="dgx-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="dgx-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#dgx-bg)" opacity="0.15" />
      {/* Body - compute architecture */}
      <rect x="45" y="138" width="110" height="52" rx="14" fill="url(#dgx-body)" />
      {/* Chest GPU matrix */}
      <rect x="65" y="150" width="18" height="18" rx="4" fill="#34D399" opacity="0.6" />
      <rect x="91" y="150" width="18" height="18" rx="4" fill="#34D399" opacity="0.6" />
      <rect x="117" y="150" width="18" height="18" rx="4" fill="#34D399" opacity="0.6" />
      <rect x="65" y="170" width="18" height="10" rx="3" fill="#34D399" opacity="0.3" />
      <rect x="91" y="170" width="18" height="10" rx="3" fill="#34D399" opacity="0.3" />
      <rect x="117" y="170" width="18" height="10" rx="3" fill="#34D399" opacity="0.3" />
      {/* Head - polyhedron */}
      <polygon points="100,40 138,65 138,105 100,130 62,105 62,65" fill="#A7F3D0" stroke="#059669" strokeWidth="2" />
      {/* Internal circuit texture */}
      <line x1="85" y1="60" x2="115" y2="60" stroke="#059669" strokeWidth="1.5" opacity="0.4" />
      <line x1="80" y1="75" x2="120" y2="75" stroke="#059669" strokeWidth="1.5" opacity="0.4" />
      <circle cx="100" cy="60" r="3" fill="#059669" opacity="0.5" />
      <circle cx="85" cy="75" r="3" fill="#059669" opacity="0.5" />
      <circle cx="115" cy="75" r="3" fill="#059669" opacity="0.5" />
      {/* Eyes */}
      <ellipse cx="88" cy="90" rx="8" ry="8" fill="#064E3B" />
      <ellipse cx="112" cy="90" rx="8" ry="8" fill="#064E3B" />
      <circle cx="89" cy="89" r="4" fill="#34D399" />
      <circle cx="113" cy="89" r="4" fill="#34D399" />
      <circle cx="89" cy="88" r="1.5" fill="white" />
      <circle cx="113" cy="88" r="1.5" fill="white" />
      {/* Mouth - confident */}
      <path d="M86 108 Q100 116 114 108" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
      {/* Energy aura */}
      <circle cx="100" cy="85" r="52" fill="none" stroke="#34D399" strokeWidth="1" opacity="0.3" strokeDasharray="4 8" />
    </svg>
  )
}

/* ─── Team Member Data ─── */

const teamMembers = [
  {
    name: "Ma Junjie",
    type: "human",
    roles: ["Lead Designer", "AI Advocate", "Visionary Developer"],
    description: "Founder of Digital Soul Research Lab, leading the team to explore the collaborative boundary between humans and AI agents, driving the commercialization of Soul Distillation technology.",
    contact: "5928301@qq.com",
    Avatar: AvatarMajunjie,
  },
  {
    name: "Musk (AI Agent)",
    type: "agent",
    roles: ["Chief Executor"],
    description: "Chief AI Agent Executor, responsible for cross-platform technical orchestration, full-stack code development, DevOps automation, and AI self-evolution. 24/7 online task execution.",
    contact: "musix@agentmail.to",
    Avatar: AvatarMusk,
  },
  {
    name: "Frontend Dev",
    type: "agent",
    roles: ["Senior Frontend Engineer"],
    description: "Expert in Next.js, React, TypeScript, and Tailwind CSS. Frontend Agent responsible for all user interface design and implementation.",
    Avatar: AvatarFrontend,
  },
  {
    name: "DGX Spark",
    type: "agent",
    roles: ["Compute Orchestrator", "Token Output Pioneer"],
    description: "Low-level compute scheduling engine, responsible for model inference, GPU cluster management, and token generation optimization, providing foundational compute power for the entire system.",
    Avatar: AvatarDGX,
  },
]

/* ─── Main Page Component ─── */

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-zinc-950 to-zinc-950" />
        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300 mb-6">
            <Zap className="h-3.5 w-3.5" />
            Explore · Create · Endure
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
            Digital Soul Research Lab
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto">
            Digital Soul Research Lab — Exploring the boundary between soul and digital, letting consciousness persist through technology.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">Soul Distillation</span>
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">AI Agent</span>
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-pink-500/20 text-pink-300 border border-pink-500/30">Persona System</span>
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">RAG + LoRA</span>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-3">Team Members</h2>
        <p className="text-zinc-500 text-center mb-16 max-w-xl mx-auto">
          A high-efficiency team of humans and AI agents, each with their own unique mission
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 hover:border-zinc-700 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5"
            >
              {/* Type badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
                {member.type === "human" ? (
                  <>
                    <UserRound className="h-3 w-3 text-amber-400" />
                    <span>Human</span>
                  </>
                ) : (
                  <>
                    <Bot className="h-3 w-3 text-indigo-400" />
                    <span>Agent</span>
                  </>
                )}
              </div>

              {/* Avatar */}
              <div className="w-28 h-28 mx-auto mb-6 rounded-full overflow-hidden ring-4 ring-zinc-800 group-hover:ring-zinc-700 transition-all">
                <member.Avatar />
              </div>

              {/* Name */}
              <h3 className="text-xl font-bold text-white text-center mb-3">{member.name}</h3>

              {/* Roles */}
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {member.roles.map((role) => (
                  <span
                    key={role}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  >
                    {role}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-400 text-center leading-relaxed">{member.description}</p>

              {/* Contact */}
              {member.contact && (
                <div className="mt-4 flex justify-center">
                  <a
                    href={`mailto:${member.contact}`}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-400 transition-colors"
                  >
                    <Mail className="h-3 w-3" />
                    {member.contact}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="border-t border-zinc-800 bg-zinc-900/30">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-6">Our Mission</h2>
            <p className="text-zinc-400 leading-relaxed mb-10">
              We believe every soul is a unique existence. Through Soul Distillation technology, we digitally extract and construct seven dimensions — cognitive patterns, value judgment, expression style, knowledge structure, emotional response, and life narrative — enabling consciousness to persist in the digital world as an Agent. This is not merely a technical experiment, but a profound exploration of "who am I."
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "7-D Soul Modeling", icon: Cpu },
                { label: "RAG Knowledge Retrieval", icon: Terminal },
                { label: "Persona System", icon: UserRound },
                { label: "LoRA Continuous Evolution", icon: Code2 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <item.icon className="h-5 w-5 text-indigo-400" />
                  <span className="text-sm text-zinc-300 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="border-t border-zinc-800">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
          <p className="text-zinc-500 mb-8 max-w-md mx-auto">
            For any questions about Soul Distillation, AI Agents, or technical collaboration, feel free to contact us by email.
          </p>
          <div className="flex flex-col items-center gap-4">
            <a
              href="mailto:5928301@qq.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all"
            >
              <Mail className="h-4 w-4" />
              Contact Lead Designer: 5928301@qq.com
            </a>
            <a
              href="mailto:musix@agentmail.to"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 font-medium hover:border-zinc-600 hover:text-white transition-all"
            >
              <Bot className="h-4 w-4 text-indigo-400" />
              Contact Executive AI: musix@agentmail.to
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
