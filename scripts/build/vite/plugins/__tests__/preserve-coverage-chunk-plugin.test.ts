import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import preserveCoverageChunkPlugin from "../preserve-coverage-chunk-plugin.ts";

let tmpDir: string;
let htmlOutDir: string;
let jsOutDir: string;

const ORIGINAL_COVERAGE = process.env.BRAINTREE_JS_COVERAGE_BUILD;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "preserve-chunk-test-"));
  htmlOutDir = path.join(tmpDir, "html");
  jsOutDir = path.join(tmpDir, "js");
  fs.mkdirSync(htmlOutDir, { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });

  if (ORIGINAL_COVERAGE === undefined) {
    delete process.env.BRAINTREE_JS_COVERAGE_BUILD;
  } else {
    process.env.BRAINTREE_JS_COVERAGE_BUILD = ORIGINAL_COVERAGE;
  }
});

async function runPlugin(options: {
  chunkFileName: string;
  coverageChunkOutputName: string;
}): Promise<void> {
  const plugin = preserveCoverageChunkPlugin({
    chunkFileName: options.chunkFileName,
    coverageChunkOutputName: options.coverageChunkOutputName,
    htmlOutDir,
    jsOutDir,
  });

  await plugin.writeBundle();
}

describe("preserveCoverageChunkPlugin", () => {
  it("moves the chunk from html/ to js/ under a coverage build", async () => {
    process.env.BRAINTREE_JS_COVERAGE_BUILD = "true";
    const chunkSrc = path.join(htmlOutDir, "redirect-frame.js");

    fs.writeFileSync(chunkSrc, "var x = 1;");

    await runPlugin({
      chunkFileName: "redirect-frame.js",
      coverageChunkOutputName: "local-payment-redirect-frame.js",
    });

    expect(fs.existsSync(chunkSrc)).toBe(false);
    expect(
      fs.readFileSync(
        path.join(jsOutDir, "local-payment-redirect-frame.js"),
        "utf8"
      )
    ).toBe("var x = 1;");
  });

  it("creates the destination js/ directory when it does not exist", async () => {
    process.env.BRAINTREE_JS_COVERAGE_BUILD = "true";
    fs.writeFileSync(
      path.join(htmlOutDir, "venmo-desktop-frame.js"),
      "var v = 1;"
    );

    expect(fs.existsSync(jsOutDir)).toBe(false);

    await runPlugin({
      chunkFileName: "venmo-desktop-frame.js",
      coverageChunkOutputName: "venmo-desktop-frame-internal.js",
    });

    expect(
      fs.existsSync(path.join(jsOutDir, "venmo-desktop-frame-internal.js"))
    ).toBe(true);
  });

  it("does nothing when BRAINTREE_JS_COVERAGE_BUILD is unset", async () => {
    delete process.env.BRAINTREE_JS_COVERAGE_BUILD;
    const chunkSrc = path.join(htmlOutDir, "redirect-frame.js");

    fs.writeFileSync(chunkSrc, "var x = 1;");

    await runPlugin({
      chunkFileName: "redirect-frame.js",
      coverageChunkOutputName: "local-payment-redirect-frame.js",
    });

    expect(fs.existsSync(chunkSrc)).toBe(true);
    expect(fs.existsSync(jsOutDir)).toBe(false);
  });

  it('does nothing when BRAINTREE_JS_COVERAGE_BUILD is not exactly "true"', async () => {
    process.env.BRAINTREE_JS_COVERAGE_BUILD = "1";
    const chunkSrc = path.join(htmlOutDir, "redirect-frame.js");

    fs.writeFileSync(chunkSrc, "var x = 1;");

    await runPlugin({
      chunkFileName: "redirect-frame.js",
      coverageChunkOutputName: "local-payment-redirect-frame.js",
    });

    expect(fs.existsSync(chunkSrc)).toBe(true);
  });
});
