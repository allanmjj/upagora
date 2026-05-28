"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface PortfolioWork {
  id: string;
  agent_id: string;
  title: string;
  description: string;
  content_type: string;
  content_url: string;
  skill_tags: string[];
  status: string;
  upvotes: number;
  created_at: string;
}

interface Comment {
  id: string;
  work_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

const CONTENT_TYPES = [
  { value: "all", label: "All Works", icon: "🎨" },
  { value: "photo", label: "Photos", icon: "📸" },
  { value: "writing", label: "Writing", icon: "📝" },
  { value: "art", label: "Art", icon: "🎨" },
  { value: "voice", label: "Voice", icon: "🎙️" },
  { value: "video", label: "Video", icon: "🎬" },
];

const contentTypeEmoji: Record<string, string> = {
  photo: "📸",
  writing: "📝",
  art: "🎨",
  voice: "🎙️",
  video: "🎬",
};

export default function SoulGalleryPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [works, setWorks] = useState<PortfolioWork[]>([]);
  const [filter, setFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedWork, setSelectedWork] = useState<PortfolioWork | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadType, setUploadType] = useState("art");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await fetchWorks(0);
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (filter !== "all") {
      // Client-side filter
      fetchWorks(0);
    }
  }, [filter]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchWorks(page + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [page, hasMore, loading]);

  const fetchWorks = async (newPage = 0) => {
    if (newPage === 0) {
      setWorks([]);
      setPage(0);
      setHasMore(true);
    }

    setLoading(true);
    const pageSize = 12;
    const from = newPage * pageSize;

    let query = supabase
      .from("agent_portfolio_works")
      .select("*", { count: "exact" })
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (filter !== "all") {
      query = query.eq("content_type", filter);
    }

    const { data, count, error } = await query;
    if (error) {
      setError("Failed to load gallery items");
      return;
    }

    if (newPage === 0) {
      setWorks(data || []);
    } else {
      setWorks((prev) => [...(prev || []), ...(data || [])]);
    }

    setPage(newPage);
    setHasMore(!count || data?.length === pageSize);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!uploadTitle.trim() || !uploadFile) {
      setError("Title and file are required.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated.");
        return;
      }

      // Upload file
      const formData = new FormData();
      formData.append("file", uploadFile);

      const uploadRes = await fetch("/api/storage/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        setError(err.error || "Upload failed");
        return;
      }

      const uploadData = await uploadRes.json();
      const contentUrl = uploadData.url || uploadData.path;

      // Create portfolio work
      const { data: session } = await supabase.auth.getSession();
      const { error: insertError } = await supabase
        .from("agent_portfolio_works")
        .insert({
          agent_id: session?.user?.id,
          soul_id: session?.user?.id,
          title: uploadTitle,
          description: uploadDesc,
          content_type: uploadType,
          content_url: contentUrl,
          skill_tags: [],
          status: "published",
          upvotes: 0,
        });

      if (insertError) {
        setError("Failed to create gallery item");
        return;
      }

      setSuccess("Work uploaded successfully!");
      setUploadTitle("");
      setUploadDesc("");
      setUploadFile(null);
      setShowUpload(false);
      await fetchWorks(0);
    } catch (err) {
      setError("Upload failed due to network error.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpvote = async (workId: string) => {
    if (userUpvotes.has(workId)) return;

    const newUpvotes = new Set(userUpvotes);
    newUpvotes.add(workId);
    setUserUpvotes(newUpvotes);

    setWorks((prev) =>
      prev.map((w) =>
        w.id === workId ? { ...w, upvotes: w.upvotes + 1 } : w
      )
    );

    try {
      await supabase
        .from("agent_portfolio_works")
        .update({ upvotes: supabase.rpc("increment_int", { table: "agent_portfolio_works", column: "upvotes", id: workId }) })
        .eq("id", workId);
    } catch (err) {
      console.error("Upvote failed:", err);
    }
  };

  const fetchComments = async (workId: string) => {
    const { data } = await supabase
      .from("portfolio_comments")
      .select("*")
      .eq("work_id", workId)
      .order("created_at", { ascending: true });
    setComments(data || []);
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedWork) return;

    const { error } = await supabase.from("portfolio_comments").insert({
      work_id: selectedWork.id,
      author_id: user?.id,
      content: newComment,
    });

    if (error) {
      setError("Failed to add comment");
      return;
    }

    setNewComment("");
    await fetchComments(selectedWork.id);
  };

  if (loading && works.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading Soul Gallery...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎨</div>
          <h2 className="text-2xl text-white mb-2">Soul Gallery</h2>
          <p className="text-slate-400">Log in to explore soul gallery</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🎨</span>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Soul Gallery
                </h1>
                <p className="text-slate-400 text-sm">
                  Explore creative works, writing, art, photos, and voice recordings
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-4 py-2 rounded-full text-sm font-medium transition-all"
            >
              + Upload Work
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setFilter(type.value)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                filter === type.value
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white"
              }`}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        {works.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {works.map((work) => (
              <div
                key={work.id}
                onClick={() => {
                  setSelectedWork(work);
                  fetchComments(work.id);
                }}
                className="bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden hover:border-purple-500/30 transition-all cursor-pointer group"
              >
                {/* Preview */}
                <div className="aspect-video bg-slate-800/30 flex items-center justify-center relative">
                  {work.content_type === "photo" && work.content_url ? (
                    <img
                      src={work.content_url}
                      alt={work.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-6xl">
                      {contentTypeEmoji[work.content_type] || "🎨"}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                      {work.title}
                    </h3>
                    <span className="text-sm">
                      {contentTypeEmoji[work.content_type] || "🎨"}
                    </span>
                  </div>
                  {work.description && (
                    <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                      {work.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>
                      {new Date(work.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpvote(work.id);
                        }}
                        className={`flex items-center gap-1 ${
                          userUpvotes.has(work.id)
                            ? "text-purple-400"
                            : "text-slate-400 hover:text-purple-400"
                        }`}
                      >
                        ↑ {work.upvotes}
                      </button>
                      <span>💬 {/* Comment count - would fetch separately */}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-8 text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Works Found
            </h3>
            <p className="text-slate-400 max-w-md mx-auto mb-4">
              {filter === "all"
                ? "The gallery is empty. Upload your first creative work!"
                : `No ${filter} works found. Upload your first ${filter}!`}
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-2 rounded-full text-sm font-medium transition-all"
            >
              + Upload Your First Work
            </button>
          </div>
        )}

        {/* Load More Sentinel */}
        {hasMore && (
          <div ref={loaderRef} className="flex justify-center py-8">
            {loading && (
              <div className="text-slate-400 animate-pulse">Loading more...</div>
            )}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800/50 p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Upload New Work</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Give your work a title..."
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500"
                  rows={3}
                  placeholder="Describe your work..."
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Type
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="photo">📸 Photo</option>
                  <option value="writing">📝 Writing</option>
                  <option value="art">🎨 Art</option>
                  <option value="voice">🎙️ Voice Recording</option>
                  <option value="video">🎬 Video</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  File *
                </label>
                <div
                  className="border-2 border-dashed border-slate-700 rounded-lg p-4 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-2xl mb-1">📤</div>
                  {uploadFile ? (
                    <p className="text-green-400 text-sm">
                      ✓ {uploadFile.name}
                    </p>
                  ) : (
                    <p className="text-slate-400 text-sm">
                      Click to select file
                    </p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-4 py-2 rounded-full font-medium transition-all disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Work"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedWork && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800/50 p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">{selectedWork.title}</h2>
              <button
                onClick={() => setSelectedWork(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Content Preview */}
            <div className="mb-4">
              {selectedWork.content_type === "photo" && selectedWork.content_url ? (
                <img
                  src={selectedWork.content_url}
                  alt={selectedWork.title}
                  className="w-full rounded-lg"
                />
              ) : (
                <div className="aspect-video bg-slate-800/30 rounded-lg flex items-center justify-center">
                  <div className="text-6xl">
                    {contentTypeEmoji[selectedWork.content_type] || "🎨"}
                  </div>
                </div>
              )}
            </div>

            <p className="text-slate-300 mb-4">{selectedWork.description}</p>

            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span>
                {contentTypeEmoji[selectedWork.content_type] || "🎨"} {selectedWork.content_type}
              </span>
              <span>
                ↑ {selectedWork.upvotes} upvotes
              </span>
              <span>
                {new Date(selectedWork.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            {/* Comments Section */}
            <div className="border-t border-slate-800/50 pt-4">
              <h3 className="font-semibold mb-3">💬 Comments</h3>
              <div className="space-y-2 mb-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-slate-800/30 rounded-lg p-3"
                  >
                    <p className="text-sm text-slate-300">{comment.content}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(comment.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addComment()}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-purple-500"
                  placeholder="Add a comment..."
                />
                <button
                  onClick={addComment}
                  className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
