import { expect, test } from "@playwright/test";

test("React playground streams and renders shared semantic AST", async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.getByLabel("场景").selectOption("basic");
  await page.locator('input[type="range"]').fill("40");
  await page.getByRole("button", { name: "开始" }).click();

  await expect(
    page.getByTestId("render-output").getByRole("heading", { name: "基础 Markdown" }),
  ).toBeVisible();
  await expect(page.getByTestId("connection-status")).toHaveText("finished");

  await page.getByLabel("场景").selectOption("table");
  await page.locator('input[type="range"]').fill("0");
  await page.getByRole("button", { name: "开始" }).click();
  await expect(page.getByTestId("render-output").locator("table")).toBeVisible();
  await expect(page.getByTestId("connection-status")).toHaveText("finished");

  await page.getByLabel("场景").selectOption("semantic");
  await page.getByRole("button", { name: "开始" }).click();
  await expect(page.getByTestId("render-output").locator(".increase")).toBeVisible();
  await expect(page.getByTestId("render-output").locator(".risk-card")).toBeVisible();
});

test("React malformed scenario recovers without crashing", async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.getByLabel("场景").selectOption("malformed");
  await page.locator('input[type="range"]').fill("0");
  await page.getByRole("button", { name: "开始" }).click();
  await expect(page.getByTestId("connection-status")).toHaveText("finished");
  await expect(page.getByTestId("render-output")).toContainText("错误恢复");
});
