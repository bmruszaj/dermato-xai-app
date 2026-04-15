import { NextRequest, NextResponse } from "next/server";
import { getClarinFeedback } from "@/lib/annotate/clarin-feedback";
import { buildFeedbackPrompt } from "@/lib/annotate/prompt";
import type { ComparisonResult } from "@/lib/annotate/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { comparison?: ComparisonResult };
    const { comparison } = body;

    if (!comparison) {
      return NextResponse.json(
        { error: "Missing comparison data" },
        { status: 400 }
      );
    }

    const apiKey = process.env.CLARIN_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "CLARIN_API_KEY not configured on server" },
        { status: 500 }
      );
    }

    const prompt = buildFeedbackPrompt(comparison);
    const feedback = await getClarinFeedback(prompt, apiKey);

    return NextResponse.json({ feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Feedback generation failed: ${message}` },
      { status: 500 }
    );
  }
}
