"use client";

import { useState, useRef } from "react";

export default function SoulImportPage() {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((f) => [...f, ...dropped]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((f) => [...f, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((f) => f.filter((_, i) => i !== idx));
  };

  const startImport = async () => {
    setImporting(true);
    setProgress(0);
    setResult(null);

    let content = "";

    // Read files
    for (let i = 0; i < files.length; i++) {
      content += `\n\n--- File: ${files[i].name} ---\n`;
      content += await files[i].text();
      setProgress(Math.round(((i + 1) / files.length) * 30));
    }

    // Get textarea content
    const textarea = textareaRef.current;
    if (textarea && textarea.value.trim()) {
      content += `\n\n--- Pasted Text ---\n${textarea.value}`;
    }

    setProgress(40);

    try {
      const { data: { session } } = await new Promise<{ data: { session: any } }>((resolve) => {
        import("@supabase/supabase-js").then(({ createClient }) => {
          const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          sb.auth.getSession().then(resolve);
        });
      });

      const resp = await fetch("/api/soul/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          subject_name: "Imported Soul",
          subject_context: content,
        }),
      });

      setProgress(80);

      if (resp.ok) {
        const data = await resp.json();
        setResult(data);
        setProgress(100);
      } else {
        const err = await resp.json();
        setResult({ error: err.error || "Import failed" });
      }
    } catch (err: any) {
      setResult({ error: err.message || "Import failed" });
    }

    setImporting(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Import Soul Data
          </h1>
          <p className="text-zinc-400 mt-2">
            Upload chat logs, writing samples, emails, or paste text directly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Area */}
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                dragging
                  ? "border-emerald-500 bg-emerald-950/30"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
              }`}
            >
              <div className="text-4xl mb-4">📂</div>
              <p className="text-lg font-medium mb-1">Drop files here</p>
              <p className="text-sm text-zinc-500 mb-4">
                .txt, .md, .json, .csv, .html supported
              </p>
              <label className="cursor-pointer inline-block px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors">
                Browse Files
                <input
                  type="file"
                  multiple
                  accept=".txt,.md,.json,.csv,.html,.doc"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-zinc-800 px-3 py-2 text-sm"
                    >
                      <span className="truncate flex-1">{f.name}</span>
                      <button
                        onClick={() => removeFile(i)}
                        className="ml-2 text-zinc-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pasted Text Area */}
            <div className="mt-4">
              <label className="block text-sm text-zinc-400 mb-2">
                Or paste text directly:
              </label>
              <textarea
                ref={textareaRef}
                rows={6}
                placeholder="Chat logs, journal entries, emails, interviews..."
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
              />
            </div>
          </div>

          {/* Import Controls */}
          <div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h3 className="font-bold mb-4">Import Options</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Subject Name</label>
                  <input
                    type="text"
                    placeholder="Who is this data about?"
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Data Type</label>
                  <select className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-600">
                    <option value="chat">Chat Logs</option>
                    <option value="writing">Writing Samples</option>
                    <option value="mixed">Mixed Content</option>
                    <option value="interview">Interview / Q&A</option>
                  </select>
                </div>
              </div>

              {importing ? (
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-zinc-400 mb-2">
                    <span>Importing...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : result ? (
                <div className={`rounded-xl p-4 mb-6 text-sm ${
                  result.error ? "bg-red-900/20 text-red-400" : "bg-emerald-900/20 text-emerald-400"
                }`}>
                  {result.error ? `❌ ${result.error}` : "✓ Import complete! Soul extraction started."}
                </div>
              ) : null}

              <button
                onClick={startImport}
                disabled={importing || (files.length === 0 && !textareaRef.current?.value?.trim())}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 font-medium hover:from-emerald-500 hover:to-cyan-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importing ? "Importing..." : "Start Import & Extract"}
              </button>
            </div>

            {/* Info Card */}
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h3 className="font-bold mb-3">What happens during import?</h3>
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                  <p>Your files/text are analyzed across 7 dimensions of personality</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                  <p>AI generates a persona.md and 9D knowledge constraints</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                  <p>Key memories are seeded into the semantic search index</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">4</div>
                  <p>You enter Guardian Calibration to refine and improve the soul</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
