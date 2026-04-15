import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ClarinImageParser } from "@/lib/project-data/parsers/server/clarinImageParser";
import { DataSourceParserError } from "@/lib/project-data/parsers/types";
import { normalizedProjectDataSchema } from "@/lib/project-data/schemas";

export const runtime = "nodejs";

const requestSchema = z
  .object({
    imageUrl: z.string().trim().url().optional(),
    imageBase64: z.string().trim().min(32).optional(),
  })
  .refine((value) => Boolean(value.imageUrl || value.imageBase64), {
    message: "Podaj imageUrl albo imageBase64.",
  });

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    const parsedBody = requestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          message: "Nieprawidlowe dane wejsciowe parsera obrazu.",
          details: parsedBody.error.issues,
        },
        { status: 400 }
      );
    }

    const parser = new ClarinImageParser({
      imageUrl: parsedBody.data.imageUrl,
      imageBase64: parsedBody.data.imageBase64,
    });
    const normalized = await parser.parse();
    const validated = normalizedProjectDataSchema.safeParse(normalized);
    if (!validated.success) {
      return NextResponse.json(
        {
          message: "Nieprawidlowy format danych po normalizacji parsera obrazu.",
          details: validated.error.issues,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ data: validated.data });
  } catch (error) {
    if (error instanceof DataSourceParserError) {
      const status = error.code === "IMAGE_INPUT_ERROR" ? 400 : 422;
      return NextResponse.json(
        {
          message: error.message,
          code: error.code,
          details: error.details,
        },
        { status }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown parser error";
    return NextResponse.json(
      {
        message: "Nie udalo sie przetworzyc obrazu projektu.",
        details: message,
      },
      { status: 500 }
    );
  }
}