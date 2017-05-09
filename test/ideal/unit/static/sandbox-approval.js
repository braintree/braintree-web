'use strict';
/* eslint-disable camelcase */

var sandboxApprovalFrame = require('../../../../src/ideal/static/sandbox-approval');
var querystring = require('../../../../src/lib/querystring');

var PARAMS = ['amount', 'currency', 'final_status', 'redirect_url'];

describe('sandbox approval frame', function () {
  beforeEach(function () {
    PARAMS.forEach(function (param) {
      var node = document.createElement('div');

      node.id = param;
      document.body.appendChild(node);
    });
  });

  afterEach(function () {
    PARAMS.forEach(function (param) {
      var node = document.getElementById(param);

      node.parentNode.removeChild(node);
    });
  });

  PARAMS.forEach(function (param) {
    it('requires ' + param + ' query param', function (done) {
      var params = {
        amount: '10.00',
        currency: 'EUR',
        final_status: 'COMPLETE',
        redirect_url: 'https://braintreepayments.com'
      };

      delete params[param];

      this.sandbox.stub(querystring, 'parse').returns(params);

      try {
        sandboxApprovalFrame.start();
      } catch (err) {
        expect(err.message).to.equal(param + ' param must be a string');

        done();
      }
    });

    it('requires ' + param + ' query param to be a string', function (done) {
      var params = {
        amount: '10.00',
        currency: 'EUR',
        final_status: 'COMPLETE',
        redirect_url: 'https://braintreepayments.com'
      };

      params[param] = 100;

      this.sandbox.stub(querystring, 'parse').returns(params);

      try {
        sandboxApprovalFrame.start();
      } catch (err) {
        expect(err.message).to.equal(param + ' param must be a string');

        done();
      }
    });
  });

  it('requires redirect url to be a white listed url', function (done) {
    var params = {
      amount: '10.00',
      currency: 'EUR',
      final_status: 'COMPLETE',
      redirect_url: 'https://foo.com'
    };

    this.sandbox.stub(querystring, 'parse').returns(params);

    try {
      sandboxApprovalFrame.start();
    } catch (err) {
      expect(err.message).to.equal('https://foo.com is not a valid whitelisted url');

      done();
    }
  });

  it('it does not error with all proper params', function () {
    var error;
    var params = {
      amount: '10.00',
      currency: 'EUR',
      final_status: 'COMPLETE',
      redirect_url: 'https://braintreepayments.com'
    };

    this.sandbox.stub(querystring, 'parse').returns(params);

    try {
      sandboxApprovalFrame.start();
    } catch (err) {
      error = err;
    }

    expect(error).to.not.exist;
  });

  it('populates page with data from query params', function () {
    var amount, currency, finalStatus, redirectUrl;
    var params = {
      amount: '10.00',
      currency: 'EUR',
      final_status: 'COMPLETE',
      redirect_url: 'https://braintreepayments.com'
    };

    this.sandbox.stub(querystring, 'parse').returns(params);

    sandboxApprovalFrame.start();

    amount = document.querySelector('#amount');
    currency = document.querySelector('#currency');
    finalStatus = document.querySelector('#final_status');
    redirectUrl = document.querySelector('#redirect_url');

    expect(amount.textContent).to.equal('10.00');
    expect(currency.textContent).to.equal('EUR');
    expect(finalStatus.textContent).to.equal('COMPLETE');
    expect(redirectUrl.href).to.equal('https://braintreepayments.com');
  });
});
