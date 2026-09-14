import _e2 from "../../../src/google-payment";

const { VERSION, create } = _e2;

import { version } from "../../../package.json";

describe("export", () => {
  it("contains create", () => {
    expect(create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(VERSION).toBe(version);
  });
});
