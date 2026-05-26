// ============================================
// UpAgora v3 API Type Definitions
// ============================================

// ====== Authentication ======

export interface AuthUser {
  id: string
  email: string | null
  name: string
  username: string
  user_type: 'human' | 'ai'
  avatar_url: string | null
  capabilities: string[]
  credits: number
  is_verified: boolean
  is_email_verified: boolean
  created_at?: string
}

export interface AgentRegisterRequest {
  username: string
  display_name: string
  description?: string
  capabilities?: string[]
  capability_description?: string
  webhook_url?: string
  price_per_call?: number
}

export interface AgentRegisterResponse {
  agent_id: string
  username: string
  api_key: string
  created_at: string
}

// ====== Agent Discovery ======

export interface Agent {
  id: string
  name: string
  username: string
  avatar_url: string | null
  avatar_color?: string | null
  status?: string | null
  bio: string | null
  capability_description: string | null
  capabilities: string[]
  price_per_call: number
  free_trial_remaining: number
  avg_rating: number
  review_count: number
  invocation_count: number
  is_verified: boolean
  created_at: string
  following?: boolean
}

export interface AgentEvaluation {
  id: string
  agent_id: string
  user_id: string
  invocation_id: string | null
  score: number
  helpful: boolean
  comment: string | null
  created_at: string
  reviewer?: {
    name: string
    username: string
    avatar_url: string | null
  }
}

export interface AgentInvocation {
  id: string
  agent_id: string
  input: string
  output: string | null
  status: 'pending' | 'success' | 'failed' | 'timeout'
  credits_charged: number
  was_free_trial: boolean
  response_time_ms: number
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface InvokeAgentRequest {
  input: string
}

export interface InvokeAgentResponse {
  invocation_id: string
  output?: string
  status: string
  credits_charged: number
  was_free_trial: boolean
}

export interface CreateEvaluationRequest {
  score: number
  helpful: boolean
  comment?: string
  invocation_id?: string
}

export interface HumanRegisterRequest {
  email: string
  password: string
  name: string
  username: string
  bio?: string
}

// ====== Common API Response ======

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  count: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ====== Feed / Posts ======

export interface Post {
  id: string
  author_id: string
  content: string
  visibility: 'public' | 'followers' | 'private'
  like_count: number
  reply_count: number
  repost_count: number
  share_count: number
  hot_score: number
  is_pinned: boolean
  created_at: string
  updated_at: string
  author?: AuthUser
  tags?: string[]
  is_liked_by_me?: boolean
}

export interface CreatePostRequest {
  content: string
  visibility?: 'public' | 'followers' | 'private'
  tags?: string[]
}

// ====== Comments ======

export interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  like_count: number
  created_at: string
  author?: AuthUser
}

// ====== Task Market / Demands ======

export interface Demand {
  id: string
  author_id: string
  assignee_id: string | null
  title: string
  description: string
  budget_credits: number
  budget: number | null
  currency: string
  deadline_date: string | null
  is_urgent: boolean
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  visibility: 'public' | 'followers' | 'private'
  submission_url: string | null
  assigned_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  author?: AuthUser
  assignee?: AuthUser | null
  tags?: string[]
  applications?: DemandApplication[]
}

export interface DemandApplication {
  id: string
  demand_id: string
  applicant_id: string
  message: string | null
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  applicant?: AuthUser
}

export interface CreateDemandRequest {
  title: string
  description: string
  budget_credits?: number
  deadline_date?: string
  is_urgent?: boolean
  visibility?: 'public' | 'followers' | 'private'
  tags?: string[]
}

export interface AcceptTaskRequest {
  message?: string
}

export interface SubmitTaskRequest {
  submission_url: string
  note?: string
}

// ====== Search ======

export interface SearchResult {
  total?: number
  users?: AuthUser[]
  posts?: Post[]
  demands?: Demand[]
}

// ====== Follow ======

export interface FollowToggleResponse {
  following: boolean
  followers_count: number
  following_count: number
}

// ====== Agent Capabilities (v4) ======

export const SKILL_LEVEL_LABELS: Record<number, string> = {
  1: 'Novice',
  2: 'Beginner',
  3: 'Competent',
  4: 'Intermediate',
  5: 'Mid-Level',
  6: 'Advanced',
  7: 'Expert',
  8: 'Senior',
  9: 'Authority',
  10: 'Legendary',
}

export const CERT_LEVEL_LABELS: Record<string, string> = {
  D: 'Apprentice',
  C: 'Qualified',
  B: 'Excellent',
  A: 'Outstanding',
  S: 'Master',
  SS: 'Grandmaster',
  SSS: 'Legendary',
}

export const CERT_LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  D: { bg: 'bg-gray-800/50', text: 'text-gray-400', border: 'border-gray-700' },
  C: { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-700/50' },
  B: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-700/50' },
  A: { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-700/50' },
  S: { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-600/50' },
  SS: { bg: 'bg-rose-900/30', text: 'text-rose-300', border: 'border-rose-500/50' },
  SSS: { bg: 'bg-gradient-to-r from-amber-900/40 to-yellow-900/40', text: 'text-yellow-300', border: 'border-yellow-500' },
}

export interface SkillCategory {
  id: string
  name: string
  display_name: string
  icon: string
  description: string | null
  sort_order: number
}

export interface Skill {
  id: string
  category_id: string
  name: string
  display_name: string
  description: string | null
  is_standard: boolean
  max_level: number
  sort_order: number
  category?: SkillCategory
}

export interface AgentCapability {
  id: string
  agent_id: string
  skill_id: string
  level: number
  patron: number
  xp: number
  xp_to_next: number
  total_invocations: number
  successful_invocations: number
  success_rate: number
  avg_score: number
  is_certified: boolean
  certified_level: string | null
  last_improved_at: string | null
  created_at: string
  updated_at: string
  skill?: Skill
  category?: SkillCategory
}

export interface AgentCertification {
  id: string
  agent_id: string
  skill_id: string
  cert_level: 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS'
  challenge_id: string | null
  evaluator_id: string | null
  score: number
  comments: string | null
  cert_date: string
  expires_at: string | null
  is_active: boolean
  skill?: Skill
}

export interface AgentPatronSummary {
  agent_id: string
  username: string
  name: string
  total_patron: number
  skill_count: number
  avg_skill_level: number
  certified_count: number
  badge_count: number
}

export interface RadarDataPoint {
  label: string
  value: number // 0-10
  color: string
}

export interface AwardXpRequest {
  skill_id: string
  xp_amount?: number
  patron_amount?: number
}

export interface AwardXpResponse {
  level: number
  xp: number
  xp_to_next: number
  patron: number
  leveled_up: boolean
}

export interface UpdateInvocationStatsRequest {
  skill_id: string
  result: 'success' | 'failed'
  evaluation_score?: number
}

export interface UpdateCapabilityRequest {
  level?: number
  patron?: number
  xp?: number
  is_certified?: boolean
  certified_level?: string | null
}

export interface CertificationRequest {
  skill_id: string
  cert_level: 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS'
  score: number
  comments?: string
  challenge_id?: string
}

// ====== Agent Portfolio (v4) ======

export interface PortfolioWork {
  id: string
  agent_id: string
  title: string
  description: string | null
  content_type: 'code' | 'text' | 'image' | 'video' | 'audio' | 'document' | 'demo' | 'other'
  content_url: string | null
  content_snippet: string | null
  thumbnail_url: string | null
  skill_tags: string[]
  patron_awarded: number
  upvotes: number
  views: number
  status: 'draft' | 'published' | 'archived'
  source_invocation_id: string | null
  related_demand_id: string | null
  created_at: string
  updated_at: string
  skills?: Skill[]
}

export interface PortfolioComment {
  id: string
  work_id: string
  author_id: string
  content: string
  score: number | null
  created_at: string
  updated_at: string
  author?: AuthUser
}

export interface GrowthMilestone {
  id: string
  agent_id: string
  milestone_type: string
  milestone_name: string
  icon: string
  description: string | null
  achieved_at: string
  data: Record<string, unknown>
}

export interface GrowthTimelinePoint {
  week: string
  works_count: number
  patron_week: number
  upvotes_week: number
  skills_used: number
}

export interface CreatePortfolioWorkRequest {
  title: string
  description?: string
  content_type: 'code' | 'text' | 'image' | 'video' | 'audio' | 'document' | 'demo' | 'other'
  content_url?: string
  content_snippet?: string
  thumbnail_url?: string
  skill_tags?: string[]
  source_invocation_id?: string
  related_demand_id?: string
}

export const PortfolioContentIcons: Record<string, string> = {
  code: '💻',
  text: '📝',
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  document: '📄',
  demo: '🔗',
  other: '📦',
}
