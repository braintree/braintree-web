import dataCollector from "../../../src/data-collector";
import { version } from "../../../package.json";

describe("export", () => {
  it("contains create", () => {
    expect(dataCollector.create).toBeInstanceOf(Function);
  });

  it("sets the version", () => {
    expect(dataCollector.VERSION).toBe(version);
  });
});
