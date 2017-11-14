/* globals __dirname */

'use strict';

var fs = require('fs');
var path = require('path');
var componentsJson = require('../../components.json');
var expect = require('chai').expect;

describe('components', function () {
  it('includes all of the folders in src/ (except lib/)', function (done) {
    var srcPath = path.resolve(__dirname, '..', '..', 'src');
    var components = componentsJson.concat().sort();

    fs.readdir(srcPath, function (err, files) {
      var folders;

      if (err) {
        done(err);

        return;
      }

      folders = files.filter(function (file) {
        return !path.extname(file) && file !== 'lib';
      }).sort();

      expect(folders).to.deep.equal(components);

      done();
    });
  });

  it('is alphabetized', function () {
    var sorted = componentsJson.concat().sort();

    expect(componentsJson).to.deep.equal(sorted);
  });
});
