import { expect, test } from "@playwright/test";

test.describe("Public release flow", () => {
  test("landing page renders public project card", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Wyjaśnialne wsparcie adnotacji obrazów dermoskopowych",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Wypróbuj demo" }).first()
    ).toBeVisible();
  });

  test("annotate page is available without login", async ({ page }) => {
    await page.goto("/annotate");

    await expect(page).toHaveURL("/annotate");
    await expect(
      page.getByRole("heading", { name: "Wybierz obraz do demo" })
    ).toBeVisible();
    await expect(page.getByText("Wybierz obraz przykładowy")).toBeVisible();
  });

  test("sample image starts annotation flow", async ({ page }) => {
    await page.route("**/api/predict", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { predictions: [] },
        status: 200,
      });
    });

    await page.goto("/annotate");

    await page.getByRole("button", { name: /ISIC 68/ }).click();
    await expect(
      page.getByRole("heading", { name: "Adnotuj obraz" })
    ).toBeVisible();
    await expect(page.getByText("Zatwierdź adnotacje")).toBeVisible();
  });
});
