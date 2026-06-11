import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import {
  A2ATask,
  TaskInput,
  TaskKind,
  createTask,
  PushMessage,
} from "@/lib/a2a/protocol";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/a2a/message
 *
 * Send a message to a soul (soul-to-soul or guardian-to-soul).
 * Creates an A2A task that routes to the target soul's chat handler.
 *
 * Body:
 * {
 *   "fromId": "soul_xxx" | "user_yyy",
 *   "fromType": "soul" | "human",
 *   "toSoulId": "soul_zzz",
 *   "kind": "chat" | "advice" | "creation" | ...,
 *   "message": "Hello there",
 *   "contextId?: "thread_123"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing auth", code: -32001 },
        { status: 401 },
      );
    }

    const authRes = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authRes.error) {
      return NextResponse.json(
        { error: authRes.error.message, code: -32001 },
        { status: 401 },
      );
    }

    const userId = authRes.data.user.id;
    const body = await req.json();
    const { fromId, fromType, toSoulId, kind, message, contextId } = body;

    if (!toSoulId || !message) {
      return NextResponse.json(
        { error: "toSoulId and message are required", code: -32602 },
        { status: 400 },
      );
    }

    // Validate target soul exists
    const { data: targetSoul, error: soulErr } = await supabase
      .from("soul_gallery")
      .select("id, name, name_native, guardian_id")
      .eq("id", toSoulId)
      .single();

    if (soulErr || !targetSoul) {
      return NextResponse.json(
        { error: "Target soul not found", code: -32601 },
        { status: 404 },
      );
    }

    // Determine sender
    const senderId = fromId || userId;
    const senderType: "soul" | "human" = fromType || "human";
    const senderName =
      senderType === "human" ? (authRes.data.user.user_metadata?.name || "Guardian") : "Soul";

    // Build task
    const taskInput: TaskInput = {
      kind: (kind || "chat") as TaskKind,
      message,
      parameters: body.parameters || {},
    };

    const task: A2ATask = createTask(
      taskInput,
      {
        id: senderId,
        name: senderName,
        type: senderType,
      },
      {
        id: targetSoul.id,
        name: targetSoul.name_native || targetSoul.name || "Soul",
      },
      contextId,
    );

    // Store task in a2a_tasks table (create if needed)
    const { data: savedTask, error: taskErr } = await supabase
      .from("a2a_tasks")
      .insert({
        id: task.id,
        kind: task.kind,
        status: task.status,
        context_id: task.contextId || null,
        submitted_by_id: task.submittedBy.id,
        submitted_by_name: task.submittedBy.name,
        submitted_by_type: task.submittedBy.type,
        target_soul_id: task.targetSoul.id,
        target_soul_name: task.targetSoul.name,
        input: task.input,
        timestamps: task.timestamps,
      })
      .select()
      .single();

    if (taskErr && !taskErr.message.includes("does not exist")) {
      logger.warn("A2A task storage failed (table may not exist yet):", taskErr);
    }

    // Store push notification
    const pushMsg: PushMessage = {
      id: `push_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      from: {
        id: senderId,
        name: senderName,
      },
      to: {
        id: toSoulId,
        name: targetSoul.name_native || targetSoul.name || "Soul",
      },
      type: kind === "collaboration" ? "collaboration" : "message",
      content: message,
      taskId: task.id,
      timestamp: new Date().toISOString(),
      read: false,
    };

    const { error: pushErr } = await supabase.from("a2a_push_messages").insert({
      id: pushMsg.id,
      from_id: pushMsg.from.id,
      from_name: pushMsg.from.name,
      to_soul_id: pushMsg.to.id,
      to_name: pushMsg.to.name,
      type: pushMsg.type,
      content: pushMsg.content,
      task_id: pushMsg.taskId,
      timestamp: pushMsg.timestamp,
      read: false,
    });

    if (pushErr && !pushErr.message.includes("does not exist")) {
      logger.warn("A2A push storage failed (table may not exist yet):", pushErr);
    }

    // Route to soul chat — call the soul's chat handler
    // For now, we invoke the chat directly via the internal API
    // In future, this would use a message queue or event system
    let chatResponse = "";
    try {
      const chatRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/soul/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            message,
            target_soul_id: toSoulId,
            conversation_history: [],
          }),
        },
      );

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        chatResponse = chatData.response || chatData.content || "";
      }
    } catch (chatErr) {
      logger.error("A2A chat routing error:", chatErr);
    }

    // Update task with output
    if (savedTask) {
      await supabase
        .from("a2a_tasks")
        .update({
          status: chatResponse ? "completed" : "working",
          output: chatResponse
            ? { content: chatResponse, chunks: [chatResponse] }
            : null,
          timestamps: {
            ...task.timestamps,
            started: new Date().toISOString(),
            completed: chatResponse ? new Date().toISOString() : undefined,
          },
        })
        .eq("id", task.id);
    }

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      response: chatResponse || null,
      message: "Message sent to soul",
    });
  } catch (err) {
    logger.error("A2A message error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: -32603 },
      { status: 500 },
    );
  }
}

/**
 * GET /api/a2a/message?taskId=xxx
 *
 * Get task status and result.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required", code: -32602 },
        { status: 400 },
      );
    }

    const { data: task, error } = await supabase
      .from("a2a_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error || !task) {
      return NextResponse.json(
        { error: "Task not found", code: -32601 },
        { status: 404 },
      );
    }

    return NextResponse.json(task);
  } catch (err) {
    logger.error("A2A message status error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: -32603 },
      { status: 500 },
    );
  }
}
