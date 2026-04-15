import { NextRequest, NextResponse } from "next/server";

// Allow up to 5 minutes — model cold-start can be slow
export const maxDuration = 300;

const MODAL_URL =
  process.env.MODAL_RFDETR_URL ??
  "https://dermatoai--rfdetr-large-labelstudio-backend.modal.run";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { imageBase64?: string };
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Missing imageBase64" },
        { status: 400 }
      );
    }

    const payload = {
      tasks: [
        {
          id: 1,
          data: { image: imageBase64 },
        },
      ],
    };

    const response = await fetch(`${MODAL_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Node fetch — use signal for timeout
      signal: AbortSignal.timeout(290_000), // 290s — just under maxDuration
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        {
          predictions: [],
          error: `Modal responded ${response.status}: ${text.slice(0, 200)}`,
        },
        { status: 200 } // return 200 so client can handle gracefully
      );
    }

    // Modal returns: { results: [{ result: [...labelstudio annotations], score }] }
    const data = (await response.json()) as {
      results: Array<{
        result: Array<{
          score: number;
          value: {
            x: number;
            y: number;
            width: number;
            height: number;
            rectanglelabels: string[];
          };
        }>;
        score: number;
      }>;
    };

    // Flatten to our ModelPrediction format
    const predictions = (data.results?.[0]?.result ?? []).map((r) => ({
      x: r.value.x,
      y: r.value.y,
      width: r.value.width,
      height: r.value.height,
      confidence: r.score,
    }));

    return NextResponse.json({ predictions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { predictions: [], error: message },
      { status: 200 }
    );
  }
}
