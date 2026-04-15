import type { DataSourceParser } from "@/lib/project-data/parsers/types";
import { DataSourceParserError } from "@/lib/project-data/parsers/types";
import {
  extractedImageItemsSchema,
  normalizedProjectDataSchema,
  toNormalizedImageProjectData,
} from "@/lib/project-data/schemas";
import { parseQuoteInputText } from "@/lib/input/quoteTextParser";
import type { NormalizedProjectData } from "@/lib/project-data/types";

export interface ClarinImageParserInput {
  imageUrl?: string;
  imageBase64?: string;
}

const CLARIN_API_BASE_URL = "https://services.clarin-pl.eu/api/v1/oapi";
const CLARIN_FILES_URL = `${CLARIN_API_BASE_URL}/files`;
const CLARIN_CHAT_COMPLETIONS_URL = `${CLARIN_API_BASE_URL}/chat/completions`;

const MAX_PREVIEW_CHARS = 400;
const MAX_VISION_TEXT_CHARS = 24_000;

const CLARIN_UPLOAD_OCR_INSTRUCTION = `
Wykonaj OCR rysunku technicznego kuchni i WYODREBNIJ ETYKIETY elementow.

Zwroc wynik jako tekst z 2 sekcjami:

[RAW_OCR]
- wklej mozliwie surowy tekst OCR (bez streszczania, bez interpretacji)

[LABELS]
- wypisz kazda wykryta etykiete elementu w osobnej linii w formacie:
  LABEL: <oryginalny_tekst_etykiety>
  QTY: <liczba jesli jawnie podana, inaczej puste>
  WIDTH_MM: <liczba jesli jawnie podana w mm lub cm, inaczej puste>
  HEIGHT_MM: <liczba jesli jawnie podana, inaczej puste>

Zachowuj oryginalna pisownie.
Nie dodawaj opisow typu "obraz przedstawia...".
Jezyk: polski.
`.trim();

const CABINET_EXTRACTION_PROMPT = `
Masz tekst OCR, ktory zawiera surowy OCR oraz sekcje [LABELS]. Twoim celem jest zbudowanie listy elementow kuchni.

Najpierw wykonaj NORMALIZACJE etykiet:
- popraw typowe bledy OCR:
  "ZLEWO W" -> "ZLEWOWA"
  "WE" -> "WEW"
  "SZ 22" lub "SZ Z22" -> "SZ2"
- usun podwojne spacje i ujednolic zapis kropek (np. "P.L", "PL" traktuj jako to samo)
- zachowaj sens oryginalnego kodu (G/D/COK/BLAT itd.)

Nastepnie WYODREBNIJ pozycje:
- jako items bierz tylko etykiety wygladajace jak elementy (np. zaczynajace sie od G, D, N, COK, BLAT, EH..., albo zawierajace "KLAPA", "ZLEWOWA", "SZ")
- jesli w etykiecie jest zakres typu "50-100 cm" lub "30-100 cm", NIE traktuj go jako width/height; wtedy width i height ustaw null
- jesli jest pojedynczy wymiar typu "600 mm" lub "60 cm", przypisz do width (konwertuj cm -> mm, zwroc liczby bez jednostek)
- jesli wysokosc jest jawnie podana (np. /72, /36, 720 mm), przypisz do height
- jesli ilosc nie jest jawnie podana, ustaw quantity na 1

Deduplikacja:
- jesli ta sama nazwa (po normalizacji) wystapi wiele razy, polacz w jeden item i zsumuj quantity

Return ONLY valid JSON.
Do NOT include markdown.
Do NOT include explanation.
Do NOT include backticks.

Return strictly:

{
  "items": [
    {
      "name": "string",
      "quantity": number,
      "width": number | null,
      "height": number | null
    }
  ]
}
`.trim();

function toPreview(value: string, maxChars = MAX_PREVIEW_CHARS): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function toClarinApiKey(): string {
  const apiKey = (process.env.CLARIN_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new DataSourceParserError(
      "IMAGE_PARSER_HTTP_ERROR",
      "Brak konfiguracji CLARIN_API_KEY na backendzie."
    );
  }
  return apiKey;
}

function clarinAuthHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "x-token": apiKey,
  };
}

function resolveImageInput(input: ClarinImageParserInput): { imageUrl?: string; imageBase64?: string } {
  const imageUrl = input.imageUrl?.trim();
  const imageBase64 = input.imageBase64?.trim();
  if (!imageUrl && !imageBase64) {
    throw new DataSourceParserError(
      "IMAGE_INPUT_ERROR",
      "Podaj URL obrazu lub przeslij obraz projektu w base64."
    );
  }
  return {
    imageUrl: imageUrl || undefined,
    imageBase64: imageBase64 || undefined,
  };
}

function guessExtensionFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("bmp")) return "bmp";
  return "jpg";
}

function parseBase64Image(imageBase64: string): { blob: Blob; fileName: string } {
  const prefixed = imageBase64.match(/^data:(.+?);base64,(.+)$/);
  const mime = prefixed ? prefixed[1] : "image/jpeg";
  const base64Data = prefixed ? prefixed[2] : imageBase64;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, "base64");
  } catch (error) {
    throw new DataSourceParserError(
      "IMAGE_INPUT_ERROR",
      "Nieprawidlowe dane base64 obrazu.",
      { cause: error instanceof Error ? error.message : String(error) }
    );
  }

  if (buffer.length === 0) {
    throw new DataSourceParserError("IMAGE_INPUT_ERROR", "Dane base64 obrazu sa puste.");
  }

  const extension = guessExtensionFromMime(mime);
  return {
    blob: new Blob([new Uint8Array(buffer)], { type: mime }),
    fileName: `cabineteo-upload.${extension}`,
  };
}

function fileNameFromUrl(urlValue: string, fallbackExtension: string): string {
  try {
    const url = new URL(urlValue);
    const fromPath = url.pathname.split("/").filter(Boolean).pop();
    if (!fromPath) {
      return `cabineteo-upload.${fallbackExtension}`;
    }
    if (/\.[a-z0-9]+$/i.test(fromPath)) {
      return fromPath;
    }
    return `${fromPath}.${fallbackExtension}`;
  } catch {
    return `cabineteo-upload.${fallbackExtension}`;
  }
}

async function loadImageAsBlob(input: { imageUrl?: string; imageBase64?: string }): Promise<{
  blob: Blob;
  fileName: string;
}> {
  if (input.imageBase64) {
    return parseBase64Image(input.imageBase64);
  }

  const imageUrl = input.imageUrl;
  if (!imageUrl) {
    throw new DataSourceParserError(
      "IMAGE_INPUT_ERROR",
      "Brak zrodla obrazu do wysylki na CLARIN."
    );
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new DataSourceParserError(
      "IMAGE_PARSER_HTTP_ERROR",
      `Nie udalo sie pobrac obrazu z URL (status ${response.status}).`,
      { status: response.status }
    );
  }

  const blob = await response.blob();
  const mime = blob.type || "image/jpeg";
  const extension = guessExtensionFromMime(mime);
  return {
    blob,
    fileName: fileNameFromUrl(imageUrl, extension),
  };
}

function extractIdCandidate(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) {
    const candidate = payload.trim().replace(/^"|"$/g, "");
    if (/^[a-z0-9-]{16,}$/i.test(candidate)) {
      return candidate;
    }
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const row = payload as Record<string, unknown>;
  const direct = row.id;
  if (typeof direct === "string" && direct.trim()) return direct;

  const fileId = row.file_id;
  if (typeof fileId === "string" && fileId.trim()) return fileId;

  const data = row.data;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (typeof nested.id === "string" && nested.id.trim()) return nested.id;
    if (typeof nested.file_id === "string" && nested.file_id.trim()) return nested.file_id;
  }

  return null;
}

function parseJsonLikeResponse(responseText: string): unknown {
  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

async function uploadImageToClarin(
  apiKey: string,
  input: { imageUrl?: string; imageBase64?: string }
): Promise<string> {
  const image = await loadImageAsBlob(input);

  const formData = new FormData();
  formData.set("purpose", "vision");
  formData.set("file", image.blob, image.fileName);
  formData.set(
    "metadata",
    JSON.stringify({
      source: "cabineteo",
      instructions: CLARIN_UPLOAD_OCR_INSTRUCTION,
      lang: "pl",
    })
  );

  const response = await fetch(CLARIN_FILES_URL, {
    method: "POST",
    headers: clarinAuthHeaders(apiKey),
    body: formData,
  });

  const responseText = await response.text();
  const payload = parseJsonLikeResponse(responseText);

  if (!response.ok) {
    throw new DataSourceParserError(
      "IMAGE_PARSER_HTTP_ERROR",
      `CLARIN upload failed with status ${response.status}.`,
      {
        status: response.status,
        payloadPreview: toPreview(typeof payload === "string" ? payload : JSON.stringify(payload)),
      }
    );
  }

  const fileId = extractIdCandidate(payload);
  if (!fileId) {
    throw new DataSourceParserError(
      "IMAGE_PARSER_RESPONSE_ERROR",
      "CLARIN upload zakonczony, ale nie zwrocil file_id.",
      {
        payloadPreview: toPreview(typeof payload === "string" ? payload : JSON.stringify(payload)),
      }
    );
  }

  return fileId;
}

function extractFileText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const row = payload as Record<string, unknown>;
  if (typeof row.file_text === "string" && row.file_text.trim()) {
    return row.file_text;
  }

  const metadata = row.metadata;
  if (metadata && typeof metadata === "object") {
    const metadataRow = metadata as Record<string, unknown>;
    if (typeof metadataRow.file_text === "string" && metadataRow.file_text.trim()) {
      return metadataRow.file_text;
    }
  }

  const data = row.data;
  if (data && typeof data === "object") {
    return extractFileText(data);
  }

  return null;
}

async function loadClarinFileText(apiKey: string, fileId: string): Promise<string> {
  const response = await fetch(`${CLARIN_FILES_URL}/${encodeURIComponent(fileId)}`, {
    method: "GET",
    headers: clarinAuthHeaders(apiKey),
  });

  const responseText = await response.text();
  const payload = parseJsonLikeResponse(responseText);

  if (!response.ok) {
    throw new DataSourceParserError(
      "IMAGE_PARSER_HTTP_ERROR",
      `CLARIN file info failed with status ${response.status}.`,
      {
        status: response.status,
        fileId,
        payloadPreview: toPreview(typeof payload === "string" ? payload : JSON.stringify(payload)),
      }
    );
  }

  const fileText = extractFileText(payload);
  if (!fileText || !fileText.trim()) {
    throw new DataSourceParserError(
      "IMAGE_PARSER_RESPONSE_ERROR",
      "CLARIN nie zwrocil metadata.file_text dla przeslanego obrazu.",
      {
        fileId,
        payloadPreview: toPreview(typeof payload === "string" ? payload : JSON.stringify(payload)),
      }
    );
  }

  return fileText;
}

async function deleteClarinFile(apiKey: string, fileId: string): Promise<void> {
  const response = await fetch(`${CLARIN_FILES_URL}/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: clarinAuthHeaders(apiKey),
  });

  if (response.ok) return;

  const responseText = await response.text();
  const payload = parseJsonLikeResponse(responseText);
  throw new DataSourceParserError(
    "IMAGE_PARSER_HTTP_ERROR",
    `Nie udalo sie usunac pliku ${fileId} z CLARIN (status ${response.status}).`,
    {
      status: response.status,
      fileId,
      payloadPreview: toPreview(typeof payload === "string" ? payload : JSON.stringify(payload)),
    }
  );
}

function extractTextFromContentChunk(chunk: unknown): string {
  if (typeof chunk === "string") return chunk;
  if (!chunk || typeof chunk !== "object") return "";

  const row = chunk as Record<string, unknown>;
  const textLikeKeys = ["text", "content", "output_text", "value"];
  for (const key of textLikeKeys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return "";
}

function extractCompletionText(responseJson: unknown): string {
  if (!responseJson || typeof responseJson !== "object") {
    throw new DataSourceParserError(
      "IMAGE_PARSER_RESPONSE_ERROR",
      "Nieprawidlowy format odpowiedzi CLARIN (brak obiektu JSON).",
      { payloadPreview: toPreview(JSON.stringify(responseJson ?? null)) }
    );
  }

  const root = responseJson as Record<string, unknown>;
  const choices = Array.isArray(root.choices) ? root.choices : [];
  if (choices.length === 0) {
    if (typeof root.output_text === "string" && root.output_text.trim()) {
      return root.output_text;
    }
    throw new DataSourceParserError(
      "IMAGE_PARSER_RESPONSE_ERROR",
      "Nieprawidlowy format odpowiedzi CLARIN (brak choices).",
      { payloadPreview: toPreview(JSON.stringify(responseJson)) }
    );
  }

  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    throw new DataSourceParserError(
      "IMAGE_PARSER_RESPONSE_ERROR",
      "Nieprawidlowy format odpowiedzi CLARIN (pusta pierwsza odpowiedz).",
      { payloadPreview: toPreview(JSON.stringify(responseJson)) }
    );
  }

  const choice = firstChoice as Record<string, unknown>;
  if (typeof choice.text === "string" && choice.text.trim()) {
    return choice.text;
  }

  const message = choice.message;
  if (message && typeof message === "object") {
    const content = (message as Record<string, unknown>).content;
    if (typeof content === "string" && content.trim()) {
      return content;
    }
    if (Array.isArray(content)) {
      const text = content.map(extractTextFromContentChunk).filter(Boolean).join("\n").trim();
      if (text) {
        return text;
      }
    }
  }

  throw new DataSourceParserError(
    "IMAGE_PARSER_RESPONSE_ERROR",
    "Nie udalo sie odczytac tresci odpowiedzi modelu.",
    { payloadPreview: toPreview(JSON.stringify(responseJson)) }
  );
}

function extractCodeFenceJsonBlock(text: string): string | null {
  const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return codeFenceMatch?.[1]?.trim() || null;
}

function extractJsonSlice(text: string): string | null {
  const normalized = text.trim();

  const objectStart = normalized.indexOf("{");
  const objectEnd = normalized.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return normalized.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = normalized.indexOf("[");
  const arrayEnd = normalized.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return normalized.slice(arrayStart, arrayEnd + 1);
  }

  return null;
}

function tryParseJson(candidate: string): unknown | null {
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function parseModelPayload(completionText: string): unknown {
  const candidates: string[] = [];
  const trimmed = completionText.trim();
  if (trimmed) {
    candidates.push(trimmed);
  }

  const fenced = extractCodeFenceJsonBlock(completionText);
  if (fenced && !candidates.includes(fenced)) {
    candidates.push(fenced);
  }

  const sliced = extractJsonSlice(completionText);
  if (sliced && !candidates.includes(sliced)) {
    candidates.push(sliced);
  }

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate);
    if (parsed != null) {
      return parsed;
    }
  }

  throw new DataSourceParserError(
    "IMAGE_PARSER_JSON_ERROR",
    "Model nie zwrocil parsowalnego JSON dla listy elementow.",
    { modelOutputPreview: toPreview(completionText) }
  );
}

function coerceExtractedItemsPayload(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return { items: payload };
  }

  if (payload && typeof payload === "object") {
    const row = payload as Record<string, unknown>;
    if (Array.isArray(row.items)) {
      return payload;
    }

    if (row.data && typeof row.data === "object") {
      const nested = row.data as Record<string, unknown>;
      if (Array.isArray(nested.items)) {
        return { items: nested.items };
      }
    }
  }

  return payload;
}

function buildFallbackItemsFromVisionText(
  visionText: string
): Array<{ name: string; quantity: number; width: null; height: null }> {
  const parsed = parseQuoteInputText(visionText);
  if (parsed.items.length === 0) {
    return [];
  }

  const grouped = new Map<string, { name: string; quantity: number }>();
  for (const item of parsed.items) {
    const key = item.name.trim().toUpperCase();
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { name: item.name.trim(), quantity: item.quantity });
    } else {
      current.quantity += item.quantity;
    }
  }

  return Array.from(grouped.values()).map((item) => ({
    name: item.name,
    quantity: item.quantity,
    width: null,
    height: null,
  }));
}

function normalizeVisionLabel(label: string): string {
  return label
    .replace(/^[\s"'`„”.,;:()\[\]-]+|[\s"'`„”.,;:()\[\]-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyElementLabel(label: string): boolean {
  const upper = label.toUpperCase();
  return /(^G\d|^D\d|^S\d|^N\d|G\s*KLAPA|D\s*ZLEWOWA|D\s*SZ|FR\s*ZM|COK\d|BLAT\d|SPLASHBACK|ZLEW|P\.?\s*L\.?|EHI\d|EH\d)/.test(
    upper
  );
}

function extractItemsFromVisionNarrative(
  visionText: string
): Array<{ name: string; quantity: number; width: null; height: null }> {
  const candidates: string[] = [];

  for (const match of visionText.matchAll(/[„"']([^"”'`]{2,140})[”"']/g)) {
    const raw = match[1] ?? "";
    const normalized = normalizeVisionLabel(raw);
    if (normalized) {
      candidates.push(normalized);
    }
  }

  const explicitPatterns: RegExp[] = [
    /\bG\s*KLAPA\s*\d{2,3}\s*-\s*\d{2,3}\s*CM\b/gi,
    /\bD\s*ZLEWOWA\s*SZ\s*\d{2,3}\s*-\s*\d{2,3}\s*CM\b/gi,
    /\bD\s*SZ2?\s*\d{2,3}\s*-\s*\d{2,3}\s*CM\b/gi,
    /\bG\d{2,3}\s*P\.?\s*L\.?\b/gi,
    /\bCOK\d+\b/gi,
    /\bBLAT\d+\b/gi,
    /\bSPLASHBACK\b/gi,
    /\bEHI?\d+[A-Z0-9]*\b/gi,
  ];

  for (const pattern of explicitPatterns) {
    for (const match of visionText.matchAll(pattern)) {
      const normalized = normalizeVisionLabel(match[0] ?? "");
      if (normalized) {
        candidates.push(normalized);
      }
    }
  }

  const grouped = new Map<string, { name: string; quantity: number }>();
  for (const candidate of candidates) {
    if (!isLikelyElementLabel(candidate)) {
      continue;
    }
    const key = candidate.toUpperCase();
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { name: candidate, quantity: 1 });
    } else {
      current.quantity += 1;
    }
  }

  return Array.from(grouped.values()).map((item) => ({
    name: item.name,
    quantity: item.quantity,
    width: null,
    height: null,
  }));
}

function mergeFallbackItems(
  ...lists: Array<Array<{ name: string; quantity: number; width: null; height: null }>>
): Array<{ name: string; quantity: number; width: null; height: null }> {
  const grouped = new Map<string, { name: string; quantity: number }>();

  for (const list of lists) {
    for (const item of list) {
      const key = item.name.trim().toUpperCase();
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, { name: item.name.trim(), quantity: item.quantity });
      } else {
        current.quantity += item.quantity;
      }
    }
  }

  return Array.from(grouped.values()).map((item) => ({
    name: item.name,
    quantity: item.quantity,
    width: null,
    height: null,
  }));
}

function buildToolPrompt(fileId: string, visionText: string): string {
  const clippedText =
    visionText.length > MAX_VISION_TEXT_CHARS
      ? `${visionText.slice(0, MAX_VISION_TEXT_CHARS)}\n[TRUNCATED]`
      : visionText;

  return `
${CABINET_EXTRACTION_PROMPT}

Masz ponizej tekst OCR z CLARIN.
Tekst powinien zawierac sekcje [RAW_OCR] i [LABELS], ale moze byc czesciowo zaszumiony OCR.
Id pliku: ${fileId}

Tekst OCR:
${clippedText}
`.trim();
}

async function extractCabinetsFromVisionText(
  apiKey: string,
  fileId: string,
  visionText: string
): Promise<unknown> {
  const response = await fetch(CLARIN_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      ...clarinAuthHeaders(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3.1",
      temperature: 0,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: buildToolPrompt(fileId, visionText),
        },
      ],
    }),
  });

  const responseText = await response.text();
  const responseJson = parseJsonLikeResponse(responseText);

  if (!response.ok) {
    throw new DataSourceParserError(
      "IMAGE_PARSER_HTTP_ERROR",
      `CLARIN extraction tool failed with status ${response.status}.`,
      {
        status: response.status,
        fileId,
        payloadPreview: toPreview(
          typeof responseJson === "string" ? responseJson : JSON.stringify(responseJson)
        ),
      }
    );
  }

  const completionText = extractCompletionText(responseJson);
  return parseModelPayload(completionText);
}

export class ClarinImageParser implements DataSourceParser {
  private readonly imageUrl?: string;
  private readonly imageBase64?: string;

  constructor(input: ClarinImageParserInput) {
    this.imageUrl = input.imageUrl;
    this.imageBase64 = input.imageBase64;
  }

  async parse(): Promise<NormalizedProjectData> {
    const input = resolveImageInput({
      imageUrl: this.imageUrl,
      imageBase64: this.imageBase64,
    });
    const apiKey = toClarinApiKey();

    let fileId: string | null = null;
    let processingError: unknown = null;
    let result: NormalizedProjectData | null = null;

    try {
      fileId = await uploadImageToClarin(apiKey, input);
      const visionText = await loadClarinFileText(apiKey, fileId);
      const extracted = await extractCabinetsFromVisionText(apiKey, fileId, visionText);

      const extractedItems = extractedImageItemsSchema.safeParse(
        coerceExtractedItemsPayload(extracted)
      );
      if (!extractedItems.success) {
        throw new DataSourceParserError(
          "IMAGE_PARSER_JSON_ERROR",
          "Model zwrocil JSON, ale niezgodny ze schematem elementow.",
          {
            issues: extractedItems.error.issues,
            payload: extracted,
          }
        );
      }

      let resolvedItems = extractedItems.data.items;
      let fallbackUsed = false;
      if (resolvedItems.length === 0) {
        const narrativeFallbackItems = extractItemsFromVisionNarrative(visionText);
        const parsedFallbackItems = buildFallbackItemsFromVisionText(visionText);
        const fallbackItems = mergeFallbackItems(narrativeFallbackItems, parsedFallbackItems);
        if (fallbackItems.length > 0) {
          resolvedItems = fallbackItems;
          fallbackUsed = true;
        } else {
          throw new DataSourceParserError(
            "IMAGE_PARSER_JSON_ERROR",
            "Model zwrocil pusta liste elementow.",
            {
              fileId,
              visionTextPreview: toPreview(visionText, 1200),
              extractedPayloadPreview: toPreview(JSON.stringify(extracted ?? null), 1200),
              hint:
                "Sprawdz czy vision file_text zawiera nazwy szafek. Jesli nie, uzyj innego ujecia obrazu.",
            }
          );
        }
      }

      const normalizedData = toNormalizedImageProjectData({
        items: resolvedItems,
      });
      const validatedNormalizedData = normalizedProjectDataSchema.safeParse(normalizedData);
      if (!validatedNormalizedData.success) {
        throw new DataSourceParserError(
          "IMAGE_PARSER_JSON_ERROR",
          "Nie udalo sie znormalizowac danych obrazu do formatu projektu.",
          { issues: validatedNormalizedData.error.issues }
        );
      }

      if (fallbackUsed) {
        console.warn("Image parser fallback used: parsed items from CLARIN file_text.");
      }

      result = validatedNormalizedData.data;
    } catch (error) {
      processingError = error;
    } finally {
      if (fileId) {
        try {
          await deleteClarinFile(apiKey, fileId);
        } catch (cleanupError) {
          if (processingError == null) {
            processingError = cleanupError;
          } else {
            console.warn("CLARIN cleanup warning:", cleanupError);
          }
        }
      }
    }

    if (processingError) {
      throw processingError;
    }

    if (!result) {
      throw new DataSourceParserError(
        "IMAGE_PARSER_RESPONSE_ERROR",
        "Nie udalo sie zakonczyc ekstrakcji obrazu."
      );
    }

    return result;
  }
}