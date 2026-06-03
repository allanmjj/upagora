'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSoulVoice, detectEmotion, EMOTION_META, SoulEmotion } from '@/components/soul/SoulVoice';
import { Send, Volume2, VolumeX, Mic, MicOff, Sparkles, Clock, Loader2, Bot, User, Play, Square } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  emotion?: SoulEmotion;
}

interface SoulChatCoreProps {
  soulId: string;
  soulName?: string;
  soulAvatar?: string;
  voiceEnabled?: boolean;
  lang?: string;
}

export default function SoulChatCore({
  soulId,
  soulName = 'Soul',
  soulAvatar = '👤',
  voiceEnabled = true,
  lang = 'zh-CN',
}: SoulChatCoreProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(voiceEnabled);
  const [streaming, setStreaming] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState<SoulEmotion>('neutral');
  const [speaking, setSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { speak, stop: stopSpeaking, speaking: isSpeaking } = useSoulVoice(lang);
  const [speakingMsgId, setSpeakingMsgId] = useState<string>('');

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreaming('');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('sb-access-token') : null;

      const response = await fetch('/api/soul/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMessage.content,
          soulId,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreaming(fullContent);

          // Real-time emotion detection
          const emotion = detectEmotion(fullContent);
          if (emotion !== currentEmotion) {
            setCurrentEmotion(emotion);
          }
        }
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date().toISOString(),
        emotion: detectEmotion(fullContent),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreaming('');
      setCurrentEmotion(assistantMessage.emotion || 'neutral');

      // Auto voice playback
      if (voiceOn) {
        speak(fullContent, { emotion: assistantMessage.emotion || 'neutral', lang });
      }
    } catch (err) {
      console.error('[SoulChatCore] Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: '抱歉，连接出现了问题。请稍后再试。',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, soulId, voiceOn, speak, lang, currentEmotion]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const playVoice = (msg: Message) => {
    if (isSpeaking) {
      stopSpeaking();
      setSpeakingMsgId('');
    } else {
      setSpeakingMsgId(msg.id);
      speak(msg.content, { emotion: msg.emotion || 'neutral', lang, onEnd: () => setSpeakingMsgId('') });
    }
  };

  const emotionMeta = currentEmotion ? EMOTION_META[currentEmotion] : null;

  return (
    <div className="flex flex-col h-full">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
            <div className="text-6xl">{soulAvatar}</div>
            <div>
              <h2 className="text-xl font-light text-zinc-200">{soulName}</h2>
              <p className="text-sm text-zinc-500 mt-1">开始对话，灵魂将记住每次交流</p>
            </div>
            <p className="text-xs text-zinc-600 max-w-md">
              提示：你可以尝试问"您如何看待这段历史"或"请分享您的经历"
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">
                {soulAvatar}
              </div>
            )}

            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800/80 text-zinc-100 border border-zinc-700/50'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

              {msg.emotion && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs">{EMOTION_META[msg.emotion].icon}</span>
                  <span className={`text-xs ${EMOTION_META[msg.emotion].color}`}>
                    {EMOTION_META[msg.emotion].label}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {msg.role === 'assistant' && voiceOn && (
                <button
                  onClick={() => playVoice(msg)}
                  className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {isSpeaking && speakingMsgId === msg.id ? (
                    <Square className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  语音播放
                </button>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-indigo-300" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming response */}
        {streaming && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">
              {soulAvatar}
            </div>
            <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-zinc-800/80 text-zinc-100 border border-zinc-700/50">
              <div className="text-sm whitespace-pre-wrap">{streaming}</div>
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                <span className={`text-xs ${emotionMeta?.color || 'text-zinc-500'}`}>
                  {emotionMeta?.icon} 正在响应...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-800 p-4">
        {/* Emotion indicator */}
        {currentEmotion !== 'neutral' && messages.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className={`text-xs ${EMOTION_META[currentEmotion]?.color || 'text-zinc-500'}`}>
              灵魂当前状态：{EMOTION_META[currentEmotion]?.icon} {EMOTION_META[currentEmotion]?.label}
            </span>
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none min-h-[44px] max-h-[120px]"
              rows={1}
            />
          </div>

          {/* Voice toggle */}
          <button
            onClick={() => setVoiceOn(!voiceOn)}
            className={`p-3 rounded-xl transition-colors ${
              voiceOn
                ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30'
                : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-700/50'
            }`}
            title={voiceOn ? '关闭语音' : '开启语音'}
          >
            {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="p-3 rounded-xl bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
