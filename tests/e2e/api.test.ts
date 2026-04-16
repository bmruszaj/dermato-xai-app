import { expect, test } from "@playwright/test";

// Annotate API integration tests
// These tests require a running server with valid env vars (MODAL_RFDETR_URL, CLARIN API key)

test.describe("Annotate API - /api/predict", () => {
  test("predict endpoint responds to POST", async ({ request }) => {
    const response = await request.post("/api/predict", {
      data: { imageBase64: "data:image/png;base64,abc" },
    });
    // Expect either a valid predictions response or a handled error, not a 500 crash
    expect([200, 400, 422, 503]).toContain(response.status());
  });
});

test.describe("Annotate API - /api/feedback", () => {
  test("feedback endpoint responds to POST", async ({ request }) => {
    const response = await request.post("/api/feedback", {
      data: {
        comparison: {
          matched: [],
          userOnly: [],
          modelOnly: [],
          otherAnnotations: [],
          imageDimensions: { width: 100, height: 100 },
        },
      },
    });
    expect([200, 400, 503]).toContain(response.status());
  });
});
