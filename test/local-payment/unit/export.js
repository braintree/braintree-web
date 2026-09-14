import _e3 from "../../../src/local-payment";

const { VERSION, create } = _e3;

import { version as packageVersion } from "../../../package.json";

describe("export", () => {
  it("contains create", () => {
    expect(create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(VERSION).toBe(packageVersion);
  });
});
