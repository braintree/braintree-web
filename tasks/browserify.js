'use strict';

var exec = require('child_process').exec;
var path = require('path');

function forkBrowserify(options, done) {
  var buildCmd;
  var PATH = path.resolve('./node_modules/.bin') + ':' + process.env.PATH;
  var standalone = options.standalone == null ? '' : `--standalone "${options.standalone}"`;
  var unminifiedFile = options.dist + '/' + options.out;
  var minifiedFile = options.dist + '/' + options.out.replace(/\.js$/, '.min.js');
  var prependFiles = '';
  var appendFiles = '';
  var flags = options.flags || '';
  var transforms = (options.transforms && options.transforms.length) ? `-t ${options.transforms.join(' -t ')}` : '';
  var execOptions = {
    env: Object.assign({}, process.env, {PATH: PATH}),
    stdio: 'ignore',
    shell: '/bin/bash'
  };

  if (options.prependFiles instanceof Array) {
    prependFiles = `"${options.prependFiles.join('" "')}"`;
  }

  if (options.appendFiles instanceof Array) {
    appendFiles = `"${options.appendFiles.join('" "')}"`;
  }

  buildCmd = [
    `browserify -p browserify-derequire ${flags} ${standalone} ${transforms} "${options.main}"`,
    `cat ${prependFiles} - ${appendFiles}`,
    `tee >(sed -e 's/@DOT_MIN//g' > "${unminifiedFile}")`,
    `uglifyjs -m -c`,
    `sed -e 's/@DOT_MIN/.min/g' > "${minifiedFile}"`
  ].join('|');

  function callback(err, stdout, stderr) {
    if (err) {
      if (stdout) { console.log(stdout); }
      if (stderr) { console.error(stderr); }

      done(err);
    } else {
      done();
    }
  }

  exec([
    `mkdir -p ${options.dist}`,
    'set -o pipefail',
    buildCmd
  ].join(';'), execOptions, callback);
}

module.exports = forkBrowserify;
