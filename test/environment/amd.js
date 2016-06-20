/* globals __dirname */

'use strict';

var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');
var requirejs = require('requirejs');
var tmp = require('tmp');
var version = require('../../package.json').version;

var MINIMUM_SIZE = 100;

describe('AMD exports', function () {
  [
    'client',
    'client.min',
    'data-collector',
    'data-collector.min',
    'hosted-fields',
    'hosted-fields.min',
    'paypal',
    'paypal.min',
    'american-express',
    'american-express.min'
  ].forEach(function (file) {
    it('builds a file that requires ' + file + ' that has at least ' + MINIMUM_SIZE + ' characters', function (done) {
      var inputFile = tmp.fileSync({postfix: '.js'});
      var outputFileName = tmp.tmpNameSync({postfix: '.js'});
      var config = {
        baseUrl: path.resolve(__dirname, '..', '..', 'dist', 'hosted', 'web', version, 'js'),
        name: inputFile.name,
        out: outputFileName
      };

      this.slow(3000);

      fs.writeSync(inputFile.fd, 'requirejs(["' + file + '"], function () {})');

      requirejs.optimize(config, function () {
        var contents = fs.readFileSync(config.out, 'utf8');

        expect(contents.length).to.be.above(MINIMUM_SIZE);

        done();
      }, done);
    });
  });
});
