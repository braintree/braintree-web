"use strict";

const { promises: fs } = require("fs");
const { extname, resolve } = require("path");
const componentsJson = require("../../components.json");

describe("components", () => {
  it("includes all the folders in src/ (except lib/ & coverage/)", () => {
    const srcPath = resolve(__dirname, "..", "..", "src");
    const components = componentsJson.concat().sort();

    return fs.readdir(srcPath).then((files) => {
      const folders = files
        .filter(
          (file) => !extname(file) && file !== "lib" && file !== "coverage"
        )
        .sort();

      expect(folders).toEqual(components);
    });
  });

  it("is alphabetized", () => {
    const sorted = componentsJson.concat().sort();

    expect(componentsJson).toEqual(sorted);
  });
});
