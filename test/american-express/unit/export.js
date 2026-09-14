import americanExpress from "../../../src/american-express";
import { version as packageVersion } from "../../../package.json";

describe("export", () => {
  it("contains create", () => {
    expect(americanExpress.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(americanExpress.VERSION).toBe(packageVersion);
  });
});
