// src/lib/conversation-context.ts — Conversation context window management
// Trims conversation history to stay within token budget

interface Message {
  role: string;
  content: string;
}

/**
 * Estimate token count from text (rough approximation: ~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Trim conversation history to fit within a token budget,
 * keeping the most recent messages and preserving system context.
 *
 * @param messages - Full conversation history
 * @param systemPrompt - System prompt text
 * @param maxTokens - Maximum total tokens (default: 8000 for chat)
 * @param reserveTokens - Tokens reserved for response (default: 2000)
 */
export function trimConversationContext(
  messages: Message[],
  systemPrompt: string,
  maxTokens: number = 8000,
  reserveTokens: number = 2000
): Message[] {
  const systemTokens = estimateTokens(systemPrompt);
  const availableTokens = maxTokens - systemTokens - reserveTokens;

  // Calculate total message tokens
  let totalTokens = 0;
  const messageTokens: number[] = messages.map(m => {
    const tokens = estimateTokens(m.content);
    totalTokens += tokens;
    return tokens;
  });

  // If we're within budget, return as-is
  if (totalTokens <= availableTokens) {
    return messages;
  }

  // Trim from the oldest messages first (sliding window)
  const trimmed: Message[] = [];
  let remainingBudget = availableTokens;

  // Always keep at least the last message (current user input)
  // Work backwards from the end
  for (let i = messages.length - 1; i >= 0; i--) {
    if (remainingBudget - messageTokens[i] >= 100) {
      // Keep this message (reserve 100 tokens minimum)
      trimmed.unshift(messages[i]);
      remainingBudget -= messageTokens[i];
    } else {
      // Drop older messages
      break;
    }
  }

  return trimmed;
}

/**
 * Condense older conversation messages into a summary to save tokens.
 * Useful when the conversation has many turns.
 */
export function condenseOldMessages(
  messages: Message[],
  keepRecent: number = 6,
  maxSummaryTokens: number = 500
): Message[] {
  if (messages.length <= keepRecent) {
    return messages;
  }

  // Separate old and recent messages
  const oldMessages = messages.slice(0, messages.length - keepRecent);
  const recentMessages = messages.slice(-keepRecent);

  // Condense old messages into a brief summary
  const oldContent = oldMessages
    .map(m => `[${m.role}]: ${m.content.slice(0, 100)}...`)
    .join('\n');

  const summaryTokens = estimateTokens(oldContent);
  const summary = summaryTokens > maxSummaryTokens
    ? `【前文摘要】${oldMessages.length} 条历史对话（已精简）`
    : `【前文摘要】${oldContent.slice(0, maxSummaryTokens * 4)}`;

  return [
    { role: 'assistant', content: summary },
    ...recentMessages,
  ];
}
