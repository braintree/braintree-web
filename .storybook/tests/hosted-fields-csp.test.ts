import path from "path";
import fs from "fs";
import {
  createTestServer,
  extractScriptSrcFromHTML,
  type CspReport,
} from "./helper";
import http from "node:http";

describe("Hosted Fields CSP", () => {
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
    const urlPath = `/iframe.html?globals=&args=&id=braintree-hosted-fields--hosted-fields-csp-test&viewMode=story&useMinified=${useMinified}`;

    const getTestUrl = (serverPort: number, path: string) => {
      let url = `http://localhost:${serverPort}${path}`;

      if (process.env.LOCAL_BUILD === "true") {
        const hasQuery = url.includes("?");
        const separator = hasQuery ? "&" : "?";
        url = `${url}${separator}globals=sdkVersion:dev`;
      }

      return encodeURI(url);
    };

    describe(`CSP tests for ${filename}`, () => {
      const cspReports: CspReport[] = [];
      let server: http.Server;
      let serverPort: number;

      beforeEach(async () => {
        if (!fs.existsSync(originalHtmlFilePath)) {
          throw new Error(`Original HTML not found: ${originalHtmlFilePath}`);
        }

        const htmlContent = fs.readFileSync(originalHtmlFilePath).toString();
        const scriptSrc = extractScriptSrcFromHTML(htmlContent);

        // Reset the array before passing it to the HTTP server
        cspReports.splice(0);

        const result = await createTestServer({
          enableCsp: true,
          cspReports,
          cspScriptSrc: scriptSrc,
          modifyMetaTag: false,
          // When testing minified file, force server to serve .min.html
          // even when SDK requests .html (works around the SDK not allowing minified files when not in dev mode)
          forceServeMinified: useMinified,
        });

        server = result.server;
        serverPort = result.port;
      });

      afterEach(async () => {
        if (server) {
          await new Promise<void>((resolve) => {
            server.close(() => resolve());
          });
        }
      });

      it("loads JS when CSP hash is correct", async () => {
        await browser.url(getTestUrl(serverPort, urlPath));

        await browser.waitUntil(
          () => {
            return browser.execute(() => {
              // Look for form inside the hosted-fields iframe
              const iframe = document.querySelector(
                'iframe[id^="braintree-hosted-field"]'
              ) as HTMLIFrameElement;

              if (iframe?.contentDocument) {
                return iframe.contentDocument.querySelector("form") !== null;
              }

              return false;
            });
          },
          {
            timeout: 10000,
            interval: 100,
            timeoutMsg:
              "Script did not execute - form element not found in iframe",
          }
        );

        await browser.pause(500);

        expect(cspReports.length).toBe(0);
      });
    });

    describe(`Bad CSP tests for ${filename}`, () => {
      const cspReports: CspReport[] = [];
      let server: http.Server;
      let serverPort: number;

      beforeEach(async () => {
        if (!fs.existsSync(originalHtmlFilePath)) {
          throw new Error(`Original HTML not found: ${originalHtmlFilePath}`);
        }

        const htmlContent = fs.readFileSync(originalHtmlFilePath).toString();
        const originalScriptSrc = extractScriptSrcFromHTML(htmlContent);

        const invalidScriptSrc = originalScriptSrc.replace(
          /sha256-[^'"]+/g,
          "sha256-INVALIDHASH"
        );

        // Reset the array before passing it to the HTTP server
        cspReports.splice(0);

        const result = await createTestServer({
          enableCsp: true,
          cspReports,
          cspScriptSrc: invalidScriptSrc,
          modifyMetaTag: true,
          // When testing minified file, force server to serve .min.html
          // even when SDK requests .html (works around the SDK not allowing minified files when not in dev mode)
          forceServeMinified: useMinified,
        });
        server = result.server;
        serverPort = result.port;
      });

      afterEach(async () => {
        if (server) {
          await new Promise<void>((resolve) => {
            server.close(() => resolve());
          });
        }
      });

      it("blocks JS when CSP hash is invalid", async function () {
        await browser.url(getTestUrl(serverPort, urlPath));

        await browser.waitUntil(() => cspReports.length > 0, {
          timeout: 10000,
          interval: 100,
          timeoutMsg: "Expected CSP violation reports but none were received",
        });

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
