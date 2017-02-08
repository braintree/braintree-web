'use strict';

var expect = require('chai').expect;
var VERSION = require('../../package.json').version;
var braintreeNpm = require('../../dist/npm');
var braintreeBower = require('../../dist/bower');
var braintreeDebug = require('../../dist/bower/debug');
var braintreeHosted = require('../../dist/hosted/web/' + VERSION + '/js/index');
var braintreeMin = require('../../dist/hosted/web/' + VERSION + '/js/index.min');
var components = require('../helpers/components')
  .components
  .reduce(function (result, component) {
    result[component] = {
      npm: require('../../dist/npm/' + component),
      bower: require('../../dist/bower/' + component),
      bowerDebug: require('../../dist/bower/' + component + '.debug'),
      hosted: require('../../dist/hosted/web/' + VERSION + '/js/' + component),
      hostedMin: require('../../dist/hosted/web/' + VERSION + '/js/' + component + '.min')
    };

    return result;
  }, {});

describe('braintree module', function () {
  it('exports VERSION', function () {
    expect(braintreeNpm.VERSION).to.equal(VERSION);
    expect(braintreeBower.VERSION).to.equal(VERSION);
    expect(braintreeDebug.VERSION).to.equal(VERSION);
    expect(braintreeHosted.VERSION).to.equal(VERSION);
    expect(braintreeMin.VERSION).to.equal(VERSION);
  });

  it('exports components', function () {
    var keys = Object.keys(components).map(function (key) {
      return key.replace(/-./g, function (str) {
        return str[1].toUpperCase();
      });
    });

    expect(braintreeNpm).to.include.keys(keys);
    expect(braintreeBower).to.include.keys(keys);
    expect(braintreeDebug).to.include.keys(keys);
    expect(braintreeHosted).to.include.keys(keys);
    expect(braintreeMin).to.include.keys(keys);
  });
});

describe('component modules', function () {
  it('export VERSION', function () {
    var key;

    for (key in components) {
      if (!components.hasOwnProperty(key)) { continue; }
      expect(components[key].npm.VERSION).to.equal(VERSION);
      expect(components[key].bower.VERSION).to.equal(VERSION);
      expect(components[key].bowerDebug.VERSION).to.equal(VERSION);
      expect(components[key].hosted.VERSION).to.equal(VERSION);
      expect(components[key].hostedMin.VERSION).to.equal(VERSION);
    }
  });

  it('export create', function () {
    var key;

    for (key in components) {
      if (!components.hasOwnProperty(key)) { continue; }
      expect(components[key].npm.create).to.be.a('function');
      expect(components[key].bower.create).to.be.a('function');
      expect(components[key].bowerDebug.create).to.be.a('function');
      expect(components[key].hosted.create).to.be.a('function');
      expect(components[key].hostedMin.create).to.be.a('function');
    }
  });
});
