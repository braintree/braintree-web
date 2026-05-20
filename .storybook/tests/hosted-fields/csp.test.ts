import { expect } from "@playwright/test";
import path from "path";
import fs from "fs";

import { test } from "../helpers/playwright-helpers";
import { extractScriptSrcFromHTML } from "../helpers/test-server";

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
      if (!fs.existsSync(originalHtmlFilePath)) {
        throw new Error(`Original HTML not found: ${originalHtmlFilePath}`);
      }

      const htmlContent = fs.readFileSync(originalHtmlFilePath).toString();
      const scriptSrc = extractScriptSrcFromHTML(htmlContent);

      // Configure server options for all tests in this describe block
      test.use({
        testServerOptions: {
          enableCsp: true,
          cspScriptSrc: scriptSrc,
          modifyMetaTag: false,
          forceServeMinified: useMinified,
        },
      });

      test("loads JS when CSP hash is correct", async ({
        testServer,
        page,
      }) => {
        // Navigate directly to the frame HTML served by the test server.
        // The SDK constructs the hosted-fields iframe URL from assetsUrl, which
        // resolves to the CDN in CI (BRAINTREE_JS_ASSET_URL is not set at build
        // time). By navigating to the file directly we ensure the test server's
        // CSP headers and meta-tag modifications are actually applied to the page
        // under test.
        await page.addInitScript(() => {
          (window as any).__cspViolations = [];
          document.addEventListener(
            "securitypolicyviolation",
            (e: SecurityPolicyViolationEvent) => {
              (window as any).__cspViolations.push(
                e.effectiveDirective || e.violatedDirective
              );
            }
          );
        });

        const frameUrl = `http://localhost:${testServer.port}/local-build/html/${filename}`;

        await page.goto(frameUrl, { waitUntil: "domcontentloaded" });

        // Allow time for any delayed violation reports to arrive
        await page.waitForTimeout(1000);

        const violations: string[] = await page.evaluate(
          () => (window as any).__cspViolations ?? []
        );

        expect(violations.length).toBe(0);
      });
    });

    test.describe(`Bad CSP tests for ${filename}`, () => {
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
          cspScriptSrc: invalidScriptSrc,
          modifyMetaTag: true,
          forceServeMinified: useMinified,
        },
      });

      test("blocks JS when CSP hash is invalid", async ({
        testServer,
        page,
      }) => {
        // Navigate directly to the frame HTML served by the test server.
        // The SDK constructs the hosted-fields iframe URL from assetsUrl, which
        // resolves to the CDN in CI (BRAINTREE_JS_ASSET_URL is not set at build
        // time). By navigating to the file directly we ensure the test server's
        // CSP headers and meta-tag modifications are actually applied to the page
        // under test.
        //
        // We use securitypolicyviolation DOM events (via addInitScript +
        // page.evaluate) rather than report-uri. This event fires synchronously
        // in the browser when a violation is detected and requires no network
        // round-trip, making it reliable in remote BrowserStack sessions where
        // report-uri POSTs are dropped by the tunnel.
        //
        // Because we navigate directly (not inside an SDK-created iframe), the
        // violation fires on window itself — no window.top cross-frame writes
        // needed.
        await page.addInitScript(() => {
          (window as any).__cspViolations = [];
          document.addEventListener(
            "securitypolicyviolation",
            (e: SecurityPolicyViolationEvent) => {
              (window as any).__cspViolations.push(
                e.effectiveDirective || e.violatedDirective
              );
            }
          );
        });

        const frameUrl = `http://localhost:${testServer.port}/local-build/html/${filename}`;

        await page.goto(frameUrl, { waitUntil: "domcontentloaded" });

        // Wait for at least one CSP violation to be detected.
        // Don't wait for hosted fields to be ready — they should be blocked by CSP.
        await expect
          .poll(
            () =>
              page.evaluate(() => (window as any).__cspViolations?.length ?? 0),
            {
              timeout: 10000,
              message: "Expected CSP violation events but none were received",
            }
          )
          .toBeGreaterThan(0);

        const violations: string[] = await page.evaluate(
          () => (window as any).__cspViolations ?? []
        );

        const allViolationsAreScriptSrc = violations.every(
          (directive) =>
            directive === "script-src-elem" || directive === "script-src"
        );

        expect(allViolationsAreScriptSrc).toBe(true);
      });
    });
  }
});
