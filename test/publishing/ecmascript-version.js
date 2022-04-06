"use strict";

const { resolve } = require("path");
const { files } = require("../helpers/components");
const checkFile = require("check-ecmascript-version-compatibility");
const { version } = require("../../package.json");

describe("ECMAScript version", () => {
  jest.setTimeout(6000);

  it.each(files)("%s only uses ES5 for browser compatibility", (file, done) => {
    const jsPath = resolve(
      __dirname,
      "..",
      "..",
      "dist",
      "hosted",
      "web",
      version,
      "js",
      `${file}.js`
    );

    checkFile(jsPath, done);
  });
});
