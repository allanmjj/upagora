'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Shield, Users, Send, Check, X, Loader2, AlertCircle } from 'lucide-react'

interface Guardian {
  id: string
  name: string
  email: string
  relationship: string
  status: 'pending' | 'active' | 'declined'
  joined_at: string
  calibrations_made: number
}

interface GuardianInviteProps {
  currentGuardians: Guardian[]
  loading: boolean
  onInvite: (email: string, relationship: string) => Promise<boolean>
  onRemove: (id: string) => Promise<boolean>
}

export default function GuardianInvite({
  currentGuardians,
  loading,
  onInvite,
  onRemove
}: GuardianInviteProps) {
  const [email, setEmail] = useState('')
  const [relationship, setRelationship] = useState('family')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleInvite() {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address')
      return
    }
    
    setError('')
    setSuccess('')
    setInviting(true)
    
    try {
      const ok = await onInvite(email, relationship)
      if (ok) {
        setSuccess(`Invitation sent to ${email}`)
        setEmail('')
      } else {
        setError('Invitation failed — user may already be a guardian or email is invalid')
      }
    } catch {
      setError('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(id: string) {
    if (confirm('Confirm removal of this guardian?')) {
      await onRemove(id)
    }
  }

  const relationshipOptions = [
    { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
    { value: 'spouse', label: 'Spouse', icon: '💑' },
    { value: 'child', label: 'Child', icon: '👶' },
    { value: 'friend', label: 'Close Friend', icon: '🤝' },
    { value: 'mentee', label: 'Student', icon: '📚' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-indigo-400" />
          <h3 className="text-xl font-bold text-zinc-50">Guardian Management</h3>
        </div>
        <p className="text-sm text-zinc-500">
          Guardians are responsible for calibrating and guiding your digital soul's evolution. Invite family or close friends to become your guardians.
        </p>
      </div>

      {/* Invite form */}
      <Card className="p-4 border-zinc-800 bg-zinc-900/50">
        <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
          <Send className="h-4 w-4" />
          Invite a Guardian
        </h4>
        
        <div className="grid gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Email Address</label>
            <Input
              placeholder="guardian@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-zinc-200"
            />
          </div>
          
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Relationship</label>
            <div className="flex flex-wrap gap-2">
              {relationshipOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRelationship(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    relationship === opt.value
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  <span className="mr-1">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleInvite}
              disabled={inviting || !email}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {inviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
            
            {currentGuardians.filter(g => g.status === 'active').length >= 5 && (
              <div className="text-xs text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>Guardian limit reached (5)</span>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              {error}
            </div>
          )}
          
          {success && (
            <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-2">
              {success}
            </div>
          )}
        </div>
      </Card>

      {/* Current guardians list */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-zinc-500" />
          <h4 className="text-sm font-semibold text-zinc-300">
            Current Guardians ({currentGuardians.length})
          </h4>
        </div>

        {currentGuardians.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
            <Shield className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
            <p className="text-sm">No guardians yet</p>
            <p className="text-xs text-zinc-600 mt-1">Invite family or close friends to become your soul guardians</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentGuardians.map((guardian) => (
              <Card 
                key={guardian.id}
                className="p-3 border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      guardian.status === 'active' 
                        ? 'bg-green-500/20' 
                        : guardian.status === 'pending'
                          ? 'bg-amber-500/20'
                          : 'bg-red-500/20'
                    }`}>
                      {guardian.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200">{guardian.name}</span>
                        <Badge 
                          variant={
                            guardian.status === 'active' ? 'primary' :
                            guardian.status === 'pending' ? 'outline' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {guardian.status === 'active' ? 'Active' :
                           guardian.status === 'pending' ? 'Pending' : 'Declined'}
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {guardian.email} · {relationshipOptions.find(r => r.value === guardian.relationship)?.icon} {relationshipOptions.find(r => r.value === guardian.relationship)?.label}
                        {guardian.calibrations_made > 0 && (
                          <span className="ml-2 text-indigo-400">
                            {guardian.calibrations_made} calibrations
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {guardian.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-600 hover:text-red-400"
                      onClick={() => handleRemove(guardian.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
        <div className="text-xs text-indigo-300 space-y-1">
          <p className="font-medium flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Guardian Permissions
          </p>
          <p>· Can participate in soul calibration, correcting behavioral drift</p>
          <p>· Can view soul evolution history and activity logs</p>
          <p>· Cannot export or delete soul data</p>
        </div>
      </div>
    </div>
  )
}
