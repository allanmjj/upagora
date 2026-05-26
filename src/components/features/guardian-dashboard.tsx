'use client';

import { useState, useEffect } from 'react';
import { Shield, Vote, PenTool, // Essential Guardian icons
  CheckCircle, TrendingUp, AlertTriangle, Sparkles, Clock, Heart
} from 'lucide-react';

export interface GuardianStats {
  heart_verifications: number;
  total_votes: number;
  suspend_votes: number;
  downcase_votes: number;
  revive_votes: number;
  total_signatures: number;
  signature_text: string | null;
  guardian_rank: string;
}

export function GuardianDashboard({ share_slug }: { share_slug: string }) {
  const [stats, setStats] = useState<GuardianStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [section, setSection] = useState<'verify' | 'vote' | 'sign' | null>(null);
  const [challengeResponse, setChallengeResponse] = useState('');
  const [voteReason, setVoteReason] = useState('');
  const [signText, setSignText] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchStats();
  }, [share_slug]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('sb-access-token');
      const [verifRes, voteRes, sigRes] = await Promise.all([
        fetch(`/api/soul/guardian/heart-verifications?share_slug=${share_slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/soul/guardian/votes?share_slug=${share_slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/soul/guardian/signatures?share_slug=${share_slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (verifRes.ok && voteRes.ok && sigRes.ok) {
        const verif = await verifRes.json();
        const votes = await voteRes.json();
        const sigs = await sigRes.json();

        const voter_verif = verif.data?.length || 0;
        const voter_votes = votes.data?.length || 0;
        const voter_sigs = sigs.data?.length || 0;

        const vote_counts = (votes.data || []).reduce((acc: any, v: any) => {
          acc[v.action] = (acc[v.action] || 0) + 1;
          return acc;
        }, {});

        const sig = sigs.data?.[0] || null;

        // Calculate guardian rank
        const score = voter_verif * 10 + voter_votes * 5 + voter_sigs * 15;
        let rank = 'Observer';
        if (score >= 80) rank = 'Legendary Soul Guardian';
        else if (score >= 50) rank = 'Soul Sovereign';
        else if (score >= 30) rank = 'Soul Keeper';
        else if (score >= 15) rank = 'Soul Apprentice';

        setStats({
          heart_verifications: voter_verif,
          total_votes: voter_votes,
          suspend_votes: vote_counts.suspend || 0,
          downcase_votes: vote_counts.downcase || 0,
          revive_votes: vote_counts.revive || 0,
          total_signatures: voter_sigs,
          signature_text: sig?.signature_text || null,
          guardian_rank: rank,
        });
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setActionLoading('verify');
    setMessage(null);
    try {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/soul/guardian/verify-heart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          share_slug,
          challenge: 'Heart Verification Challenge',
          response: challengeResponse,
          dimension: 'cognitive',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Heart verified! Your guardian bond strengthens.', type: 'success' });
        setChallengeResponse('');
        setSection(null);
        await fetchStats();
      } else {
        setMessage({ text: data.error || 'Verification failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleVote = async (action: 'suspend' | 'downcase' | 'revive') => {
    setActionLoading(action);
    setMessage(null);
    try {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/soul/guardian/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ share_slug, action, reason: voteReason }),
      });
      const data = await res.json();
      if (res.ok) {
        const actionLabel = action === 'suspend' ? 'paused' : action === 'downcase' ? 'de-prioritized' : 'revived';
        setMessage({ text: `Vote recorded: soul ${actionLabel}.`, type: 'success' });
        setVoteReason('');
        setSection(null);
        await fetchStats();
      } else {
        setMessage({ text: data.error || 'Vote failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSign = async () => {
    if (!signText || signText.trim().length < 2) {
      setMessage({ text: 'Signature text too short (min 2 chars)', type: 'error' });
      return;
    }
    setActionLoading('sign');
    setMessage(null);
    try {
      const token = localStorage.getItem('sb-access-token');
      const res = await fetch('/api/soul/guardian/sig', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ share_slug, signature_text: signText }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Soul signed with your authentic signature! ✨', type: 'success' });
        setSignText('');
        setSection(null);
        await fetchStats();
      } else {
        setMessage({ text: data.error || 'Signature failed', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/50 p-6 animate-pulse">
        <div className="h-6 w-40 bg-zinc-800 rounded mb-4" />
        <div className="h-20 w-full bg-zinc-800 rounded" />
      </div>
    );
  }

  // Rank badge colors
  const rankColors: Record<string, string> = {
    'Observer': 'bg-zinc-800 text-zinc-400',
    'Soul Apprentice': 'bg-blue-900/50 text-blue-400',
    'Soul Keeper': 'bg-purple-900/50 text-purple-400',
    'Soul Sovereign': 'bg-amber-900/50 text-amber-400',
    'Legendary Soul Guardian': 'bg-rose-900/50 text-rose-400 border border-rose-500/30',
  };

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-rose-500/10 p-2">
            <Shield className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Guardian Dashboard</h2>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${rankColors[stats?.guardian_rank || 'Observer']}`}>
              {stats?.guardian_rank}
            </span>
          </div>
        </div>
        <Sparkles className={`h-5 w-5 ${stats && (stats.heart_verifications || stats.total_votes || stats.total_signatures) > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-600'}`} />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <button
          onClick={() => setSection(section === 'verify' ? null : 'verify')}
          disabled={stats?.heart_verifications ? true : false}
          className={`p-3 rounded-lg border text-center transition-colors ${
            stats?.heart_verifications
              ? 'bg-green-900/20 border-green-800/50 text-green-400'
              : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-rose-500/50 hover:text-rose-400'
          }`}
        >
          <Heart className="h-4 w-4 mx-auto mb-1" />
          <div className="text-xs">{stats?.heart_verifications ? 'Verified ✓' : 'Verify Heart'}</div>
        </button>

        <button
          onClick={() => setSection(section === 'vote' ? null : 'vote')}
          disabled={stats?.total_votes ? true : false}
          className={`p-3 rounded-lg border text-center transition-colors ${
            stats?.total_votes
              ? 'bg-green-900/20 border-green-800/50 text-green-400'
              : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-blue-500/50 hover:text-blue-400'
          }`}
        >
          <Vote className="h-4 w-4 mx-auto mb-1" />
          <div className="text-xs">{stats?.total_votes ? 'Voted ✓' : 'Vote'}</div>
        </button>

        <button
          onClick={() => setSection(section === 'sign' ? null : 'sign')}
          disabled={stats?.total_signatures ? true : false}
          className={`p-3 rounded-lg border text-center transition-colors ${
            stats?.total_signatures
              ? 'bg-green-900/20 border-green-800/50 text-green-400'
              : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400'
          }`}
        >
          <PenTool className="h-4 w-4 mx-auto mb-1" />
          <div className="text-xs">{stats?.total_signatures ? 'Signed ✓' : 'Sign Soul'}</div>
        </button>
      </div>

      {/* Expandable sections */}
      {section === 'verify' && !stats?.heart_verifications && (
        <div className="mb-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
          <label className="block text-sm text-zinc-400 mb-2">
            Heart Verification: Prove your deep connection to this soul
          </label>
          <textarea
            value={challengeResponse}
            onChange={e => setChallengeResponse(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 mb-2 focus:border-rose-500/50 outline-none"
            rows={3}
            placeholder="Share a moment that proves you understand this soul's essence..."
          />
          <button
            onClick={handleVerify}
            disabled={actionLoading === 'verify' || !challengeResponse.trim()}
            className="w-full py-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'verify' ? 'Verifying...' : 'Verify Heart'}
          </button>
        </div>
      )}

      {section === 'vote' && !stats?.total_votes && (
        <div className="mb-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
          <label className="block text-sm text-zinc-400 mb-2">
            Guardian Vote: What should happen to this soul?
          </label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => handleVote('suspend')}
              disabled={actionLoading === 'suspend'}
              className="p-3 rounded-lg bg-red-900/20 border border-red-800/50 text-red-400 hover:bg-red-900/30 disabled:opacity-50"
            >
              <AlertTriangle className="h-4 w-4 mx-auto mb-1" />
              <div className="text-xs">Suspend</div>
            </button>
            <button
              onClick={() => handleVote('downcase')}
              disabled={actionLoading === 'downcase'}
              className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-800/50 text-yellow-400 hover:bg-yellow-900/30 disabled:opacity-50"
            >
              <TrendingUp className="h-4 w-4 mx-auto mb-1 rotate-180" />
              <div className="text-xs">Downcase</div>
            </button>
            <button
              onClick={() => handleVote('revive')}
              disabled={actionLoading === 'revive'}
              className="p-3 rounded-lg bg-green-900/20 border border-green-800/50 text-green-400 hover:bg-green-900/30 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 mx-auto mb-1" />
              <div className="text-xs">Revive</div>
            </button>
          </div>
          <textarea
            value={voteReason}
            onChange={e => setVoteReason(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-blue-500/50 outline-none"
            rows={2}
            placeholder="Reason for your vote (optional)..."
          />
        </div>
      )}

      {section === 'sign' && !stats?.total_signatures && (
        <div className="mb-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
          <label className="block text-sm text-zinc-400 mb-2">
            Sign this Soul: Leave your authentic mark
          </label>
          <textarea
            value={signText}
            onChange={e => setSignText(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 mb-2 focus:border-amber-500/50 outline-none"
            rows={3}
            placeholder="Write your guardian blessing or message for this soul..."
          />
          <button
            onClick={handleSign}
            disabled={actionLoading === 'sign' || !signText.trim() || signText.trim().length < 2}
            className="w-full py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'sign' ? 'Signing...' : 'Sign Soul'}
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            <div className="text-lg font-bold text-zinc-200">{stats.heart_verifications}</div>
            <div className="text-xs text-zinc-500">Heart Checks</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            <div className="text-lg font-bold text-zinc-200">{stats.total_votes}</div>
            <div className="text-xs text-zinc-500">Votes Cast</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            <div className="text-lg font-bold text-zinc-200">{stats.total_signatures}</div>
            <div className="text-xs text-zinc-500">Signatures</div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
            <div className="text-lg font-bold text-zinc-200">
              {stats.revive_votes}↑ {stats.suspend_votes}↓
            </div>
            <div className="text-xs text-zinc-500">Revive/Suspend</div>
          </div>
        </div>
      )}

      {stats?.signature_text && (
        <div className="mt-3 p-3 rounded-lg bg-amber-900/20 border border-amber-800/30 text-amber-300 text-sm italic">
          ✨ "{stats.signature_text}"
        </div>
      )}

      {message && (
        <div className={`mt-3 text-center text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
