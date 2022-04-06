"use strict";

var gulp = require("gulp");
var browserify = require("./browserify");
var VERSION = require("../package.json").version;

gulp.task("build:vault-manager", function (done) {
  browserify(
    {
      standalone: "braintree.vaultManager",
      main: "src/vault-manager/index.js",
      out: "vault-manager.js",
      dist: "dist/hosted/web/" + VERSION + "/js",
    },
    done
  );
});
