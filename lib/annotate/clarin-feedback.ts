import "server-only";

const CLARIN_CHAT_COMPLETIONS_URL =
  "https://services.clarin-pl.eu/api/v1/oapi/chat/completions";

function extractCompletionText(responseJson: unknown): string {
  if (!responseJson || typeof responseJson !== "object") {
    throw new Error("Invalid CLARIN response: not an object");
  }
  const root = responseJson as Record<string, unknown>;
  const choices = Array.isArray(root.choices) ? root.choices : [];
  if (choices.length === 0) {
    throw new Error("Invalid CLARIN response: no choices");
  }
  const first = choices[0] as Record<string, unknown>;
  // choices[0].text (some models)
  if (typeof first.text === "string" && first.text.trim()) {
    return first.text.trim();
  }
  // choices[0].message.content (chat completion format)
  const message = first.message as Record<string, unknown> | undefined;
  if (message) {
    if (typeof message.content === "string" && message.content.trim()) {
      return message.content.trim();
    }
    if (Array.isArray(message.content)) {
      const parts = (message.content as Array<Record<string, unknown>>)
        .map((c) => (typeof c.text === "string" ? c.text : ""))
        .filter(Boolean)
        .join("\n");
      if (parts.trim()) return parts.trim();
    }
  }
  throw new Error("Could not extract text from CLARIN response");
}

/**
 * Call the Clarin chat/completions endpoint with a prompt and return the text response.
 * Model: llama3.1, temperature: 0.7, max_tokens: 1500.
 */
export async function getClarinFeedback(
  prompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(CLARIN_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "x-token": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3.1",
      temperature: 0.7,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `CLARIN returned non-JSON (status ${response.status}): ${text.slice(0, 200)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `CLARIN completions failed (status ${response.status}): ${text.slice(0, 200)}`
    );
  }

  return extractCompletionText(json);
}
