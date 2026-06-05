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

// Fallback model chain (cheaper/faster models for degraded mode)
const FALLBACK_MODELS: Record<ProviderName, string[]> = {
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  openrouter: ["anthropic/claude-sonnet-4-20250514", "anthropic/claude-3.5-haiku-20241022"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3.5-haiku-20241022"],
  openai: ["gpt-4o", "gpt-4o-mini"],
};

// Retryable HTTP status codes
const RETRYABLE_CODES = new Set([429, 500, 502, 503, 504]);

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function makeLLMCall(
  config: LLMConfig,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
): Promise<{ content: string | null; error?: string }> {
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };

    let body: Record<string, unknown>;
    if (config.provider === "anthropic") {
      headers["anthropic-version"] = "2023-06-01";
      body = { model, system: systemPrompt, messages, max_tokens: maxTokens };
    } else {
      const allMessages = [{ role: "system", content: systemPrompt }, ...messages];
      body = { model, messages: allMessages, max_tokens: maxTokens };
    }

    const res = await fetchWithTimeout(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }, 30000);

    if (RETRYABLE_CODES.has(res.status)) {
      return { content: null, error: `retryable:${res.status}` };
    }

    const data = await res.json();
    
    if (config.provider === "anthropic") {
      const content = data.content?.[0]?.text || null;
      if (!content && data.error) {
        return { content: null, error: data.error.message || "Anthropic API error" };
      }
      return { content };
    } else {
      const content = data.choices?.[0]?.message?.content || null;
      if (!content && data.error) {
        return { content: null, error: data.error.message || "LLM API error" };
      }
      return { content };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("timeout")) {
      return { content: null, error: "timeout" };
    }
    return { content: null, error: msg };
  }
}

export async function callLLM(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  options: { maxTokens?: number; model?: string; retries?: number; timeout?: number } = {},
): Promise<{ content: string | null; error?: string }> {
  const config = resolveProvider();
  if (!config) {
    return {
      content: null,
      error:
        "LLM provider not configured. Please set DEEPSEEK_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.",
    };
  }

  const maxRetries = options.retries ?? 2;
  const model = options.model || config.model;
  const maxTokens = options.maxTokens || 2000;
  const fallbackModels = FALLBACK_MODELS[config.provider] || [];

  // Try primary model with retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await makeLLMCall(config, model, systemPrompt, messages, maxTokens);
    if (result.content) return result;
    if (result.error && !result.error.startsWith("retryable:") && result.error !== "timeout") {
      // Non-retryable error (auth, bad request, etc.) — try fallback immediately
      break;
    }
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
      logger.warn(`LLM retry ${attempt + 1}/${maxRetries} after ${delay}ms (${result.error})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  // Fallback: try cheaper/faster models
  if (fallbackModels.length > 0) {
    for (const fallbackModel of fallbackModels) {
      if (fallbackModel === model) continue;
      logger.info(`Falling back to model: ${fallbackModel}`);
      const result = await makeLLMCall(config, fallbackModel, systemPrompt, messages, maxTokens);
      if (result.content) {
        logger.info(`Fallback succeeded with ${fallbackModel}`);
        return result;
      }
    }
  }

  // All attempts exhausted
  const lastError = `LLM call exhausted (${config.provider}/${model})`;
  logger.error(lastError);
  return { content: null, error: lastError };
}