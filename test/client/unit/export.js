import client from "../../../src/client";
import { version as packageVersion } from "../../../package.json";

describe("export", () => {
  it("contains create", () => {
    expect(client.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(client.VERSION).toBe(packageVersion);
  });
});
