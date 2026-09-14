import emitMinHtmlPlugin from "../emit-min-html-plugin.ts";
import type { EmittedFile, HtmlAsset } from "../shared.ts";

type Bundle = Record<string, HtmlAsset>;

function htmlAsset(source: string): HtmlAsset {
  return { type: "asset", source };
}

async function runPlugin(bundle: Bundle): Promise<EmittedFile[]> {
  const emitted: EmittedFile[] = [];
  const plugin = emitMinHtmlPlugin();
  const context = {
    emitFile(file: EmittedFile) {
      emitted.push(file);
    },
  };

  await plugin.generateBundle.call(context, {}, bundle);

  return emitted;
}

describe("emitMinHtmlPlugin", () => {
  const ORIGINAL_COVERAGE = process.env.BRAINTREE_JS_COVERAGE_BUILD;

  afterEach(() => {
    if (ORIGINAL_COVERAGE === undefined) {
      delete process.env.BRAINTREE_JS_COVERAGE_BUILD;
    } else {
      process.env.BRAINTREE_JS_COVERAGE_BUILD = ORIGINAL_COVERAGE;
    }
  });

  it("emits a .min.html companion for each .html asset", async () => {
    const bundle: Bundle = {
      "foo.html": htmlAsset(
        "<html>\n  <head></head>\n  <body>\n    <p>hi</p>\n  </body>\n</html>"
      ),
    };

    const emitted = await runPlugin(bundle);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      type: "asset",
      fileName: "foo.min.html",
    });
  });

  it("produces a smaller .min.html than the source .html", async () => {
    const source =
      "<html>\n  <head></head>\n  <body>\n    <p>hi</p>\n    <p>bye</p>\n  </body>\n</html>";
    const bundle: Bundle = { "foo.html": htmlAsset(source) };

    const emitted = await runPlugin(bundle);

    expect(emitted[0].source.length).toBeLessThan(source.length);
  });

  it("does not recurse, skips assets already named .min.html", async () => {
    const bundle: Bundle = {
      "foo.min.html": htmlAsset(
        "<html><head></head><body><p>already min</p></body></html>"
      ),
    };

    const emitted = await runPlugin(bundle);

    expect(emitted).toHaveLength(0);
  });

  it("ignores non-html assets and non-asset entries", async () => {
    const bundle = {
      "foo.css": htmlAsset("body { color: red; }"),
      "foo.js": { type: "chunk", code: "var x;" },
    } as unknown as Bundle;

    const emitted = await runPlugin(bundle);

    expect(emitted).toHaveLength(0);
  });

  it("minifies inline JS by default", async () => {
    const inline = "function   foo (  )  {  return   1  ;  }";
    const bundle: Bundle = {
      "f.html": htmlAsset(
        `<html><head></head><body><script>${inline}</script></body></html>`
      ),
    };

    const emitted = await runPlugin(bundle);

    expect(emitted[0].source).not.toContain(inline);
    expect(emitted[0].source).toContain("function foo");
  });

  it("preserves inline JS verbatim when BRAINTREE_JS_COVERAGE_BUILD=true", async () => {
    process.env.BRAINTREE_JS_COVERAGE_BUILD = "true";

    const inline = "function   foo (  )  {  return   1  ;  }";
    const bundle: Bundle = {
      "f.html": htmlAsset(
        `<html><head></head><body><script>${inline}</script></body></html>`
      ),
    };

    const emitted = await runPlugin(bundle);

    expect(emitted[0].source).toContain(inline);
  });
});
