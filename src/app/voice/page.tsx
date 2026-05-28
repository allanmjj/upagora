"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface VoiceSample {
  id: string;
  status: string;
  duration_seconds: number;
  created_at: string;
  file_path?: string;
}

interface VoiceStatus {
  samples: number;
  total_duration_seconds: number;
  pending: number;
  processed: number;
  quality_estimate: string;
  recommendation: string;
  samples_list: VoiceSample[];
}

export default function VoiceCloningPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [playingSample, setPlayingSample] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await fetchVoiceStatus();
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const fetchVoiceStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/voice/clone", {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch voice status:", err);
    }
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/wav" });
        await uploadVoiceSample(audioBlob, "recording.wav");
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    if (!file.type.startsWith("audio/")) {
      setError("Please upload an audio file (WAV, MP3, M4A, etc.).");
      return;
    }

    await uploadVoiceSample(file, file.name);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadVoiceSample = async (audioBlob: Blob, filename: string) => {
    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated. Please log in.");
        return;
      }

      const formData = new FormData();
      formData.append("audio", audioBlob, filename);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const res = await fetch("/api/voice/clone", {
        method: "POST",
        headers: { authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (res.ok) {
        const data = await res.json();
        setSuccess("Voice sample uploaded successfully!");
        await fetchVoiceStatus();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Upload failed");
      }
    } catch (err) {
      setError("Upload failed due to network error.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const playSample = async (sample: VoiceSample) => {
    if (!sample.file_path) return;

    try {
      const { data } = await supabase.storage
        .from("soul_assets")
        .createSignedUrl(sample.file_path, 300);

      if (data?.signedUrl) {
        if (audioRef.current) {
          audioRef.current.src = data.signedUrl;
          audioRef.current.play();
        }
        setPlayingSample(sample.id);
      }
    } catch (err) {
      console.error("Failed to play sample:", err);
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingSample(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "good": return "text-green-400";
      case "moderate": return "text-yellow-400";
      default: return "text-red-400";
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case "good": return "🟢 Good Quality";
      case "moderate": return "🟡 Moderate Quality";
      default: return "🔴 Low Quality";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading voice studio...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎙️</div>
          <h2 className="text-2xl text-white mb-2">Voice Studio</h2>
          <p className="text-slate-400">Please log in to access voice cloning</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <audio ref={audioRef} onEnded={() => setPlayingSample(null)} />
      
      {/* Header */}
      <header className="border-b border-slate-800/50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🎙️</span>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Voice Cloning Studio
              </h1>
              <p className="text-slate-400 text-sm">Train your soul&apos;s unique voice with audio samples</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {/* Status Dashboard */}
        {status && (
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>📊</span> Voice Training Progress
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-400">{status.samples}</div>
                <div className="text-slate-400 text-sm">Total Samples</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">{formatTime(status.total_duration_seconds)}</div>
                <div className="text-slate-400 text-sm">Total Duration</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{status.pending}</div>
                <div className="text-slate-400 text-sm">Pending</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                <div className={`text-3xl font-bold ${getQualityColor(status.quality_estimate)}`}>
                  {status.quality_estimate === "good" ? "🟢" : status.quality_estimate === "moderate" ? "🟡" : "🔴"}
                </div>
                <div className="text-slate-400 text-sm">{getQualityBadge(status.quality_estimate)}</div>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>💡</span>
                <span className="text-slate-300">{status.recommendation}</span>
              </div>
              {status.total_duration_seconds < 60 && (
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (status.total_duration_seconds / 60) * 100)}%` }}
                  />
                </div>
              )}
              {status.total_duration_seconds >= 60 && (
                <div className="text-green-400 text-sm mt-2">
                  ✓ 60+ seconds collected — Ready for voice synthesis!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recording Section */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🎤</span> Record Voice Sample
          </h2>
          
          <div className="flex flex-col items-center gap-4">
            {/* Recording Visualizer */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {recording && (
                <>
                  <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                  <div className="absolute inset-4 bg-red-500/30 rounded-full animate-pulse" />
                </>
              )}
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={uploading}
                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center text-3xl transition-all duration-200 ${
                  recording
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {recording ? "⏹️" : "🎙️"}
              </button>
            </div>

            {recording && (
              <div className="text-red-400 font-mono text-xl">{formatTime(recordingTime)}</div>
            )}

            <p className="text-slate-400 text-sm text-center max-w-md">
              {recording
                ? "Recording... Click to stop when finished."
                : "Click to start recording. Speak naturally for best results."}
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>📁</span> Upload Audio File
          </h2>
          
          <div
            className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-4xl mb-2">📤</div>
            <p className="text-slate-300 mb-1">Click to upload audio file</p>
            <p className="text-slate-500 text-sm">WAV, MP3, M4A, OGG — Max 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-slate-400 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>💡</span> Tips for Better Voice Cloning
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/30 rounded-xl p-4">
              <div className="text-purple-400 mb-2">🎯 Duration</div>
              <p className="text-slate-300 text-sm">Aim for 60+ seconds total. Collect from multiple recording sessions for variety.</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-4">
              <div className="text-blue-400 mb-2">🗣️ Diversity</div>
              <p className="text-slate-300 text-sm">Read different texts with varying emotions — happy, serious, storytelling tone.</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-4">
              <div className="text-green-400 mb-2">🔇 Environment</div>
              <p className="text-slate-300 text-sm">Record in a quiet room. Avoid background noise and echo for clearest samples.</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-4">
              <div className="text-pink-400 mb-2">📱 Format</div>
              <p className="text-slate-300 text-sm">WAV or high-quality MP3 works best. 16-bit/44.1kHz or higher is ideal.</p>
            </div>
          </div>
        </div>

        {/* Samples List */}
        {status?.samples_list && status.samples_list.length > 0 && (
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span>🎧</span> Your Voice Samples
              </h2>
              <button
                onClick={fetchVoiceStatus}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                ↻ Refresh
              </button>
            </div>
            
            <div className="space-y-2">
              {status.samples_list.map((sample) => (
                <div
                  key={sample.id}
                  className="bg-slate-800/30 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🎵</div>
                    <div>
                      <div className="text-sm text-white">
                        {new Date(sample.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {sample.duration_seconds > 0 ? formatTime(sample.duration_seconds) : "Processing..."}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      sample.status === "processed"
                        ? "bg-green-500/20 text-green-400"
                        : sample.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-slate-500/20 text-slate-400"
                    }`}>
                      {sample.status}
                    </span>
                    
                    {sample.file_path && (
                      <button
                        onClick={playingSample === sample.id ? stopPlayback : () => playSample(sample)}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1 rounded-lg text-sm transition-colors"
                      >
                        {playingSample === sample.id ? "⏹️ Stop" : "▶️ Play"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Samples State */}
        {!status?.samples_list?.length && (
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-8 text-center">
            <div className="text-5xl mb-3">🎙️</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Voice Samples Yet</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Start by recording voice samples or uploading audio files. Collect 60+ seconds of your voice for the best cloning quality.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
