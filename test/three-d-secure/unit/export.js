import threeDSecure from "../../../src/three-d-secure";
import { version as packageVersion } from "../../../package.json";

describe("export", () => {
  it("contains create", () => {
    expect(threeDSecure.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(threeDSecure.VERSION).toBe(packageVersion);
  });
});
