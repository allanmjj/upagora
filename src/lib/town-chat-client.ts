"use client";

import { useEffect, useState, useCallback } from "react";
import { logger } from '@/lib/logger';

// Town chat API client
export class TownChatClient {
  private abortController: AbortController | null = null;

  async sendMessage(
    soulId: string,
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    onToken: (token: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: string) => void,
  ): Promise<void> {
    this.abortRequest();

    this.abortController = new AbortController();

    try {
      const session = await this.getSession();
      if (!session) {
        onError("Not authenticated");
        return;
      }

      const response = await fetch("/api/town/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          soul_id: soulId,
          message,
          conversation_history: conversationHistory,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        onError(error.error || "Request failed");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError("No response stream");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");

          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "token") {
                  fullResponse += data.content;
                  onToken(data.content);
                } else if (data.type === "complete") {
                  fullResponse = data.full_response;
                  onComplete(data.full_response);
                } else if (data.type === "error") {
                  onError(data.content);
                }
              } catch (e) {
                // Skip malformed JSON
                logger.warn("Failed to parse SSE data:", e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        // Request was aborted, don't treat as error
        return;
      }
      onError(error.message || "Failed to send message");
    }
  }

  async fetchWelcome(
    soulId: string,
  ): Promise<{
    soul: {
      id: string;
      name: string;
      name_native: string;
      language: string;
    };
    town_context: {
      region: string;
      region_name: string;
      mood: string;
      mood_emoji: string;
      energy: number;
      social_need: number;
      nearby_count: number;
      nearby_names: string[];
      today_events: number;
    };
    greeting: string;
  } | null> {
    try {
      const response = await fetch(`/api/town/chat/welcome?soul_id=${soulId}`, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (e) {
      logger.warn("Failed to fetch welcome message:", e);
      return null;
    }
  }

  abortRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private async getSession(): Promise<{ access_token: string } | null> {
    try {
      const { data } = await fetch("/api/auth/session").then((r) => r.json());
      return data?.session || null;
    } catch {
      return null;
    }
  }
}

// Singleton instance
let chatClientInstance: TownChatClient | null = null;
export function getTownChatClient(): TownChatClient {
  if (!chatClientInstance) {
    chatClientInstance = new TownChatClient();
  }
  return chatClientInstance;
}