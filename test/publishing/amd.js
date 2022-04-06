"use strict";

jest.mock("vm");

const { readFileSync, writeSync } = require("fs");
const { resolve } = require("path");
const { optimize } = require("requirejs");
const { fileSync, tmpNameSync } = require("tmp");
const { version } = require("../../package.json");
const { files } = require("../helpers/components");

const MINIMUM_SIZE = 100;

describe("AMD exports", () => {
  it.each(files)(
    `builds a file that requires %s and has at least ${MINIMUM_SIZE} characters`,
    (file, done) => {
      const inputFile = fileSync({ postfix: ".js" });
      const outputFileName = tmpNameSync({ postfix: ".js" });
      const config = {
        baseUrl: resolve(
          __dirname,
          "..",
          "..",
          "dist",
          "hosted",
          "web",
          version,
          "js"
        ),
        name: inputFile.name,
        out: outputFileName,
      };

      writeSync(inputFile.fd, `requirejs(["${file}"], function () {})`);

      optimize(
        config,
        () => {
          const contents = readFileSync(config.out, "utf8");

          expect(contents.length).toBeGreaterThan(MINIMUM_SIZE);

          done();
        },
        done
      );
    }
  );
});
