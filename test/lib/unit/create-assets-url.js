'use strict';

var create = require('../../../src/lib/create-assets-url').create;
var fake = require('../../helpers/fake');

describe('createAssetsUrl', function () {
  it('defaults to production asset url if no authorization is passed', function () {
    expect(create()).to.equal('https://assets.braintreegateway.com');
  });

  it('creates an assets url from a sandbox client token', function () {
    var url, ct;
    var decodedClientToken = JSON.parse(atob(fake.clientToken));

    decodedClientToken.environment = 'sandbox';

    ct = btoa(JSON.stringify(decodedClientToken));

    url = create(ct);

    expect(url).to.equal('https://assets.braintreegateway.com');
  });

  it('creates an assets url from a production client token', function () {
    var url, ct;
    var decodedClientToken = JSON.parse(atob(fake.clientToken));

    decodedClientToken.environment = 'production';

    ct = btoa(JSON.stringify(decodedClientToken));

    url = create(ct);

    expect(url).to.equal('https://assets.braintreegateway.com');
  });

  it('creates an assets url for production when client token does not include environment', function () {
    var url = create(fake.clientTokenWithoutEnvironment);

    expect(url).to.equal('https://assets.braintreegateway.com');
  });

  it('creates an assets url from a sandbox tokenization key', function () {
    var url = create('sandbox_testing_merchant');

    expect(url).to.equal('https://assets.braintreegateway.com');
  });

  it('creates an assets url from a production tokenization key', function () {
    var url = create('production_testing_merchant');

    expect(url).to.equal('https://assets.braintreegateway.com');
  });
});
