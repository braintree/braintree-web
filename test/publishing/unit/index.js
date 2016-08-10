'use strict';

var braintree = require('../../../dist/published/');
var packageVersion = require('../../../dist/published/package.json').version;
var client = require('../../../dist/published/client');
var dataCollector = require('../../../dist/published/data-collector');
var hostedFields = require('../../../dist/published/hosted-fields');
var paypal = require('../../../dist/published/paypal');
var americanExpress = require('../../../dist/published/american-express');
var unionpay = require('../../../dist/published/unionpay');
var threeDSecure = require('../../../dist/published/three-d-secure');

describe('braintree', function () {
  it('only exports certain properties', function () {
    expect(braintree).to.have.all.keys([
      'VERSION',
      'client',
      'dataCollector',
      'applePay',
      'hostedFields',
      'paypal',
      'americanExpress',
      'unionpay',
      'threeDSecure'
    ]);
  });

  it('exports client', function () {
    expect(braintree.client).to.equal(client);
  });

  it('exports dataCollector', function () {
    expect(braintree.dataCollector).to.equal(dataCollector);
  });

  it('exports hostedFields', function () {
    expect(braintree.hostedFields).to.equal(hostedFields);
  });

  it('exports paypal', function () {
    expect(braintree.paypal).to.equal(paypal);
  });

  it('exports americanExpress', function () {
    expect(braintree.americanExpress).to.equal(americanExpress);
  });

  it('exports unionpay', function () {
    expect(braintree.unionpay).to.equal(unionpay);
  });

  it('exports threeDSecure', function () {
    expect(braintree.threeDSecure).to.equal(threeDSecure);
  });

  it('exports VERSION', function () {
    expect(braintree.VERSION).to.equal(packageVersion);
  });
});
