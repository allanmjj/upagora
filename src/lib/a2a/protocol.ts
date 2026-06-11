/**
 * A2A Protocol Layer — JSON-RPC based Agent-to-Agent communication
 *
 * Defines the messaging protocol, task lifecycle, and event streaming
 * for soul-to-soul and guardian-to-soul interactions.
 *
 * Based on Google A2A spec patterns:
 * - Task-based interaction model
 * - JSON-RPC 2.0 transport
 * - Streaming via SSE (Server-Sent Events)
 */

// ─── JSON-RPC 2.0 Envelope ──────────────────────────────────────

export interface JsonRpcRequest<M extends A2AMethod = A2AMethod> {
  jsonrpc: "2.0";
  method: M;
  params: Record<string, unknown>;
  id: string | number;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  result: unknown;
  id: string | number;
}

export interface JsonRpcError {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number;
}

export interface JsonRpcNotification<M extends A2AMethod = A2AMethod> {
  jsonrpc: "2.0";
  method: M;
  params: Record<string, unknown>;
}

// ─── A2A Methods ─────────────────────────────────────────────────

export type A2AMethod =
  | "tasks/create"
  | "tasks/get"
  | "tasks/cancel"
  | "tasks/resume"
  | "tasks/subscribe"
  | "agent/get-card"
  | "agent/get-skills"
  | "agent/search"
  | "agent/get-context-fragments"
  | "push/send"
  | "push/subscribe";

// ─── Task Model ──────────────────────────────────────────────────

export type TaskStatus =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "cancelled"
  | "failed"
  | "timeout";

export type TaskKind =
  | "chat"
  | "advice"
  | "creation"
  | "collaboration"
  | "reflection"
  | "mentoring"
  | "memory-recall"
  | "profile-query"
  | "custom";

export interface A2ATask {
  id: string;
  kind: TaskKind;
  status: TaskStatus;
  contextId?: string;       // Conversation thread ID
  sessionId?: string;       // Soul session ID

  // Submitted by (guardian or another soul)
  submittedBy: {
    id: string;
    name: string;
    type: "human" | "soul";
  };

  // Target soul
  targetSoul: {
    id: string;
    name: string;
  };

  // Input
  input: TaskInput;

  // Output (populated as task progresses)
  output?: TaskOutput;

  // Metadata
  metadata?: Record<string, unknown>;
  timestamps: {
    submitted: string;
    started?: string;
    completed?: string;
  };
}

export interface TaskInput {
  kind: TaskKind;
  message?: string;
  parameters?: Record<string, unknown>;
  /** For collaboration: the other soul's ID */
  collaboratorId?: string;
}

export interface TaskOutput {
  /** Final result content */
  content?: string;
  /** Streaming chunks (for SSE) */
  chunks?: string[];
  /** Artifacts generated (images, files, etc.) */
  artifacts?: TaskArtifact[];
  /** Error if failed */
  error?: string;
}

export interface TaskArtifact {
  id: string;
  type: "text" | "image" | "audio" | "file";
  url: string;
  name?: string;
}

// ─── Task Events (SSE) ───────────────────────────────────────────

export type TaskEventType =
  | "start"
  | "message"
  | "chunk"
  | "artifact"
  | "completed"
  | "cancelled"
  | "failed";

export interface TaskEvent {
  taskId: string;
  type: TaskEventType;
  timestamp: string;
  data: TaskEventData;
}

export type TaskEventData =
  | { type: "start"; message: string }
  | { type: "message"; content: string }
  | { type: "chunk"; content: string; done: boolean }
  | { type: "artifact"; artifact: TaskArtifact }
  | { type: "completed"; output: TaskOutput }
  | { type: "cancelled"; reason?: string }
  | { type: "failed"; error: string };

// ─── Push Messaging ──────────────────────────────────────────────

/** Soul-to-soul push notification */
export interface PushMessage {
  id: string;
  from: {
    id: string;
    name: string;
  };
  to: {
    id: string;
    name: string;
  };
  type: "invitation" | "message" | "collaboration" | "gift" | "system";
  content: string;
  taskId?: string;
  timestamp: string;
  read: boolean;
}

// ─── Registry Types ──────────────────────────────────────────────

export interface RegistryQuery {
  /** Search query (name, description, traits) */
  q?: string;
  /** Filter by minimum level */
  minLevel?: number;
  /** Filter by unlocked skill IDs */
  skills?: string[];
  /** Filter by availability status */
  status?: "available" | "busy" | "offline";
  /** Only shared/public souls */
  sharedOnly?: boolean;
  /** Pagination */
  limit?: number;
  offset?: number;
}

export interface RegistryResult {
  total: number;
  agents: SoulAgentCardSummary[];
}

/** Lightweight card for registry listings */
export interface SoulAgentCardSummary {
  soulId: string;
  name: string;
  description: string;
  level: number;
  levelTitle: string;
  skills: string[];           // Skill IDs only
  status: "available" | "busy" | "offline";
  avatarUrl?: string;
  shared: boolean;
  guardianName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Generate a unique task ID */
export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a new task from input */
export function createTask(
  input: TaskInput,
  submittedBy: { id: string; name: string; type: "human" | "soul" },
  targetSoul: { id: string; name: string },
  contextId?: string,
  sessionId?: string,
): A2ATask {
  return {
    id: generateTaskId(),
    kind: input.kind,
    status: "submitted",
    contextId,
    sessionId,
    submittedBy,
    targetSoul,
    input,
    timestamps: {
      submitted: new Date().toISOString(),
    },
  };
}

/** Check if a task is in a terminal state */
export function isTaskTerminal(task: A2ATask): boolean {
  return ["completed", "cancelled", "failed"].includes(task.status);
}

/** Check if a task can be resumed */
export function isTaskResumable(task: A2ATask): boolean {
  return ["cancelled", "input-required"].includes(task.status);
}

/** Build SSE event string */
export function buildSSEEvent(event: TaskEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
