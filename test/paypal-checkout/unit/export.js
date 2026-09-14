import _e11 from "../../../src/paypal-checkout";

const { VERSION, create } = _e11;

import { version as packageVersion } from "../../../package.json";

describe("export", () => {
  it("contains create", () => {
    expect(create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(VERSION).toBe(packageVersion);
  });
});
