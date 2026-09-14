import _e9 from "../../../src/venmo";

const { VERSION, create } = _e9;

import { version as packageVersion } from "../../../package.json";

describe("export", () => {
  it("contains create", () => {
    expect(create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(VERSION).toBe(packageVersion);
  });
});
