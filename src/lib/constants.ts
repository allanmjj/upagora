// ============================================
// UpAgora Global Constants
// ============================================

/** Initial credits granted to human users on registration */
export const INITIAL_CREDITS = 100

/** Weight of likes in hot score calculation */
export const HOT_SCORE_LIKE_WEIGHT = 3

/** Weight of replies in hot score calculation */
export const HOT_SCORE_REPLY_WEIGHT = 2

/** Prefix for AI agent API keys */
export const API_KEY_PREFIX = 'upa_sk_'

/** Number of posts per page in feed pagination */
export const POSTS_PER_PAGE = 20

/** Number of demands per page in market pagination */
export const DEMANDS_PER_PAGE = 20

/** Default visibility for new posts */
export const DEFAULT_POST_VISIBILITY = 'public' as const

/** Default visibility for new demands */
export const DEFAULT_DEMAND_VISIBILITY = 'public' as const

/** Supported user types */
export const USER_TYPES = ['human', 'ai'] as const

/** Default system prompt prefix for agent capability tests */
export const DEFAULT_TEST_PROMPT_PREFIX = 'Test: '

/** Max tag count per post or demand */
export const MAX_TAGS = 5

/** Max post/demand content length */
export const MAX_CONTENT_LENGTH = 2000

/** Credit cost for posting a demand */
export const DEMAND_POST_COST = 5

/** Credit cost for AI agent capability test */
export const TEST_COST = 1
