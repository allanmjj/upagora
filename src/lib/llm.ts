import { logger } from '@/lib/logger';
﻿// src/lib/llm.ts — Unified LLM provider abstraction
// Supports: anthropic, openai, deepseek, openrouter, anthropic

export type ProviderName = "deepseek" | "openrouter" | "anthropic" | "openai";

export interface LLMConfig {
  provider: ProviderName;
  url: string;
  apiKey: string;
  model: string;
}

export function resolveProvider(): LLMConfig | null {
  // Priority: deepseek > openrouter > anthropic > openai
  // Note: OPENROUTER_API_KEY may contain a DeepSeek key per user config
  const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.OPENROUTER_API_KEY;
  if (deepseekKey) {
    return {
      provider: "deepseek",
      url: "https://api.deepseek.com/v1/chat/completions",
      apiKey: deepseekKey,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return {
      provider: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-20250514",
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      url: "https://api.anthropic.com/v1/messages",
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-sonnet-4-20250514",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o",
    };
  }
  return null;
}

export async function callLLM(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  options: { maxTokens?: number; model?: string } = {},
): Promise<{ content: string | null; error?: string }> {
  const config = resolveProvider();
  if (!config) {
    return {
      content: null,
      error:
        "LLM provider not configured. Please set DEEPSEEK_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.",
    };
  }

  try {
    const model = options.model || config.model;

    if (config.provider === "anthropic") {
      // Anthropic uses a different request format
      const res = await fetch(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          system: systemPrompt,
          messages,
          max_tokens: options.maxTokens || 2000,
        }),
      });
      const data = await res.json();
      const content = data.content?.[0]?.text || null;
      if (!content && data.error) {
        return { content: null, error: data.error.message || "Anthropic API error" };
      }
      return { content };
    }

    // OpenAI-compatible format (deepseek, openrouter, openai)
    const allMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        max_tokens: options.maxTokens || 2000,
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || null;
    if (!content && data.error) {
      return { content: null, error: data.error.message || "LLM API error" };
    }
    return { content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`LLM call failed (${config.provider}):`, msg);
    return { content: null, error: msg };
  }
}