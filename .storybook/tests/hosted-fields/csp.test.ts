import { expect } from "@playwright/test";
import path from "path";
import fs from "fs";

import { test } from "../helpers/playwright-helpers";
import {
  extractScriptSrcFromHTML,
  type CspReport,
} from "../helpers/test-server";

test.describe("Hosted Fields CSP", () => {
  const htmlDir = path.resolve(
    process.cwd(),
    `.storybook/static/local-build/html`
  );

  const htmlFiles = [
    { filename: "hosted-fields-frame.html", useMinified: false },
    { filename: "hosted-fields-frame.min.html", useMinified: true },
  ];

  for (const fileConfig of htmlFiles) {
    const { filename, useMinified } = fileConfig;
    const originalHtmlFilePath = path.join(htmlDir, filename);

    test.describe(`CSP tests for ${filename}`, () => {
      const cspReports: CspReport[] = [];

      if (!fs.existsSync(originalHtmlFilePath)) {
        throw new Error(`Original HTML not found: ${originalHtmlFilePath}`);
      }

      const htmlContent = fs.readFileSync(originalHtmlFilePath).toString();
      const scriptSrc = extractScriptSrcFromHTML(htmlContent);

      // Configure server options for all tests in this describe block
      test.use({
        testServerOptions: {
          enableCsp: true,
          cspReports,
          cspScriptSrc: scriptSrc,
          modifyMetaTag: false,
          forceServeMinified: useMinified,
        },
      });

      test.beforeEach(async ({ hostedFieldsPage, getTestUrl, page }) => {
        // Reset the array before each test
        cspReports.splice(0);

        const url = getTestUrl({ csp: true, useMinified });
        await page.goto(url, { waitUntil: "domcontentloaded" });

        await hostedFieldsPage.waitForHostedFieldsReady();
      });

      test("loads JS when CSP hash is correct", async ({ page }) => {
        const numberFrame = page.frameLocator(
          'iframe[id^="braintree-hosted-field-number"]'
        );
        await numberFrame
          .locator("form")
          .waitFor({ state: "visible", timeout: 10000 });

        await page.waitForTimeout(500);

        expect(cspReports.length).toBe(0);
      });
    });

    test.describe(`Bad CSP tests for ${filename}`, () => {
      const cspReports: CspReport[] = [];

      if (!fs.existsSync(originalHtmlFilePath)) {
        throw new Error(`Original HTML not found: ${originalHtmlFilePath}`);
      }

      const htmlContent = fs.readFileSync(originalHtmlFilePath).toString();
      const originalScriptSrc = extractScriptSrcFromHTML(htmlContent);

      const invalidScriptSrc = originalScriptSrc.replace(
        /sha256-[^'"]+/g,
        "sha256-INVALIDHASH"
      );

      // Configure server options for all tests in this describe block
      test.use({
        testServerOptions: {
          enableCsp: true,
          cspReports,
          cspScriptSrc: invalidScriptSrc,
          modifyMetaTag: true,
          // When testing minified file, force server to serve .min.html
          // even when SDK requests .html (works around the SDK not allowing minified files when not in dev mode)
          forceServeMinified: useMinified,
        },
      });

      test.beforeEach(() => {
        // Reset the array before each test
        cspReports.splice(0);
      });

      test("blocks JS when CSP hash is invalid", async ({
        getTestUrl,
        page,
      }) => {
        const url = getTestUrl({ csp: true, useMinified });
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Wait for CSP violations to be reported
        // Don't wait for hosted fields to be ready - they should be blocked by CSP
        await expect
          .poll(() => cspReports.length, {
            timeout: 10000,
            message: "Expected CSP violation reports but none were received",
          })
          .toBeGreaterThan(0);

        const allViolationsAreScriptSrc = cspReports.every(
          (report) =>
            report["csp-report"]["violated-directive"] === "script-src-elem" ||
            report["csp-report"]["effective-directive"] === "script-src-elem"
        );

        expect(allViolationsAreScriptSrc).toBe(true);
      });
    });
  }
});
