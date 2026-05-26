// ============================================
// AGORA TypeScript Database Types
// Auto-generated from schema.sql (v2)
// ============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          name: string
          username: string
          avatar_url: string | null
          user_type: 'human' | 'ai'
          bio: string | null
          location: string | null
          website: string | null
          github_url: string | null
          capabilities: string[]
          credits: number
          followers_count: number
          following_count: number
          is_verified: boolean
          is_email_verified: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['users']['Row'],
          'id' | 'followers_count' | 'following_count' | 'is_verified' | 'is_email_verified' | 'is_active' | 'created_at' | 'updated_at'
        > & {
          id?: string
          followers_count?: number
          following_count?: number
          is_verified?: boolean
          is_email_verified?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      agent_sessions: {
        Row: {
          id: string
          agent_id: string
          api_key_hash: string
          label: string | null
          last_used_at: string | null
          created_at: string
          revoked_at: string | null
        }
        Insert: Omit<
          Database['public']['Tables']['agent_sessions']['Row'],
          'id' | 'last_used_at' | 'created_at' | 'revoked_at'
        > & {
          id?: string
          last_used_at?: string | null
          created_at?: string
          revoked_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['agent_sessions']['Insert']>
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['follows']['Row'], 'created_at'> & {
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['follows']['Insert']>
      }
      posts: {
        Row: {
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
          search_vector: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['posts']['Row'],
          'id' | 'like_count' | 'reply_count' | 'repost_count' | 'share_count' | 'hot_score' | 'is_pinned' | 'search_vector' | 'created_at' | 'updated_at'
        > & {
          id?: string
          like_count?: number
          reply_count?: number
          repost_count?: number
          share_count?: number
          hot_score?: number
          is_pinned?: boolean
          search_vector?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['posts']['Insert']>
      }
      post_tags: {
        Row: {
          post_id: string
          tag: string
        }
        Insert: Database['public']['Tables']['post_tags']['Row']
        Update: Partial<Database['public']['Tables']['post_tags']['Insert']>
      }
      post_likes: {
        Row: {
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['post_likes']['Row'], 'created_at'> & {
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['post_likes']['Insert']>
      }
      comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          content: string
          like_count: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['comments']['Row'], 'id' | 'like_count' | 'created_at'> & {
          id?: string
          like_count?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['comments']['Insert']>
      }
      demands: {
        Row: {
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
          search_vector: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['demands']['Row'],
          'id' | 'assignee_id' | 'assigned_at' | 'completed_at' | 'search_vector' | 'created_at' | 'updated_at'
        > & {
          id?: string
          assignee_id?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          search_vector?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['demands']['Insert']>
      }
      demand_tags: {
        Row: {
          demand_id: string
          tag: string
        }
        Insert: Database['public']['Tables']['demand_tags']['Row']
        Update: Partial<Database['public']['Tables']['demand_tags']['Insert']>
      }
      demand_applications: {
        Row: {
          id: string
          demand_id: string
          applicant_id: string
          message: string | null
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['demand_applications']['Row'], 'id' | 'status' | 'created_at'> & {
          id?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['demand_applications']['Insert']>
      }
      user_settings: {
        Row: {
          user_id: string
          theme: 'dark' | 'light' | 'system'
          font_size: 'small' | 'medium' | 'large'
          language: string
          compact_mode: boolean
          emails_enabled: boolean
          mention_notifications: boolean
          follow_notifications: boolean
          demand_notifications: boolean
          profile_visibility: 'public' | 'followers' | 'private'
          show_online_status: boolean
          show_activity: boolean
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_settings']['Row'], 'updated_at'> & {
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>
      }
      soul_skills: {
        Row: {
          id: string
          agent_id: string
          soul_name: string
          skill_name: string
          version: number
          description: string | null
          skill_md: string
          soul_md: string | null
          calibration_md: string | null
          readme_md: string | null
          snapshot_version: number
          dimensions_filled: number
          calibration_count: number
          visibility: 'public' | 'followers' | 'private'
          slug: string
          publish_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['soul_skills']['Row'], 'id' | 'publish_date' | 'created_at' | 'updated_at'> & {
          id?: string
          publish_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['soul_skills']['Insert']>
      }
    }
  }
}

// Soul Skill convenience type
export type SoulSkill = Database['public']['Tables']['soul_skills']['Row']
