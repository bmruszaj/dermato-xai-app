import { expect, test } from "@playwright/test";

test.describe("Annotate API - /api/predict", () => {
  test("rejects missing image payload", async ({ request }) => {
    const response = await request.post("/api/predict", {
      data: {},
    });

    expect(response.status()).toBe(400);
  });

  test("rejects unsupported image payload", async ({ request }) => {
    const response = await request.post("/api/predict", {
      data: { imageBase64: "not-a-data-uri" },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe("Annotate API - /api/feedback", () => {
  test("rejects missing comparison payload", async ({ request }) => {
    const response = await request.post("/api/feedback", {
      data: {},
    });

    expect(response.status()).toBe(400);
  });
});
