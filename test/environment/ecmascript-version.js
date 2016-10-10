/* globals __dirname */

'use strict';

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var parseEcmascriptVersion = require('ecmascript-version-detector').parse;
var version = require('../../package.json').version;

describe('ECMAScript version', function () {
  [
    'american-express',
    'american-express.min',
    'apple-pay',
    'apple-pay.min',
    'client',
    'client.min',
    'data-collector',
    'data-collector.min',
    'hosted-fields',
    'hosted-fields.min',
    'paypal',
    'paypal.min',
    'three-d-secure',
    'three-d-secure.min',
    'unionpay',
    'unionpay.min'
  ].forEach(function (file) {
    it(file + ' only uses ES5 for browser compatibility', function (done) {
      var jsPath = path.resolve(__dirname, '..', '..', 'dist', 'hosted', 'web', version, 'js', file + '.js');

      this.slow(8000);
      this.timeout(8000);

      fs.readFile(jsPath, 'utf8', function (err, data) {
        if (err) {
          done(err);
          return;
        }

        parseEcmascriptVersion(data).forEach(function (expression) {
          var expressionVersion;

          if (expression.selector === "//Program[@sourceType=='module']") { return; }

          expressionVersion = parseInt(expression.version, 10);

          assert.isAtMost(expressionVersion, 5, expression.en.name + 'is ES' + expressionVersion + ' but we can only use ES5');
        });

        done();
      });
    });
  });
});
