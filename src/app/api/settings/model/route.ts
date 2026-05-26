import { NextRequest, NextResponse } from "next/server";
import { AVAILABLE_MODELS, getPreferredModel, setPreferredModel } from "@/lib/model-switcher";

/**
 * GET /api/settings/model
 * Get list of available models and user's preferred model
 */
export async function GET() {
  try {
    const preferred = await getPreferredModel();
    return NextResponse.json({
      models: AVAILABLE_MODELS,
      preferred,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

/**
 * POST /api/settings/model
 * Set user's preferred model for soul chat
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth" }, { status: 401 });
    }

    const body = await req.json();
    const { model_id } = body;

    if (!model_id) {
      return NextResponse.json({ error: "model_id required" }, { status: 400 });
    }

    const success = await setPreferredModel(model_id);
    if (!success) {
      return NextResponse.json({ error: "Invalid model_id" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      preferred: model_id,
      model: AVAILABLE_MODELS.find((m) => m.id === model_id),
    });
  } catch {
    return NextResponse.json({ error: "Failed to set model" }, { status: 500 });
  }
}
