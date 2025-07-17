"use strict";

var exec = require("child_process").exec;
var path = require("path");

function forkBrowserify(options, done) {
  var buildCmd, buildCmdArray;
  var PATH = path.resolve("./node_modules/.bin") + ":" + process.env.PATH;
  var standalone =
    options.standalone == null ? "" : `--standalone "${options.standalone}"`;
  var unminifiedFile = options.dist + "/" + options.out;
  var minifiedFile =
    options.dist +
    "/" +
    (options.min || options.out.replace(/\.js$/, ".min.js"));
  var prependFiles = "";
  var appendFiles = "";
  var flags = options.flags || "";
  // uglify could be set to false. Otherwise it would be undefined and should default to true.
  var uglify = options.uglify !== false;
  var transforms =
    options.transforms && options.transforms.length
      ? `-t ${options.transforms.join(" -t ")}`
      : "";
  var execOptions = {
    env: Object.assign({}, process.env, { PATH: PATH }),
    stdio: "ignore",
    shell: "/bin/bash",
  };

  if (options.prependFiles instanceof Array) {
    prependFiles = `"${options.prependFiles.join('" "')}"`;
  }

  if (options.appendFiles instanceof Array) {
    appendFiles = `"${options.appendFiles.join('" "')}"`;
  }

  buildCmdArray = [
    `browserify -p browserify-derequire --no-builtins --insert-global-vars global ${flags} ${standalone} ${transforms} "${options.main}"`,
    "|",
    `cat ${prependFiles} - ${appendFiles} > ${unminifiedFile}`,
  ];

  if (uglify) {
    buildCmdArray.push("&&");
    buildCmdArray.push(
      `uglifyjs ${unminifiedFile} -m --compress arrows=false -o "${minifiedFile}"`
    );
  }

  buildCmd = buildCmdArray.join(" ");

  function callback(err, stdout, stderr) {
    if (err) {
      if (stdout) {
        console.log(stdout); // eslint-disable-line no-console
      }
      if (stderr) {
        console.error(stderr); // eslint-disable-line no-console
      }

      done(err);
    } else {
      done();
    }
  }

  exec(
    [`mkdir -p ${options.dist}`, "set -o pipefail", buildCmd].join(";"),
    execOptions,
    callback
  );
}

module.exports = forkBrowserify;
