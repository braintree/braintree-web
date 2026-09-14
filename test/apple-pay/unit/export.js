import applePay from "../../../src/apple-pay";
import { version as packageVersion } from "../../../package.json";

describe("export", () => {
  it("contains create", () => {
    expect(applePay.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(applePay.VERSION).toBe(packageVersion);
  });
});
