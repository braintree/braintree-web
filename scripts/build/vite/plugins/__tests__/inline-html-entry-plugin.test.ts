import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import inlineHtmlEntryPlugin from "../inline-html-entry-plugin.ts";
import type { BundleChunk, EmittedFile } from "../shared.ts";

type Bundle = Record<string, BundleChunk>;

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "inline-entry-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeTemplate(name: string, contents: string): string {
  const filePath = path.join(tmpDir, name);

  fs.writeFileSync(filePath, contents);

  return filePath;
}

function runPlugin(
  entries: { [outputName: string]: string },
  bundle: Bundle,
  pluginOpts: { preserveChunk?: boolean } = {}
): EmittedFile[] {
  const emitted: EmittedFile[] = [];
  const plugin = inlineHtmlEntryPlugin({
    entries,
    ...pluginOpts,
  });
  const ctx = {
    emitFile(file: EmittedFile) {
      emitted.push(file);
    },
    error(message: string): never {
      throw new Error(message);
    },
  };

  plugin.generateBundle.call(ctx, {}, bundle);

  return emitted;
}

describe("inlineHtmlEntryPlugin", () => {
  it("inlines a chunk into the template and emits the HTML asset", () => {
    const htmlPath = writeTemplate(
      "entry.html",
      '<html><head></head><body><script type="module" src="./entry.js"></script></body></html>'
    );
    const bundle: Bundle = {
      "entry.js": { type: "chunk", code: 'console.log("hi");' },
    };

    const emitted = runPlugin({ "dispatch-frame": htmlPath }, bundle);

    expect(emitted).toHaveLength(1);
    expect(emitted[0].fileName).toBe("dispatch-frame.html");
    expect(emitted[0].source).toContain('<script>console.log("hi");</script>');
    expect(emitted[0].source).not.toContain('script type="module"');
  });

  it("removes the inlined chunk from the bundle so it is not emitted as a sibling file", () => {
    const htmlPath = writeTemplate(
      "entry.html",
      '<html><head></head><body><script type="module" src="./entry.js"></script></body></html>'
    );
    const bundle: Bundle = {
      "entry.js": { type: "chunk", code: "var x = 1;" },
    };

    runPlugin({ frame: htmlPath }, bundle);

    expect(bundle["entry.js"]).toBeUndefined();
  });

  it("resolves chunks emitted under a subdirectory prefix", () => {
    const htmlPath = writeTemplate(
      "entry.html",
      '<html><head></head><body><script type="module" src="./entry.js"></script></body></html>'
    );
    const bundle: Bundle = {
      "assets/entry.js": { type: "chunk", code: "var x = 1;" },
    };

    const emitted = runPlugin({ frame: htmlPath }, bundle);

    expect(emitted[0].source).toContain("var x = 1;");
    expect(bundle["assets/entry.js"]).toBeUndefined();
  });

  it("throws a descriptive error when no matching chunk exists", () => {
    const htmlPath = writeTemplate(
      "entry.html",
      '<html><head></head><body><script type="module" src="./missing.js"></script></body></html>'
    );
    const bundle: Bundle = {
      "other.js": { type: "chunk", code: "" },
    };

    expect(() => runPlugin({ frame: htmlPath }, bundle)).toThrow(
      /no chunk matching "missing.js"/
    );
  });

  it("leaves non-module / non-./ script tags alone", () => {
    const htmlPath = writeTemplate(
      "entry.html",
      '<html><head></head><body><script src="https://cdn.example/lib.js"></script><script type="module" src="./entry.js"></script></body></html>'
    );
    const bundle: Bundle = {
      "entry.js": { type: "chunk", code: 'var inlined = "yes";' },
    };

    const emitted = runPlugin({ frame: htmlPath }, bundle);

    expect(emitted[0].source).toContain(
      '<script src="https://cdn.example/lib.js"></script>'
    );
    expect(emitted[0].source).toContain('var inlined = "yes";');
  });

  it("leaves relative non-module script tags alone", () => {
    const htmlPath = writeTemplate(
      "entry.html",
      '<html><head></head><body><script src="./other.js"></script><script type="module" src="./entry.js"></script></body></html>'
    );
    const bundle: Bundle = {
      "entry.js": { type: "chunk", code: "var x = 1;" },
    };

    const emitted = runPlugin({ frame: htmlPath }, bundle);

    expect(emitted[0].source).toContain('<script src="./other.js"></script>');
    expect(emitted[0].source).toContain("var x = 1;");
  });

  it("escapes literal </script> sequences in the bundled code so they cannot terminate the inline script tag", () => {
    const htmlPath = writeTemplate(
      "entry.html",
      '<html><head></head><body><script type="module" src="./entry.js"></script></body></html>'
    );
    const bundle: Bundle = {
      "entry.js": {
        type: "chunk",
        code: 'var html = "<p>hi</p></script><script>alert(1)</script>";',
      },
    };

    const emitted = runPlugin({ frame: htmlPath }, bundle);
    const source = emitted[0].source as string;

    // Bundled `</script>` must be escaped, or the browser terminates the
    // inline script at that point and treats the rest as HTML.
    expect(source).toContain("<\\/script>");
    expect(source).not.toMatch(/<\/script><script>alert\(1\)<\/script>/);
  });

  it("retains the inlined chunk in the bundle when preserveChunk is true", () => {
    const htmlPath = writeTemplate(
      "entry.html",
      '<html><head></head><body><script type="module" src="./entry.js"></script></body></html>'
    );
    const bundle: Bundle = {
      "entry.js": { type: "chunk", code: 'var x = "coverage";' },
    };

    const emitted = runPlugin({ frame: htmlPath }, bundle, {
      preserveChunk: true,
    });

    expect(bundle["entry.js"]).toBeDefined();
    expect(bundle["entry.js"].code).toBe('var x = "coverage";');
    expect(emitted[0].source).toContain('var x = "coverage";');
  });

  it("retains chunks resolved via a subdirectory prefix when preserveChunk is true", () => {
    const htmlPath = writeTemplate(
      "entry.html",
      '<html><head></head><body><script type="module" src="./entry.js"></script></body></html>'
    );
    const bundle: Bundle = {
      "assets/entry.js": { type: "chunk", code: "var x = 1;" },
    };

    runPlugin({ frame: htmlPath }, bundle, { preserveChunk: true });

    expect(bundle["assets/entry.js"]).toBeDefined();
  });

  it("processes multiple entries in one pass and emits one HTML per entry", () => {
    const dispatchHtml = writeTemplate(
      "dispatch.html",
      '<html><head></head><body><script type="module" src="./dispatch.js"></script></body></html>'
    );
    const cancelHtml = writeTemplate(
      "cancel.html",
      '<html><head></head><body><script type="module" src="./cancel.js"></script></body></html>'
    );
    const redirectHtml = writeTemplate(
      "redirect.html",
      '<html><head></head><body><script type="module" src="./redirect.js"></script></body></html>'
    );
    const bundle: Bundle = {
      "dispatch.js": { type: "chunk", code: 'var d = "dispatch";' },
      "cancel.js": { type: "chunk", code: 'var c = "cancel";' },
      "redirect.js": { type: "chunk", code: 'var r = "redirect";' },
    };

    const emitted = runPlugin(
      {
        "dispatch-frame": dispatchHtml,
        "cancel-frame": cancelHtml,
        "redirect-frame": redirectHtml,
      },
      bundle
    );

    expect(emitted).toHaveLength(3);

    const byName = Object.fromEntries(
      emitted.map((file) => [file.fileName, file.source as string])
    );

    expect(byName["dispatch-frame.html"]).toContain('var d = "dispatch";');
    expect(byName["cancel-frame.html"]).toContain('var c = "cancel";');
    expect(byName["redirect-frame.html"]).toContain('var r = "redirect";');

    // Each entry's chunk consumed.
    expect(bundle["dispatch.js"]).toBeUndefined();
    expect(bundle["cancel.js"]).toBeUndefined();
    expect(bundle["redirect.js"]).toBeUndefined();
  });
});
