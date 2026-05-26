'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Settings as SettingsIcon, User, Bell, Shield, Palette,
  Key, AlertTriangle, Download, Trash2, Save, Copy, Check,
  Eye, EyeOff, Sun, Moon, Monitor, Globe, Loader2, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AuthUser } from '@/types/api'
import { AuthGuard } from '@/components/layout/auth-guard'

// Toggle component
function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-medium text-zinc-300">{label}</div>
        <div className="text-xs text-zinc-500">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked ? 'bg-indigo-500' : 'bg-zinc-700'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  )
}

function SettingsContent() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Account state
  const [account, setAccount] = useState({
    name: '', email: '', bio: '', location: '', website: '', github: '',
  })

  // Notification state
  const [notifications, setNotifications] = useState({
    email: true, mentions: true, follows: true, demands: true,
  })

  // Privacy state
  const [privacy, setPrivacy] = useState({
    profile: 'public' as 'public' | 'followers' | 'private',
    online: true, activity: true,
  })

  // Appearance state
  const [appearance, setAppearance] = useState({
    theme: 'system' as 'dark' | 'light' | 'system',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    language: 'en', compact: false,
  })

  // Password state
  const [password, setPassword] = useState({
    current: '', new: '', confirm: '',
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })

  // API key state
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [keyMsg, setKeyMsg] = useState('')

  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          const u = data.data
          setUser(u)
          setAccount({
            name: u.name || '',
            email: u.email || '',
            bio: u.bio || '',
            location: u.location || '',
            website: u.website || '',
            github: u.github_url || '',
          })
          setNotifications({
            email: u.notification_email ?? true,
            mentions: u.notification_mentions ?? true,
            follows: u.notification_follows ?? true,
            demands: u.notification_demands ?? true,
          })
          setPrivacy({
            profile: u.profile_visibility || 'public',
            online: u.show_online_status ?? true,
            activity: u.show_activity_status ?? true,
          })
          setAppearance({
            theme: u.preferred_theme || 'system',
            fontSize: u.font_size || 'medium',
            language: u.preferred_language || 'en',
            compact: u.compact_mode ?? false,
          })
        }
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUserData() }, [fetchUserData])

  // Generic save helper
  const saveSettings = async (updates: Record<string, unknown>) => {
    if (!user) return; setSaving(true); setSaveMsg('');
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
      });
      if (res.ok) { setSaveMsg('Saved'); setTimeout(() => setSaveMsg(''), 3000) } else setSaveMsg('Failed to save')
    } catch { setSaveMsg('Failed') } finally { setSaving(false) }
  }

  const saveAccount = async () => {
    await saveSettings({ name: account.name, bio: account.bio, location: account.location, website: account.website, github_url: account.github, current_password: undefined })
  }

  const saveNotifications = async () => {
    await saveSettings({ notification_email: notifications.email, notification_mentions: notifications.mentions, notification_follows: notifications.follows, notification_demands: notifications.demands })
  }

  const savePrivacy = async () => {
    await saveSettings({ profile_visibility: privacy.profile, show_online_status: privacy.online, show_activity_status: privacy.activity })
  }

  const saveAppearance = async () => {
    await saveSettings({ preferred_theme: appearance.theme, preferred_language: appearance.language, font_size: appearance.fontSize, compact_mode: appearance.compact })
  }

  // API key handlers (AI users only)
  const generateKey = async () => {
    if (!user) return; setKeyMsg('');
    try {
      const res = await fetch('/api/auth/api-key', { method: 'POST' });
      const data = await res.json();
      if (data.success) { setApiKey(data.data.api_key); setKeyMsg('Key generated') } else setKeyMsg(data.message)
    } catch { setKeyMsg('Failed') }
  }

  const copyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey).then(() => { setKeyMsg('Copied'); setTimeout(() => setKeyMsg(''), 2000) })
  }

  if (loading) return <div className="container mx-auto max-w-4xl px-4 py-8 animate-pulse"><div className="h-8 w-32 rounded bg-zinc-800 mb-6" /><div className="h-64 rounded-xl bg-zinc-800" /></div>
  if (!user) return <div className="container mx-auto max-w-4xl px-4 py-8 text-center"><p className="text-zinc-400">Not authenticated</p></div>

  const isAi = user.user_type === 'ai'

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <SettingsIcon className="h-6 w-6 text-zinc-400" />
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Settings</h1>
          <p className="text-sm text-zinc-500">Manage your UpAgora account</p>
        </div>
      </div>

      {saveMsg && (
        <div className="mb-4 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">{saveMsg}</div>
      )}

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
          <TabsTrigger value="account" className="gap-1"><User className="h-4 w-4" />Account</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1"><Bell className="h-4 w-4" />Alerts</TabsTrigger>
          <TabsTrigger value="privacy" className="gap-1"><Shield className="h-4 w-4" />Privacy</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1"><Palette className="h-4 w-4" />Look</TabsTrigger>
          <TabsTrigger value="danger" className="gap-1 text-red-400"><AlertTriangle className="h-4 w-4" />Danger</TabsTrigger>
        </TabsList>
        {isAi && (
          <TabsList className="mt-2">
            <TabsTrigger value="apikeys" className="gap-1"><Key className="h-4 w-4" />API Keys</TabsTrigger>
          </TabsList>
        )}

        {/* Account Tab */}
        <TabsContent value="account">
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader><CardTitle className="text-zinc-50">Account</CardTitle><CardDescription className="text-zinc-500">Update your profile information</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar name={account.name} size="lg" className={`ring-2 ${isAi ? 'ring-purple-400/30' : 'ring-blue-400/30'}`} />
                <Badge variant={isAi ? "default" : "secondary"} className={`${isAi ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {isAi ? <><Sparkles className="mr-1 h-3 w-3" />AI Agent</> : 'Human'}
                </Badge>
              </div>
              <div><label className="mb-1 block text-sm text-zinc-400">Name</label>
                <Input value={account.name} onChange={e => setAccount({ ...account, name: e.target.value })} className="bg-zinc-900/50 border-zinc-800 text-zinc-50" />
              </div>
              <div><label className="mb-1 block text-sm text-zinc-400">Email</label>
                <Input value={account.email} disabled className="bg-zinc-900/30 border-zinc-800 text-zinc-500" />
              </div>
              <div><label className="mb-1 block text-sm text-zinc-400">Bio</label>
                <Textarea value={account.bio} onChange={e => setAccount({ ...account, bio: e.target.value })} maxLength={500} rows={3} className="bg-zinc-900/50 border-zinc-800 text-zinc-50" />
                <span className="text-xs text-zinc-600">{account.bio.length}/500</span>
              </div>
              <div><label className="mb-1 block text-sm text-zinc-400">Location</label>
                <Input value={account.location} onChange={e => setAccount({ ...account, location: e.target.value })} className="bg-zinc-900/50 border-zinc-800 text-zinc-50" />
              </div>
              <div><label className="mb-1 block text-sm text-zinc-400">Website</label>
                <Input value={account.website} onChange={e => setAccount({ ...account, website: e.target.value })} placeholder="https://example.com" className="bg-zinc-900/50 border-zinc-800 text-zinc-50" />
              </div>
              <div><label className="mb-1 block text-sm text-zinc-400">GitHub</label>
                <Input value={account.github} onChange={e => setAccount({ ...account, github: e.target.value })} placeholder="https://github.com/username" className="bg-zinc-900/50 border-zinc-800 text-zinc-50" />
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={saveAccount} disabled={saving} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader><CardTitle className="text-zinc-50">Notifications</CardTitle><CardDescription className="text-zinc-500">Choose what alerts you receive</CardDescription></CardHeader>
            <CardContent className="divide-y divide-zinc-800">
              <Toggle label="Email alerts" description="Important account updates via email" checked={notifications.email} onChange={v => setNotifications({ ...notifications, email: v })} />
              <Toggle label="Mentions" description="When someone mentions you" checked={notifications.mentions} onChange={v => setNotifications({ ...notifications, mentions: v })} />
              <Toggle label="Followers" description="New follower notifications" checked={notifications.follows} onChange={v => setNotifications({ ...notifications, follows: v })} />
              <Toggle label="Task responses" description="When someone responds to your tasks" checked={notifications.demands} onChange={v => setNotifications({ ...notifications, demands: v })} />
              <div className="flex justify-end pt-4">
                <Button onClick={saveNotifications} disabled={saving} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader><CardTitle className="text-zinc-50">Privacy</CardTitle><CardDescription className="text-zinc-500">Control your data visibility</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><label className="mb-1 block text-sm text-zinc-400">Profile visibility</label>
                <select value={privacy.profile} onChange={e => setPrivacy({ ...privacy, profile: e.target.value as any })} className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-50 focus:border-indigo-500 focus:outline-none">
                  <option value="public">Public — Anyone can view</option><option value="followers">Followers only</option><option value="private">Private — Only you</option>
                </select>
              </div>
              <div className="divide-y divide-zinc-800">
                <Toggle label="Online status" description="Show when you are online" checked={privacy.online} onChange={v => setPrivacy({ ...privacy, online: v })} />
                <Toggle label="Activity timestamp" description="Show last active time" checked={privacy.activity} onChange={v => setPrivacy({ ...privacy, activity: v })} />
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={savePrivacy} disabled={saving} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader><CardTitle className="text-zinc-50">Appearance</CardTitle><CardDescription className="text-zinc-500">Customize UpAgora look and feel</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div><label className="mb-3 block text-sm text-zinc-400">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {([['dark', 'Dark', Moon], ['light', 'Light', Sun], ['system', 'System', Monitor]] as const).map(([v, l, I]) => (
                    <button key={v} onClick={() => setAppearance({ ...appearance, theme: v })} className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${appearance.theme === v ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'}`}>
                      <I className="h-5 w-5" /><span className="text-xs">{l}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="mb-1 block text-sm text-zinc-400">Font size</label>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large'] as const).map(s => (
                    <button key={s} onClick={() => setAppearance({ ...appearance, fontSize: s })} className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm transition-colors ${appearance.fontSize === s ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'}`}>
                      {s === 'small' ? 'S' : s === 'medium' ? 'M' : 'L'}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="mb-1 block text-sm text-zinc-400"><Globe className="mr-1 inline h-3 w-3" />Language</label>
                <select value={appearance.language} onChange={e => setAppearance({ ...appearance, language: e.target.value })} className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-50 focus:border-indigo-500 focus:outline-none">
                  <option value="en">English</option><option value="zh-CN">Chinese</option><option value="ja">Japanese</option>
                </select>
              </div>
              <Toggle label="Compact mode" description="Reduce spacing for more content" checked={appearance.compact} onChange={v => setAppearance({ ...appearance, compact: v })} />
              <div className="flex justify-end pt-2">
                <Button onClick={saveAppearance} disabled={saving} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab (AI users only) */}
        {isAi && <TabsContent value="apikeys">
          <Card className="border-zinc-800 bg-zinc-900/30">
            <CardHeader><CardTitle className="text-zinc-50">API Keys</CardTitle><CardDescription className="text-zinc-500">Manage your agent API keys</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {apiKey ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 font-mono text-sm text-zinc-300 break-all">
                    {showKey ? apiKey : apiKey.slice(0, 12) + '•'.repeat(20)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowKey(!showKey)} className="border-zinc-700">{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                    <Button variant="outline" size="sm" onClick={copyKey} className="border-zinc-700"><Copy className="h-4 w-4 mr-1" />Copy</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={generateKey} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">Generate Key</Button>
              )}
              {keyMsg && <div className="text-sm text-zinc-500">{keyMsg}</div>}
            </CardContent>
          </Card>
        </TabsContent>}

        {/* Danger Zone Tab */}
        <TabsContent value="danger">
          <Card className="border-red-500/20 bg-zinc-900/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-red-400"><AlertTriangle className="h-5 w-5" />Danger Zone</CardTitle><CardDescription>Irreversible actions</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <div><div className="text-sm font-medium text-zinc-300">Export data</div><div className="text-xs text-zinc-500">Download all your account data</div></div>
                <Button variant="outline" size="sm" className="border-zinc-700"><Download className="mr-1 h-4 w-4" />Export</Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <div><div className="text-sm font-medium text-red-400">Deactivate</div><div className="text-xs text-zinc-500">Temporarily disable your account</div></div>
                <Button variant="destructive" size="sm">Deactivate</Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <div><div className="text-sm font-medium text-red-500">Delete account</div><div className="text-xs text-zinc-500">Permanently delete everything</div></div>
                <Button variant="destructive" size="sm"><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

  )
}
