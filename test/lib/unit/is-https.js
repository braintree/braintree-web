import { isHTTPS } from "../../../src/lib/is-https";

describe("isHTTPS", () => {
  it("returns true for HTTPS", () => {
    expect(isHTTPS("https:")).toBe(true);
  });

  it("returns false for non-HTTPS", () => {
    expect(isHTTPS("http:")).toBe(false);
    expect(isHTTPS("ftp:")).toBe(false);
  });
});
