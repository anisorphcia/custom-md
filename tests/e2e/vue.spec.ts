import { expect, test } from "@playwright/test";

test("Vue playground streams and renders shared semantic AST", async ({ page }) => {
  await page.goto("http://localhost:5174");
  await page.getByLabel("场景").selectOption("code");
  await page.locator('input[type="range"]').fill("30");
  await page.getByRole("button", { name: "开始" }).click();

  await expect(page.getByTestId("render-output").locator("pre code").first()).toBeVisible();
  await expect(page.getByTestId("connection-status")).toHaveText("finished");

  await page.getByLabel("场景").selectOption("semantic");
  await page.locator('input[type="range"]').fill("0");
  await page.getByRole("button", { name: "开始" }).click();
  await expect(page.getByTestId("render-output").locator(".increase")).toBeVisible();
  await expect(page.getByTestId("render-output").locator(".risk-card")).toBeVisible();
  await expect(page.getByTestId("connection-status")).toHaveText("finished");
});

test("Vue malformed scenario recovers without crashing", async ({ page }) => {
  await page.goto("http://localhost:5174");
  await page.getByLabel("场景").selectOption("malformed");
  await page.locator('input[type="range"]').fill("0");
  await page.getByRole("button", { name: "开始" }).click();
  await expect(page.getByTestId("connection-status")).toHaveText("finished");
  await expect(page.getByTestId("render-output")).toContainText("错误恢复");
});
