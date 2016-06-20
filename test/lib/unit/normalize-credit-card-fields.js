'use strict';

var normalizeCreditCardFields = require('../../../src/lib/normalize-credit-card-fields').normalizeCreditCardFields;

describe('normalizeCreditCardFields', function () {
  it('should accept already nested billing address fields', function () {
    var countryName = 'US';
    var streetAddress = '123 Townsend Street';
    var postalCode = '94107';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      billingAddress: {
        countryName: countryName,
        postalCode: postalCode,
        streetAddress: streetAddress
      }
    });

    expect(creditCard.billingAddress.countryName).to.equal(countryName);
    expect(creditCard.billingAddress.streetAddress).to.equal(streetAddress);
    expect(creditCard.billingAddress.postalCode).to.equal(postalCode);
  });

  it('should move country name beneath billing address', function () {
    var countryName = 'US';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      countryName: countryName
    });

    expect(creditCard.billingAddress.countryName).to.equal(countryName);
  });

  it('should move street address beneath billing address', function () {
    var streetAddress = '123 Townsend Street';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      streetAddress: streetAddress
    });

    expect(creditCard.billingAddress.streetAddress).to.equal(streetAddress);
  });

  it('should move postal code beneath billing address', function () {
    var postalCode = '94107';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      postalCode: postalCode
    });

    expect(creditCard.billingAddress.postalCode).to.equal(postalCode);
  });

  it('should move country code numeric beneath billing address', function () {
    var countryCodeNumeric = '840';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      countryCodeNumeric: countryCodeNumeric
    });

    expect(creditCard.billingAddress.countryCodeNumeric).to.equal(countryCodeNumeric);
  });

  it('should move country code alpha2 beneath billing address', function () {
    var countryCodeAlpha2 = 'US';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      countryCodeAlpha2: countryCodeAlpha2
    });

    expect(creditCard.billingAddress.countryCodeAlpha2).to.equal(countryCodeAlpha2);
  });

  it('should move country code alpha3 beneath billing address', function () {
    var countryCodeAlpha3 = 'USA';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      countryCodeAlpha3: countryCodeAlpha3
    });

    expect(creditCard.billingAddress.countryCodeAlpha3).to.equal(countryCodeAlpha3);
  });

  it('should move country code alpha2 beneath billing address when the name has underscores', function () {
    var countryCodeAlpha2 = 'US';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      country_code_alpha2: countryCodeAlpha2 // eslint-disable-line camelcase
    });

    expect(creditCard.billingAddress.country_code_alpha2).to.equal(countryCodeAlpha2);
  });

  it('should move country code alpha3 beneath billing address when the name has underscores', function () {
    var countryCodeAlpha3 = 'US';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      country_code_alpha3: countryCodeAlpha3 // eslint-disable-line camelcase
    });

    expect(creditCard.billingAddress.country_code_alpha3).to.equal(countryCodeAlpha3);
  });

  it('should move locality beneath billing address', function () {
    var value = 'locality';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      locality: value
    });

    expect(creditCard.billingAddress.locality).to.equal(value);
  });

  it('should move extended address beneath billing address', function () {
    var value = 'Floor 6';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      extendedAddress: value
    });

    expect(creditCard.billingAddress.extendedAddress).to.equal(value);
  });

  it('should move last name beneath billing address', function () {
    var value = 'Doe';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      lastName: value
    });

    expect(creditCard.billingAddress.lastName).to.equal(value);
  });

  it('should move first name beneath billing address', function () {
    var value = 'John';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      firstName: value
    });

    expect(creditCard.billingAddress.firstName).to.equal(value);
  });

  it('should move region beneath billing address', function () {
    var value = 'USA';

    var creditCard = normalizeCreditCardFields({
      number: '4111111111111111',
      expirationDate: '12/20',
      region: value
    });

    expect(creditCard.billingAddress.region).to.equal(value);
  });
});
