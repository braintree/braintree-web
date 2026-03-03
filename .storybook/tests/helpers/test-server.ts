/* eslint-disable no-console */
import http from "node:http";
import https from "node:https";
import path from "path";
import fs from "fs";

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
  enableCsp?: boolean;
  cspReports?: CspReport[];
  cspScriptSrc?: string;
  modifyMetaTag?: boolean;
  customHeaders?: Record<string, string>;
  forceServeMinified?: boolean;
  useHttps?: boolean;
}

export interface TestServerResult {
  server: http.Server | https.Server;
  port: number;
  url: string;
}

export const extractScriptSrcFromHTML = (htmlContent: string): string => {
  const match = htmlContent.match(/script-src\s+([^"]+)"/);

  if (match && match[1]) {
    return match[1].trim();
  }

  return "'self'";
};

const modifyCspMetaTag = (html: string, newScriptSrc: string): string => {
  return html.replace(
    /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=["'](.+?)["']\s*>/gi,
    `<meta http-equiv="Content-Security-Policy" content="script-src ${newScriptSrc}">`
  );
};

const getContentType = (filePath: string): string => {
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
};

const normalizeFilePath = (
  url: string | undefined,
  forceServeMinified: boolean = false
): string => {
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
};

const processHtmlContent = (
  htmlContent: string,
  filePath: string,
  enableCsp: boolean,
  modifyMetaTag: boolean,
  cspScriptSrc: string
): string => {
  let processed = htmlContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (enableCsp && modifyMetaTag && filePath.includes("hosted-fields-frame")) {
    processed = modifyCspMetaTag(processed, cspScriptSrc);
  }

  return processed;
};

const handleFaviconRequest = (
  url: string | undefined,
  response: http.ServerResponse
): boolean => {
  if (url === "/favicon.ico") {
    response.statusCode = 204;
    response.end();

    return true;
  }

  return false;
};

const handleCspReport = (
  url: string | undefined,
  enableCsp: boolean,
  cspReports: CspReport[],
  request: http.IncomingMessage,
  response: http.ServerResponse
): boolean => {
  if (enableCsp && url === "/csp-reports") {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString();
    });

    request.on("end", () => {
      try {
        const report = JSON.parse(body);
        cspReports.push(report);
        response.statusCode = 204;
        response.end();
      } catch {
        response.statusCode = 400;
        response.end();
      }
    });

    return true;
  }

  return false;
};

const applyCspHeaders = (
  response: http.ServerResponse,
  enableCsp: boolean,
  filePath: string,
  cspScriptSrc: string
): void => {
  if (enableCsp && filePath.includes("hosted-fields-frame")) {
    response.setHeader(
      "Content-Security-Policy",
      `script-src ${cspScriptSrc}; report-uri /csp-reports`
    );
  }
};

const applyCustomHeaders = (
  response: http.ServerResponse,
  customHeaders: Record<string, string>
): void => {
  Object.entries(customHeaders).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
};

const serveFile = (
  filePath: string,
  response: http.ServerResponse,
  enableCsp: boolean,
  modifyMetaTag: boolean,
  cspScriptSrc: string,
  customHeaders: Record<string, string>
): void => {
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

      applyCspHeaders(response, enableCsp, filePath, cspScriptSrc);
      applyCustomHeaders(response, customHeaders);

      response.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
      );
      response.setHeader("Pragma", "no-cache");
      response.setHeader("Expires", "0");

      response.setHeader("Content-Type", contentType);
      response.statusCode = 200;
      response.end(htmlContent);

      return;
    }

    response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Expires", "0");

    response.setHeader("Content-Type", contentType);
    response.statusCode = 200;
    response.end(fileContent);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    response.statusCode = 404;
    response.end("File not found");
  }
};

export const createTestServer = (
  options: TestServerOptions = {}
): Promise<TestServerResult> => {
  const {
    enableCsp = false,
    cspReports = [],
    cspScriptSrc = "'self'",
    modifyMetaTag = false,
    customHeaders = {},
    forceServeMinified = false,
    useHttps = false,
  } = options;

  return new Promise((resolve) => {
    const requestHandler = (
      req: http.IncomingMessage,
      res: http.ServerResponse
    ) => {
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
    };

    let server: http.Server | https.Server;

    if (useHttps) {
      // Load SSL certificates for HTTPS server
      const certPath = path.join(process.cwd(), ".storybook/certs");
      const keyPath = path.join(certPath, "localhost.key");
      const certFilePath = path.join(certPath, "localhost.crt");

      if (!fs.existsSync(keyPath) || !fs.existsSync(certFilePath)) {
        throw new Error(
          `SSL certificates not found. Run: .storybook/scripts/generate-test-certs.sh`
        );
      }

      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certFilePath),
      };

      server = https.createServer(httpsOptions, requestHandler);
    } else {
      server = http.createServer(requestHandler);
    }

    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      const protocol = useHttps ? "https" : "http";
      const url = `${protocol}://localhost:${port}`;
      resolve({ server, port, url });
    });
  });
};
