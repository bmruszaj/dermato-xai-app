# Playwright E2E Tests

## Structure

```
tests/
  e2e/
    auth.test.ts   — Public landing/demo access tests
    api.test.ts    — Annotate API validation tests (/api/predict, /api/feedback)
```

## Running tests

```bash
npx playwright test
```

## Writing new tests

### Public page tests
Use `page.goto("/")` and assert that the project landing page renders.
The annotate flow is public, so tests should go directly to `/annotate`.

### Annotate page tests
The annotate page is the main user flow. Tests should cover:
- Upload zone renders on load
- After image upload, annotation canvas appears
- Bounding boxes can be drawn
- Submitting annotations triggers the feedback phase

Example skeleton:
```ts
import { expect, test } from "@playwright/test";

test("annotate page loads publicly", async ({ page }) => {
  await page.goto("/annotate");
  await expect(page.getByText("Wybierz obraz do demo")).toBeVisible();
});
```

### API tests
Use Playwright's `request` fixture to test API routes directly.
For tests that call the real model or CLARIN feedback, ensure environment variables
(`MODAL_RFDETR_URL`, `CLARIN_API_KEY`) are set before running. Validation tests avoid external calls.

## Environment variables needed for tests

```
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
MODAL_RFDETR_URL=...
CLARIN_API_KEY=...
```
