import hostedFields from "../../../src/hosted-fields";
import { version as packageVersion } from "../../../package.json";

describe("export", () => {
  it("contains create", () => {
    expect(hostedFields.create).toEqual(expect.any(Function));
  });

  it("sets the version", () => {
    expect(hostedFields.VERSION).toBe(packageVersion);
  });
});
