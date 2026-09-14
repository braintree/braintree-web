import _e0 from "../../../src/vault-manager";

const { VERSION, create } = _e0;

import { version as packageVersion } from "../../../package.json";

describe("export", () => {
  it("contains create", () => {
    expect(create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(VERSION).toBe(packageVersion);
  });
});
