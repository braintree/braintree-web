import crypto from "node:crypto";
import cspHashPlugin from "../csp-hash-plugin.ts";
import type { HtmlAsset } from "../shared.ts";

type Bundle = Record<string, HtmlAsset>;

function htmlAsset(source: string): HtmlAsset {
  return { type: "asset", source };
}

function sha256(body: string): string {
  return (
    "sha256-" +
    crypto.createHash("sha256").update(body, "utf8").digest("base64")
  );
}

function extractCspContent(html: string): string | null {
  return (
    html.match(
      /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/
    )?.[1] ?? null
  );
}

function runPlugin(bundle: Bundle): void {
  const plugin = cspHashPlugin();

  plugin.generateBundle.call({}, {}, bundle);
}

describe("cspHashPlugin", () => {
  it("injects exactly one sha256 hash per inline <script>", () => {
    const scriptA = "var a = 1;";
    const scriptB = "var b = 2;";
    const bundle: Bundle = {
      "foo.html": htmlAsset(
        `<html><head></head><body><script>${scriptA}</script><script>${scriptB}</script></body></html>`
      ),
    };

    runPlugin(bundle);

    const csp = extractCspContent(bundle["foo.html"].source as string);

    expect(csp).toBe(`script-src '${sha256(scriptA)}' '${sha256(scriptB)}'`);
  });

  it("inserts the meta tag immediately before </head>", () => {
    const bundle: Bundle = {
      "foo.html": htmlAsset(
        '<html><head><meta charset="UTF-8" /></head><body><script>x</script></body></html>'
      ),
    };

    runPlugin(bundle);

    const output = bundle["foo.html"].source as string;

    expect(output).toMatch(
      /<meta charset="UTF-8"\s*\/?><meta http-equiv="Content-Security-Policy"[^>]*><\/head>/
    );
  });

  it("processes both .html and .min.html assets (since .min.html ends with .html)", () => {
    const bundle: Bundle = {
      "foo.html": htmlAsset(
        "<html><head></head><body><script>pretty</script></body></html>"
      ),
      "foo.min.html": htmlAsset(
        "<html><head></head><body><script>min</script></body></html>"
      ),
    };

    runPlugin(bundle);

    expect(extractCspContent(bundle["foo.html"].source as string)).toContain(
      sha256("pretty")
    );
    expect(
      extractCspContent(bundle["foo.min.html"].source as string)
    ).toContain(sha256("min"));
  });

  it("leaves assets with zero inline scripts untouched", () => {
    const original =
      '<html><head></head><body><script src="ext.js"></script></body></html>';
    const bundle: Bundle = { "foo.html": htmlAsset(original) };

    runPlugin(bundle);

    expect(bundle["foo.html"].source).toBe(original);
  });

  it("skips non-asset entries and non-html assets", () => {
    const bundle = {
      "foo.js": { type: "chunk", code: "var x;" },
      "foo.css": htmlAsset("body{}"),
      "foo.html": htmlAsset(
        "<html><head></head><body><script>z</script></body></html>"
      ),
    } as unknown as Bundle;

    runPlugin(bundle);

    expect(extractCspContent(bundle["foo.html"].source as string)).toContain(
      sha256("z")
    );
    expect((bundle["foo.css"] as HtmlAsset).source).toBe("body{}");
  });

  it("ignores IE conditional comments when computing hashes", () => {
    const bundle: Bundle = {
      "foo.html": htmlAsset(
        "<html><head></head><body><!--[if IE]><script>ignored</script><![endif]--><script>kept</script></body></html>"
      ),
    };

    runPlugin(bundle);

    const csp = extractCspContent(bundle["foo.html"].source as string)!;

    expect(csp).toBe(`script-src '${sha256("kept")}'`);
    expect(csp).not.toContain(sha256("ignored"));
  });

  it("skips assets that already have a Content-Security-Policy meta tag", () => {
    const preexistingCsp = `<meta http-equiv="Content-Security-Policy" content="script-src 'self'">`;
    const bundle: Bundle = {
      "foo.html": htmlAsset(
        `<html><head>${preexistingCsp}</head><body><script>kept</script></body></html>`
      ),
    };

    runPlugin(bundle);

    const source = bundle["foo.html"].source as string;
    const metaCount = (
      source.match(/http-equiv="Content-Security-Policy"/g) || []
    ).length;

    expect(metaCount).toBe(1);
    expect(source).toContain("script-src 'self'");
    expect(source).not.toContain(sha256("kept"));
  });
});
