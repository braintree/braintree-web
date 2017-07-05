'use strict';
/* eslint-disable camelcase */

var sandboxApprovalFrame = require('../../../../src/ideal/static/sandbox-approval');
var querystring = require('../../../../src/lib/querystring');

describe('sandbox approval frame', function () {
  beforeEach(function () {
    var link = document.createElement('a');

    link.id = 'redirect_url';
    document.body.appendChild(link);
  });

  afterEach(function () {
    var link = document.getElementById('redirect_url');

    document.body.removeChild(link);
  });

  it('requires redirect_url query param', function (done) {
    var params = {};

    this.sandbox.stub(querystring, 'parse').returns(params);

    try {
      sandboxApprovalFrame.start();
    } catch (err) {
      expect(err.message).to.equal('redirect_url param must be a string');

      done();
    }
  });

  it('requires redirect_url query param to be a string', function (done) {
    var params = {
      redirect_url: 100
    };

    this.sandbox.stub(querystring, 'parse').returns(params);

    try {
      sandboxApprovalFrame.start();
    } catch (err) {
      expect(err.message).to.equal('redirect_url param must be a string');

      done();
    }
  });

  it('requires redirect url to be a white listed url', function (done) {
    var params = {
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

  it('does not error with redirect_url param', function () {
    var error;
    var params = {
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
    var redirectUrl;
    var params = {
      redirect_url: 'https://braintreepayments.com'
    };

    this.sandbox.stub(querystring, 'parse').returns(params);

    sandboxApprovalFrame.start();

    redirectUrl = document.querySelector('#redirect_url');

    expect(redirectUrl.href).to.equal('https://braintreepayments.com/');
  });
});
