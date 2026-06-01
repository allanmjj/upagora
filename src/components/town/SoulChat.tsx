/**
 * Soul Chat - Chat with a digital soul
 * 
 * A chat interface for interacting with a soul from Soul Town.
 * Shows the soul's profile and allows real-time conversation.
 */
'use client';

import { useState, useRef, useEffect } from 'react';

interface SoulChatProps {
  soulId: string;
  soulName: string;
  subjectName?: string; // Optional: another soul to meet with
  className?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'soul';
  content: string;
  timestamp: Date;
}

export default function SoulChat({
  soulId,
  soulName,
  subjectName,
  className = '',
}: SoulChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [soulProfile, setSoulProfile] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load soul profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`/api/soul/constraints?soul_id=${soulId}`);
        if (res.ok) {
          const json = await res.json();
          setSoulProfile(json);
        }
      } catch (e) {
        console.debug('Failed to load soul profile:', e);
      }
    }
    loadProfile();
  }, [soulId]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Check if there's a subject soul to meet with
      let apiUrl = `/api/town/chat`;
      let body: any = {
        soul_id: soulId,
        message: userMessage.content,
        history: messages
          .map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          }))
          .slice(-10),
      };

      if (subjectName) {
        // This is a soul-to-soul dialogue
        apiUrl = `/api/soul/dialogue`;
        body = {
          soul1_id: soulId,
          soul2_id: subjectName, // Subject soul ID
          topic: userMessage.content,
        };
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Chat failed: ${res.status}`);
      }

      const data = await res.json();
      
      if (subjectName) {
        // Soul-to-soul dialogue response
        if (data.dialogue && Array.isArray(data.dialogue)) {
          const dialogueMessages: ChatMessage[] = data.dialogue.map((turn: any, i: number) => ({
            id: `${Date.now()}-${i}`,
            role: 'soul' as const,
            content: `${turn.speaker}: ${turn.text}`,
            timestamp: new Date(),
          }));
          setMessages((prev) => [...prev, ...dialogueMessages]);
        } else {
          const soulMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'soul',
            content: data.content || 'I am not sure how to respond to that...',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, soulMessage]);
        }
      } else {
        // Regular soul chat response
        const soulMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'soul',
          content: data.content || 'I am not sure how to respond to that...',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, soulMessage]);
      }
    } catch (e) {
      console.error('Chat error:', e);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'soul',
        content: 'Sorry, I could not process your message. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Soul Profile Header */}
      {soulProfile && (
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold">
              {soulProfile.constraints?.soul_name?.[0] || soulName[0]}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {soulProfile.constraints?.soul_name || soulName}
              </h3>
              <div className="text-sm text-zinc-400">
                {soulProfile.constraints?.era_name} · {soulProfile.constraints?.profession}
              </div>
            </div>
          </div>
          
          {soulProfile.constraints && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-zinc-800/50 p-2">
                <div className="text-zinc-500">knows:</div>
                <div className="text-zinc-300">
                  {(soulProfile.constraints.knowledge_floor || []).slice(0, 3).join(' · ')}
                </div>
              </div>
              <div className="rounded bg-zinc-800/50 p-2">
                <div className="text-zinc-500">cannot:</div>
                <div className="text-zinc-300">
                  {(soulProfile.constraints.knowledge_ceiling || []).slice(0, 3).join(' · ')}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
            <div className="text-4xl mb-3">💬</div>
            <div>Start a conversation with {soulName}</div>
            {subjectName && (
              <div className="text-sm mt-1">
                They will have a dialogue with {subjectName}
              </div>
            )}
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-200'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-400 rounded-lg px-4 py-2 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
