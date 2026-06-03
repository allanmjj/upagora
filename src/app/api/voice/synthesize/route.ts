import { NextRequest, NextResponse } from 'next/server';

/**
 * Voice Studio TTS Webhook API
 *
 * Supports multiple TTS backends:
 * - edge-tts (free, local)
 * - OpenAI TTS (paid, high quality)
 * - ElevenLabs (paid, premium quality)
 *
 * Standardized interface:
 * POST /api/voice/synthesize
 * Body: { text, voice, backend, language, speed, pitch }
 * Response: { audio_url, duration, backend }
 */

interface TTSRequest {
  text: string;
  voice: string;
  backend?: 'edge' | 'openai' | 'elevenlabs';
  language?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'ogg';
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    
    const { text, voice, backend = 'edge', language = 'en', speed = 1, pitch = 0 } = body;
    
    if (!text || !voice) {
      return NextResponse.json(
        { error: 'Missing required fields: text, voice' },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    let audioUrl: string;
    let duration: number;

    switch (backend) {
      case 'edge':
        const edgeResult = await synthesizeEdgeTTS(text, voice, language, speed, pitch);
        audioUrl = edgeResult.audioUrl;
        duration = edgeResult.duration;
        break;
      
      case 'openai':
        const openaiResult = await synthesizeOpenAITTS(text, voice, speed);
        audioUrl = openaiResult.audioUrl;
        duration = openaiResult.duration;
        break;
      
      case 'elevenlabs':
        const elevenResult = await synthesizeElevenLabs(text, voice);
        audioUrl = elevenResult.audioUrl;
        duration = elevenResult.duration;
        break;
      
      default:
        return NextResponse.json(
          { error: `Unsupported backend: ${backend}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      audio_url: audioUrl,
      duration,
      backend,
      voice,
      language,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[voice/synthesize] Error:', err);
    return NextResponse.json(
      { error: 'Failed to synthesize speech' },
      { status: 500 }
    );
  }
}

async function synthesizeEdgeTTS(
  text: string,
  voice: string,
  language: string,
  speed: number,
  pitch: number,
): Promise<{ audioUrl: string; duration: number }> {
  // Edge TTS uses Microsoft's free Neural TTS
  // Voice format: {language}-{voice_name} e.g., "zh-CN-XiaoxiaoNeural"
  const url = `https://edge.tts.api/${voice}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        rate: `${(speed - 1) * 100}%`,
        pitch: `${pitch * 50}Hz`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Edge TTS failed: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
    
    // Estimate duration: avg 15 chars per second
    const duration = Math.ceil(text.length / 15 / speed);
    
    return { audioUrl, duration };
  } catch (err) {
    console.warn('[voice/edge] fallback to text-only:', err);
    return {
      audioUrl: '',
      duration: Math.ceil(text.length / 15),
    };
  }
}

async function synthesizeOpenAITTS(
  text: string,
  voice: string,
  speed: number,
): Promise<{ audioUrl: string; duration: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice,
      speed: Math.min(4, Math.max(0.25, speed)),
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS failed: ${response.statusText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString('base64');
  const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
  
  const duration = Math.ceil(text.length / 15 / speed);
  return { audioUrl, duration };
}

async function synthesizeElevenLabs(
  text: string,
  voice: string,
): Promise<{ audioUrl: string; duration: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString('base64');
  const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
  
  const duration = Math.ceil(text.length / 15);
  return { audioUrl, duration };
}

/**
 * List available voices for a given backend
 * GET /api/voice/voices?backend=edge
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const backend = searchParams.get('backend') || 'edge';

  // Predefined voice lists per backend
  const voices = {
    edge: [
      { voice: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao (中文女声)', language: 'zh-CN' },
      { voice: 'zh-CN-YunxiNeural', name: 'Yunxi (中文男声)', language: 'zh-CN' },
      { voice: 'en-US-JennyNeural', name: 'Jenny (English Female)', language: 'en-US' },
      { voice: 'en-US-GuyNeural', name: 'Guy (English Male)', language: 'en-US' },
      { voice: 'ja-YukiNeural', name: 'Yuki (Japanese Female)', language: 'ja-JP' },
      { voice: 'ja-DaichiNeural', name: 'Daichi (Japanese Male)', language: 'ja-JP' },
    ],
    openai: [
      { voice: 'alloy', name: 'Alloy (Neutral)', language: 'en' },
      { voice: 'echo', name: 'Echo (Male)', language: 'en' },
      { voice: 'fable', name: 'Fable (British)', language: 'en' },
      { voice: 'onyx', name: 'Onyx (Deep)', language: 'en' },
      { voice: 'nova', name: 'Nova (Friendly)', language: 'en' },
      { voice: 'shimmer', name: 'Shimmer (Soft)', language: 'en' },
    ],
    elevenlabs: [
      { voice: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Default)', language: 'en' },
      { voice: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', language: 'en' },
      { voice: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', language: 'en' },
      { voice: 'ErXwobaYiN019PkySvjV', name: 'Antoni', language: 'en' },
      { voice: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', language: 'en' },
    ],
  };

  return NextResponse.json({
    backend,
    voices: voices[backend as keyof typeof voices] || [],
  });
}
