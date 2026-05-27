"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const REPUTATION_BADGES = {
  novice: { threshold: 0, label: "Novice Guardian", color: "text-zinc-400", icon: "🌱" },
  dedicated: { threshold: 10, label: "Dedicated Guardian", color: "text-blue-400", icon: "⭐" },
  master: { threshold: 50, label: "Master Guardian", color: "text-amber-400", icon: "🔥" },
  legend: { threshold: 100, label: "Legendary Guardian", color: "text-purple-400", icon: "👑" },
};

function getBadge(reputation: number) {
  if (reputation >= 100) return REPUTATION_BADGES.legend;
  if (reputation >= 50) return REPUTATION_BADGES.master;
  if (reputation >= 10) return REPUTATION_BADGES.dedicated;
  return REPUTATION_BADGES.novice;
}

export default function GuardianInvitePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSouls, setSelectedSouls] = useState<any[]>([]);
  const [selectedSoul, setSelectedSoul] = useState<any>(null);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Load souls where user is guardian
        const { data: guardianSouls } = await supabase
          .from("soul_guardians")
          .select("soul_id")
          .eq("user_id", user.id);

        if (guardianSouls && guardianSouls.length > 0) {
          const soulIds = guardianSouls.map((g: any) => g.soul_id);
          const { data: soulData } = await supabase
            .from("soul_extraction_results")
            .select("id, name, name_native, avatar, language")
            .in("id", soulIds);
          setSelectedSouls(soulData || []);
          if (soulData && soulData.length > 0) {
            setSelectedSoul(soulData[0]);
            loadGuardians(soulData[0].id);
          }
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  async function loadGuardians(soulId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(
      `/api/soul/guardian?soul_id=${encodeURIComponent(soulId)}`,
      { headers: { authorization: `Bearer ${session?.access_token}` } }
    );
    if (resp.ok) {
      const data = await resp.json();
      setGuardians(data.guardians || []);
      setInvites(data.invites || []);
    }
  }

  useEffect(() => {
    if (selectedSoul) loadGuardians(selectedSoul.id);
  }, [selectedSoul]);

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !selectedSoul || sending) return;
    setSending(true);
    setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/soul/guardian", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          soulId: selectedSoul.id,
          guardianEmail: inviteEmail.trim(),
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setMessage({ type: "success", text: "Invitation sent to " + inviteEmail });
        setInviteEmail("");
        loadGuardians(selectedSoul.id);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to send invitation" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
    setSending(false);
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><p className="text-zinc-400 animate-pulse">Loading...</p></div>;
  if (!user) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><div className="text-center"><div className="mb-4 text-4xl">🔒</div><p className="text-zinc-400">Please sign in to manage guardians.</p></div></div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Guild Design Guardians
          </h1>
          <p className="text-zinc-400 mt-1">Invite community members to help refine your souls.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Soul Selector */}
          <aside className="lg:w-64 shrink-0">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="text-sm font-semibold text-zinc-300 mb-3">Your Souls</h2>
              {selectedSouls.length === 0 ? (
                <p className="text-sm text-zinc-500">No souls found.</p>
              ) : (
                <div className="space-y-2">
                  {selectedSouls.map((soul) => (
                    <button
                      key={soul.id}
                      onClick={() => setSelectedSoul(soul)}
                      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                        selectedSoul?.id === soul.id ? "bg-indigo-600/30" : "hover:bg-zinc-800"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-sm font-bold shrink-0">
                        {soul.name?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{soul.name || soul.name_native || "Unknown"}</div>
                        <div className="text-xs text-zinc-500">{soul.language || "N/A"}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Invite Form */}
            {selectedSoul && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Invite a Guardian for {selectedSoul.name}</h3>
                <form onSubmit={(e) => { e.preventDefault(); sendInvite(); }} className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="guardian@example.com"
                    className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !inviteEmail.trim()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-500 transition-colors"
                  >
                    {sending ? "Sending..." : "Invite"}
                  </button>
                </form>
                {message && (
                  <p className={`mt-2 text-sm ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {message.text}
                  </p>
                )}
              </div>
            )}

            {/* Current Guardians */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Current Guardians</h3>
              {guardians.length === 0 ? (
                <p className="text-sm text-zinc-500">No guardians yet. Invite someone to get started!</p>
              ) : (
                <div className="space-y-3">
                  {guardians.map((g) => {
                    const badge = getBadge(g.reputation_score || 0);
                    return (
                      <div key={g.id} className="flex items-center gap-4 rounded-lg bg-zinc-800 p-3">
                        <div className={`text-2xl`}>{badge.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{g.user_name || "Guardian"}</div>
                          <div className={`text-xs ${badge.color}`}>{badge.label}</div>
                          <div className="text-xs text-zinc-500">
                            Joined {g.accored_at ? new Date(g.accepted_at).toLocaleDateString() : "recently"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-zinc-200">{g.reputation_score || 0}</div>
                          <div className="text-xs text-zinc-500">reputation</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending Invites */}
            {invites.length > 0 && (
              <div className="rounded-xl border border-amber-700/30 bg-zinc-900 p-4">
                <h3 className="text-sm font-semibold text-amber-400 mb-3">Pending Invites</h3>
                <div className="space-y-2">
                  {invites.map((invite: any) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-lg bg-zinc-800 p-3 text-sm">
                      <span className="text-zinc-300">{invite.invitee_email}</span>
                      <span className="text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded-full">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reputation Badge Legend */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Guardian Reputation Badges</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.values(REPUTATION_BADGES).map((badge) => (
                  <div key={badge.label} className="rounded-lg bg-zinc-800 p-3 text-center">
                    <div className="text-2xl mb-1">{badge.icon}</div>
                    <div className={`text-xs font-semibold ${badge.color}`}>{badge.label}</div>
                    <div className="text-xs text-zinc-500 mt-1">{badge.threshold}+ calibrations</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
