"use server";

import { cookies } from "next/headers";

/**
 * AI Model Switcher — allows users to select their preferred LLM model
 * for Soul Chat interactions.
 */

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  price: string;
  context_window: number;
  recommended?: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "anthropic/claude-sonnet-4-20250514",
    name: "Claude 4 Sonnet",
    provider: "Anthropic",
    description: "Balanced performance & speed, ideal for soul conversations",
    price: "$5/min",
    context_window: 200_000,
    recommended: true,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "General purpose, reliable, fast reasoning",
    price: "$3/min",
    context_window: 128_000,
  },
  {
    id: "anthropic/claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Best general-purpose model",
    price: "$3/min",
    context_window: 200_000,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Fastest & cheapest, good for casual chat",
    price: "$1/min",
    context_window: 128_000,
  },
  {
    id: "anthropic/claude-opus-4-20250514",
    name: "Claude Opus 4",
    provider: "Anthropic",
    description: "Most capable, deepest reasoning for soul analysis",
    price: "$15/min",
    context_window: 200_000,
  },
  {
    id: "google/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    description: "Fast multimodal, good for versatile tasks",
    price: "$1/min",
    context_window: 1_048_576,
  },
];

export const MODEL_COOKIE_NAME = "upa_preferred_model";

export async function getPreferredModel(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(MODEL_COOKIE_NAME)?.value || "anthropic/claude-sonnet-4-20250514";
}

export async function setPreferredModel(modelId: string): Promise<boolean> {
  if (!AVAILABLE_MODELS.find((m) => m.id === modelId)) {
    return false;
  }
  const cookieStore = await cookies();
  cookieStore.set(MODEL_COOKIE_NAME, modelId, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 24 * 60 * 60, // 60 days
    path: "/",
  });
  return true;
}
