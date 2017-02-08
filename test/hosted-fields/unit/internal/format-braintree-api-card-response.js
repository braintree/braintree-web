/* eslint-disable camelcase */

'use strict';

var formatBraintreeApiCardResponse = require('../../../../src/hosted-fields/internal/format-braintree-api-card-response');

describe('formatBraintreeApiCardResponse', function () {
  beforeEach(function () {
    this.data = {
      id: 'braintreeApi-token',
      brand: 'visa',
      last_4: '1234'
    };
    this.response = {data: this.data};
  });

  it('formats token', function () {
    expect(formatBraintreeApiCardResponse(this.response).braintreeApiToken).to.equal('braintreeApi-token');
  });

  it('formats Visa card type', function () {
    this.data.brand = 'visa';

    expect(formatBraintreeApiCardResponse(this.response).details.cardType).to.equal('Visa');
  });

  it('formats MasterCard card type', function () {
    this.data.brand = 'mastercard';

    expect(formatBraintreeApiCardResponse(this.response).details.cardType).to.equal('MasterCard');
  });

  it('formats American Express card type', function () {
    this.data.brand = 'american_express';

    expect(formatBraintreeApiCardResponse(this.response).details.cardType).to.equal('American Express');
  });

  it('formats Discover card type', function () {
    this.data.brand = 'discover';

    expect(formatBraintreeApiCardResponse(this.response).details.cardType).to.equal('Discover');
  });

  it('formats JCB card type', function () {
    this.data.brand = 'jcb';

    expect(formatBraintreeApiCardResponse(this.response).details.cardType).to.equal('JCB');
  });

  it('formats Maestro card type', function () {
    this.data.brand = 'maestro';

    expect(formatBraintreeApiCardResponse(this.response).details.cardType).to.equal('Maestro');
  });

  it('formats an unknown card type', function () {
    this.data.brand = 'garbage';

    expect(formatBraintreeApiCardResponse(this.response).details.cardType).to.equal('Unknown');
  });

  it('formats lastTwo', function () {
    expect(formatBraintreeApiCardResponse(this.response).details.lastTwo).to.equal('34');
  });

  it('formats description', function () {
    expect(formatBraintreeApiCardResponse(this.response).description).to.equal('ending in 34');
  });

  it('adds type', function () {
    expect(formatBraintreeApiCardResponse(this.response).type).to.equal('CreditCard');
  });
});
