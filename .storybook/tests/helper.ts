/* eslint-disable no-console */
import { $ } from "@wdio/globals";
import http from "node:http";
import path from "path";
import fs from "fs";
import { SUCCESS_MESSAGES, DEFAULT_HOSTED_FIELDS_VALUES } from "../constants";

export interface CspReport {
  "csp-report": {
    "blocked-uri": string;
    disposition: string;
    "document-uri": string;
    "effective-directive": string;
    "original-policy": string;
    referrer: string;
    "script-sample": string;
    "status-code": number;
    "violated-directive": string;
  };
}

export interface TestServerOptions {
  // Enable CSP header injection and violation reporting
  enableCsp?: boolean;
  // Array to collect CSP violation reports (required if enableCsp is true)
  cspReports?: CspReport[];
  // Script-src CSP directive value (required if enableCsp is true)
  cspScriptSrc?: string;
  // Whether to modify the CSP meta tag in HTML (for "bad CSP" tests)
  modifyMetaTag?: boolean;
  // Custom HTTP headers to add to responses
  customHeaders?: Record<string, string>;
  // When true, serve .min.html when .html is requested for hosted-fields-frame
  // This works around SDK bug where development mode always requests .html
  forceServeMinified?: boolean;
}

export interface TestServerResult {
  server: http.Server;
  port: number;
  url: string;
}

export function extractScriptSrcFromHTML(htmlContent: string): string {
  const match = htmlContent.match(/script-src\s+([^"]+)"/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return "'self'";
}

function modifyCspMetaTag(html: string, newScriptSrc: string): string {
  // Match CSP meta tag - content value can contain single quotes for hashes
  // Use non-greedy match to capture everything up to the closing quote
  return html.replace(
    /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=["'](.+?)["']\s*>/gi,
    `<meta http-equiv="Content-Security-Policy" content="script-src ${newScriptSrc}">`
  );
}

function getContentType(filePath: string): string {
  const fileExtension = path.extname(filePath);
  switch (fileExtension) {
    case ".js":
      return "text/javascript";
    case ".css":
      return "text/css";
    case ".json":
      return "application/json";
    case ".html":
      return "text/html";
    default:
      return "text/html";
  }
}

function normalizeFilePath(
  url: string | undefined,
  forceServeMinified: boolean = false
): string {
  if (!url) {
    return path.resolve(process.cwd(), "storybook-static/index.html");
  }

  let filePath = url.split("?")[0];

  if (filePath === "./" || filePath.at(-1) === "/") {
    filePath = `${filePath}/index.html`;
  }

  if (filePath.startsWith("/")) {
    filePath = filePath.slice(1);
  }

  // When forceServeMinified is true, serve .min.html when .html is requested
  // This works around the SDK in development mode always requesting .html
  if (
    forceServeMinified &&
    filePath.includes("hosted-fields-frame.html") &&
    !filePath.includes(".min.html")
  ) {
    filePath = filePath.replace(
      "hosted-fields-frame.html",
      "hosted-fields-frame.min.html"
    );
  }

  return path.resolve(process.cwd(), "storybook-static/", filePath);
}

function processHtmlContent(
  htmlContent: string,
  filePath: string,
  enableCsp: boolean,
  modifyMetaTag: boolean,
  cspScriptSrc: string
): string {
  let processed = htmlContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (enableCsp && modifyMetaTag && filePath.includes("hosted-fields-frame")) {
    processed = modifyCspMetaTag(processed, cspScriptSrc);
  }

  return processed;
}

function handleFaviconRequest(
  url: string | undefined,
  res: http.ServerResponse
): boolean {
  if (url === "/favicon.ico") {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

function handleCspReport(
  url: string | undefined,
  enableCsp: boolean,
  cspReports: CspReport[],
  req: http.IncomingMessage,
  res: http.ServerResponse
): boolean {
  if (enableCsp && url === "/csp-reports") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const report = JSON.parse(body);
        cspReports.push(report);
        res.statusCode = 204;
        res.end();
        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
      } catch (error) {
        res.statusCode = 400;
        res.end();
      }
    });
    return true;
  }
  return false;
}

function applyCspHeaders(
  res: http.ServerResponse,
  enableCsp: boolean,
  filePath: string,
  cspScriptSrc: string
): void {
  if (enableCsp && filePath.includes("hosted-fields-frame")) {
    res.setHeader(
      "Content-Security-Policy",
      `script-src ${cspScriptSrc}; report-uri /csp-reports`
    );
  }
}

function applyCustomHeaders(
  res: http.ServerResponse,
  customHeaders: Record<string, string>
): void {
  Object.entries(customHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

function serveFile(
  filePath: string,
  res: http.ServerResponse,
  enableCsp: boolean,
  modifyMetaTag: boolean,
  cspScriptSrc: string,
  customHeaders: Record<string, string>
): void {
  try {
    const fileContent = fs.readFileSync(filePath);
    const fileExtension = path.extname(filePath);
    const contentType = getContentType(filePath);

    if (fileExtension === ".html") {
      const htmlContent = processHtmlContent(
        fileContent.toString(),
        filePath,
        enableCsp,
        modifyMetaTag,
        cspScriptSrc
      );

      applyCspHeaders(res, enableCsp, filePath, cspScriptSrc);
      applyCustomHeaders(res, customHeaders);

      // Prevent caching to ensure each test gets fresh content with correct CSP
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      res.setHeader("Content-Type", contentType);
      res.statusCode = 200;
      res.end(htmlContent);
      return;
    }

    // Prevent caching for all responses
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.setHeader("Content-Type", contentType);
    res.statusCode = 200;
    res.end(fileContent);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    res.statusCode = 404;
    res.end("File not found");
  }
}

/**
 * Creates a per-test HTTP server for serving Storybook static files
 * with optional CSP support and custom headers.
 *
 * @param options - Configuration options for the server
 * @returns Promise resolving to server instance, port, and URL
 */
export function createTestServer(
  options: TestServerOptions = {}
): Promise<TestServerResult> {
  const {
    enableCsp = false,
    cspReports = [],
    cspScriptSrc = "'self'",
    modifyMetaTag = false,
    customHeaders = {},
    forceServeMinified = false,
  } = options;

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (handleFaviconRequest(req.url, res)) {
        return;
      }

      if (handleCspReport(req.url, enableCsp, cspReports, req, res)) {
        return;
      }

      const filePath = normalizeFilePath(req.url, forceServeMinified);
      serveFile(
        filePath,
        res,
        enableCsp,
        modifyMetaTag,
        cspScriptSrc,
        customHeaders
      );
    });

    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const url = `http://localhost:${port}`;
      resolve({ server, port, url });
    });
  });
}

export const loadHelpers = function () {
  browser.addCommand(
    "reloadSessionOnRetry",
    async (test: { _currentRetry: number }) => {
      if (test._currentRetry > 0) {
        await browser.reloadSession();
      }
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "getResult",
    async function () {
      const result = {
        success: false,
      };

      await $("#result").waitForExist();
      const resultElement = await $("#result").getText();

      result.success =
        resultElement.includes(SUCCESS_MESSAGES.TOKENIZATION) ||
        resultElement.includes(SUCCESS_MESSAGES.VERIFICATION);

      return result;
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "waitForHostedFieldsReady",
    async function () {
      // First, wait for SDK and iframes to exist in DOM
      await browser.waitUntil(
        async () => {
          const braintreeLoaded = await browser.execute(() => {
            return (
              typeof window.braintree !== "undefined" &&
              window.braintree.hostedFields &&
              document.querySelectorAll("iframe[id^=braintree-hosted-field]")
                .length > 0
            );
          });
          return braintreeLoaded;
        },
        {
          timeout: 20000,
          timeoutMsg:
            "Braintree SDK or hosted field iframes not found after 20s",
        }
      );

      // Now verify each iframe has its internal input element ready
      const iframes = await $$("iframe[id^=braintree-hosted-field]");

      for (const iframe of iframes) {
        const iframeId = await iframe.getAttribute("id");

        await browser.waitUntil(
          async () => {
            try {
              await browser.switchFrame(iframe);
              const inputExists = await $("input").isExisting();
              await browser.switchFrame(null);
              return inputExists;
            } catch (e) {
              console.error(`Error checking iframe ${iframeId}:`, e);
              await browser.switchFrame(null);
              return false;
            }
          },
          {
            timeout: 10000,
            timeoutMsg: `Hosted field ${iframeId} input not ready after 10s`,
          }
        );
      }
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "waitForHostedField",
    async function (key: string) {
      const iframe = await $(`#braintree-hosted-field-${key}`);
      await iframe.waitForExist({ timeout: 10000 });

      await browser.waitUntil(
        async () => {
          try {
            await browser.switchFrame(iframe);
            const inputExists = await $("input").isExisting();
            await browser.switchFrame(null);
            return inputExists;
          } catch (e) {
            console.error(e);
            await browser.switchFrame(null);
            return false;
          }
        },
        {
          timeout: 10000,
          timeoutMsg: `Hosted field ${key} not ready for interaction after 10s`,
        }
      );
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "hostedFieldSendInput",
    async function (key: string, value: string) {
      await browser.waitForHostedField(key);

      let updatedValue = value;
      if (!updatedValue) {
        updatedValue = DEFAULT_HOSTED_FIELDS_VALUES[key];
      }

      await browser.switchFrame($(`#braintree-hosted-field-${key}`));
      await $("input").setValue(updatedValue);
      await browser.switchFrame(null);
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "hostedFieldClearWithKeypress",
    async function (key: string, deleteCount: number) {
      await browser.waitForHostedField(key);

      await browser.switchFrame($(`#braintree-hosted-field-${key}`));

      const inputField = await $("input");

      await inputField.click();

      // Send individual backspace keypresses with a small delay between them
      // Safari seems to need this sequential approach
      if (deleteCount > 0) {
        for (let i = 0; i < deleteCount; i++) {
          await browser.keys("\uE003"); // Single Backspace key
          await browser.pause(50); // Small delay between keypresses
        }
      }

      await browser.switchFrame(null);

      await browser.pause(300);
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "waitForFormReady",
    async function () {
      const submitButton = await $('button[type="submit"]');

      await browser.waitUntil(
        async () => {
          return !(await submitButton.getAttribute("disabled"));
        },
        {
          timeout: 15000,
          timeoutMsg:
            "Form submit button not enabled after 15s - form validation may have failed",
        }
      );
    },
    { attachToElement: false }
  );

  browser.addCommand(
    "submitPay",
    async function () {
      await browser.waitForFormReady();

      const submitButton = await $('button[type="submit"]');
      await submitButton.click();

      await browser.waitUntil(
        async () => {
          const resultDiv = await $("#result");
          const resultClasses = await resultDiv.getAttribute("class");
          return resultClasses.includes("shared-result--visible");
        },
        {
          timeout: 10000,
          timeoutMsg: "Result container never became visible after submit",
        }
      );

      await browser.getResult();
    },
    { attachToElement: false }
  );
};
