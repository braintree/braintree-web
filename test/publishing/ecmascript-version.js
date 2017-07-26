/* globals __dirname */

'use strict';

var path = require('path');
var files = require('../helpers/components').files;
var checkFile = require('check-ecmascript-version-compatibility');
var version = require('../../package.json').version;

describe('ECMAScript version', function () {
  files.forEach(function (file) {
    it(file + ' only uses ES5 for browser compatibility', function (done) {
      var jsPath = path.resolve(__dirname, '..', '..', 'dist', 'hosted', 'web', version, 'js', file + '.js');

      this.slow(12000);
      this.timeout(15000);

      checkFile(jsPath, done);
    });
  });
});
