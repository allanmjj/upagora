/**
 * Settings persistence helpers for UpAgora
 *
 * Maps local UI state → database column names via PATCH /api/users/:id
 * Used by Settings page tabs that cannot inline the mapping logic.
 */

type NotificationSettings = {
  email: boolean
  mentions: boolean
  follows: boolean
  demands: boolean
}

type PrivacySettings = {
  profile: string
  online: boolean
  activity: boolean
}

type AppearanceSettings = {
  theme: string
  fontSize: string
  language: string
  compact: boolean
}

const NOTIFICATION_MAP: Record<keyof NotificationSettings, string> = {
  email: 'notification_email',
  mentions: 'notification_mentions',
  follows: 'notification_follows',
  demands: 'notification_demands',
}

const PRIVACY_MAP: Record<keyof PrivacySettings, string> = {
  profile: 'profile_visibility',
  online: 'show_online_status',
  activity: 'show_activity_status',
}

const APPEARANCE_MAP: Record<keyof AppearanceSettings, string> = {
  theme: 'preferred_theme',
  fontSize: 'font_size',
  language: 'preferred_language',
  compact: 'compact_mode',
}

function mapSettings<T extends Record<string, unknown>, M extends Record<string, string>>(
  settings: T,
  map: M,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [local, db] of Object.entries(map)) {
    result[db] = settings[local as keyof T]
  }
  return result
}

export async function saveNotificationSettings(
  userId: string,
  settings: NotificationSettings,
): Promise<boolean> {
  return sendSettingsPatch(userId, mapSettings(settings, NOTIFICATION_MAP))
}

export async function savePrivacySettings(
  userId: string,
  settings: PrivacySettings,
): Promise<boolean> {
  return sendSettingsPatch(userId, mapSettings(settings, PRIVACY_MAP))
}

export async function saveAppearanceSettings(
  userId: string,
  settings: AppearanceSettings,
): Promise<boolean> {
  return sendSettingsPatch(userId, mapSettings(settings, APPEARANCE_MAP))
}

async function sendSettingsPatch(userId: string, updates: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Load settings from /api/auth/me response */
export function loadUserSettings(data: Record<string, unknown>): {
  notifications: NotificationSettings
  privacy: PrivacySettings
  appearance: AppearanceSettings
} {
  return {
    notifications: {
      email: !!data.notification_email,
      mentions: !!data.notification_mentions,
      follows: !!data.notification_follows,
      demands: !!data.notification_demands,
    },
    privacy: {
      profile: data.profile_visibility as string ?? 'public',
      online: !!data.show_online_status,
      activity: !!data.show_activity_status,
    },
    appearance: {
      theme: data.preferred_theme as string ?? 'system',
      fontSize: data.font_size as string ?? 'medium',
      language: data.preferred_language as string ?? 'en',
      compact: !!data.compact_mode,
    },
  }
}
