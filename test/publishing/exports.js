'use strict';

var VERSION = require('../../dist/published/package.json').version;
var braintree = require('../../dist/published');
var braintreeDebug = require('../../dist/published/debug');
var expect = require('chai').expect;
var components = {
  client: {
    index: require('../../dist/published/client'),
    debug: require('../../dist/published/client.debug')
  },
  dataCollector: {
    index: require('../../dist/published/data-collector'),
    debug: require('../../dist/published/data-collector.debug')
  },
  applePay: {
    index: require('../../dist/published/apple-pay'),
    debug: require('../../dist/published/apple-pay.debug')
  },
  hostedFields: {
    index: require('../../dist/published/hosted-fields'),
    debug: require('../../dist/published/hosted-fields.debug')
  },
  paypal: {
    index: require('../../dist/published/paypal'),
    debug: require('../../dist/published/paypal.debug')
  },
  americanExpress: {
    index: require('../../dist/published/american-express'),
    debug: require('../../dist/published/american-express.debug')
  },
  unionpay: {
    index: require('../../dist/published/unionpay'),
    debug: require('../../dist/published/unionpay.debug')
  },
  usBankAccount: {
    index: require('../../dist/published/us-bank-account'),
    debug: require('../../dist/published/us-bank-account.debug')
  },
  threeDSecure: {
    index: require('../../dist/published/three-d-secure'),
    debug: require('../../dist/published/three-d-secure.debug')
  }
};

describe('braintree module', function () {
  it('exports VERSION', function () {
    expect(braintree.VERSION).to.equal(VERSION);
    expect(braintreeDebug.VERSION).to.equal(VERSION);
  });

  it('exports components', function () {
    expect(braintree).to.include.keys(Object.keys(components));
    expect(braintreeDebug).to.include.keys(Object.keys(components));
  });
});

describe('component modules', function () {
  it('export VERSION', function () {
    var key;

    for (key in components) {
      if (!components.hasOwnProperty(key)) { continue; }
      expect(components[key].index.VERSION).to.equal(VERSION);
      expect(components[key].debug.VERSION).to.equal(VERSION);
    }
  });

  it('export create', function () {
    var key;

    for (key in components) {
      if (!components.hasOwnProperty(key)) { continue; }
      expect(components[key].index.create).to.be.a('function');
      expect(components[key].debug.create).to.be.a('function');
    }
  });
});
