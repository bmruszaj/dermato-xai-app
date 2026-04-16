# Playwright E2E Tests

## Structure

```
tests/
  e2e/
    auth.test.ts   — Login/register page tests and auth redirect behaviour
    api.test.ts    — Annotate API endpoint tests (/api/predict, /api/feedback)
```

## Running tests

```bash
npx playwright test
```

## Writing new tests

### Auth tests
Use `page.goto("/login")` / `page.goto("/register")` and assert UI elements.
Authenticated flows should use `page.goto("/annotate")` after signing in via the UI or via `storageState`.

### Annotate page tests
The annotate page is the main user flow. Tests should cover:
- Upload zone renders on load
- After image upload, annotation canvas appears
- Bounding boxes can be drawn
- Submitting annotations triggers the feedback phase

Example skeleton:
```ts
import { expect, test } from "@playwright/test";

test("annotate page loads after login", async ({ page }) => {
  // TODO: set up auth state first via storageState or UI login
  await page.goto("/annotate");
  await expect(page.getByText("Wgraj obraz")).toBeVisible();
});
```

### API tests
Use Playwright's `request` fixture to test API routes directly.
For `/api/predict` and `/api/feedback`, ensure environment variables
(`MODAL_RFDETR_URL`, CLARIN credentials) are set before running.

## Environment variables needed for tests

```
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
POSTGRES_URL=...
NEXTAUTH_SECRET=...
MODAL_RFDETR_URL=...
CLARIN_API_KEY=...   (or equivalent)
```
