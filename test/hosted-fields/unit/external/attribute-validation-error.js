'use strict';

var BraintreeError = require('../../../../src/lib/braintree-error');
var attributeValidationError = require('../../../../src/hosted-fields/external/attribute-validation-error');

var testCases = {
  stringType: {
    supportedAttributes: [
      'placeholder'
    ],
    validValues: {
      string: 'string',
      number: 123,
      'string with spaces': 'string with spaces',
      'string with dashes': 'string-with-dashes',
      'string with underscores': 'string_with_underscores',
      'string with slashes': 'string/with/slashes',
      'string with numbers': '1111 1111 1111 1111',
      'string with special characters': '•!@#$%*'
    },
    invalidValues: {
      'boolean true': true,
      'boolean false': false
    }
  },
  booleanType: {
    supportedAttributes: [
      'aria-invalid',
      'aria-required',
      'disabled'
    ],
    validValues: {
      'boolean true': true,
      'boolean false': false,
      'string "true"': 'true',
      'string "false"': 'false'
    },
    invalidValues: {
      number: 42,
      string: 'not a boolean'
    }
  },
  shared: {
    invalidValues: {
      object: {foo: 'bar'},
      'function': function () { throw new Error('this is evil'); },
      array: [1, 2, 3]
    }
  }
};

describe('attributeValidationError', function () {
  it('returns an error for attributes not in allowed list', function (done) {
    var err;

    err = attributeValidationError('garbage', true);

    expect(err).to.be.an.instanceof(BraintreeError);
    expect(err.type).to.equal('MERCHANT');
    expect(err.code).to.equal('HOSTED_FIELDS_ATTRIBUTE_NOT_SUPPORTED');
    expect(err.message).to.equal('The "garbage" attribute is not supported in Hosted Fields.');
    expect(err.details).not.to.exist;

    done();
  });

  describe('string attributes', function () {
    testCases.stringType.supportedAttributes.forEach(function (attribute) {
      describe(attribute, function () {
        Object.keys(testCases.stringType.validValues).forEach(function (valueDescription) {
          it('does not return an error for ' + valueDescription, function (done) {
            var err, value;

            value = testCases.stringType.validValues[valueDescription];
            err = attributeValidationError(attribute, value);

            expect(err).not.to.exist;

            done();
          });
        });

        Object.keys(testCases.stringType.invalidValues).forEach(function (valueDescription) {
          it('returns an error for ' + valueDescription, function (done) {
            var err, value;

            value = testCases.stringType.invalidValues[valueDescription];
            err = attributeValidationError(attribute, value);

            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('MERCHANT');
            expect(err.code).to.equal('HOSTED_FIELDS_ATTRIBUTE_VALUE_NOT_ALLOWED');
            expect(err.message).to.equal('Value "' + value + '" is not allowed for "' + attribute + '" attribute.');
            expect(err.details).not.to.exist;

            done();
          });
        });

        Object.keys(testCases.shared.invalidValues).forEach(function (valueDescription) {
          it('returns an error for ' + valueDescription, function (done) {
            var err, value;

            value = testCases.shared.invalidValues[valueDescription];
            err = attributeValidationError(attribute, value);

            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('MERCHANT');
            expect(err.code).to.equal('HOSTED_FIELDS_ATTRIBUTE_VALUE_NOT_ALLOWED');
            expect(err.message).to.equal('Value "' + value + '" is not allowed for "' + attribute + '" attribute.');
            expect(err.details).not.to.exist;

            done();
          });
        });
      });
    });
  });

  describe('boolean attributes', function () {
    testCases.booleanType.supportedAttributes.forEach(function (attribute) {
      describe(attribute, function () {
        Object.keys(testCases.booleanType.validValues).forEach(function (valueDescription) {
          it('does not return an error for ' + valueDescription, function (done) {
            var err, value;

            value = testCases.booleanType.validValues[valueDescription];
            err = attributeValidationError(attribute, value);

            expect(err).not.to.exist;

            done();
          });
        });

        Object.keys(testCases.booleanType.invalidValues).forEach(function (valueDescription) {
          it('returns an error for ' + valueDescription, function (done) {
            var err, value;

            value = testCases.booleanType.invalidValues[valueDescription];
            err = attributeValidationError(attribute, value);

            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('MERCHANT');
            expect(err.code).to.equal('HOSTED_FIELDS_ATTRIBUTE_VALUE_NOT_ALLOWED');
            expect(err.message).to.equal('Value "' + value + '" is not allowed for "' + attribute + '" attribute.');
            expect(err.details).not.to.exist;

            done();
          });
        });

        Object.keys(testCases.shared.invalidValues).forEach(function (valueDescription) {
          it('returns an error for ' + valueDescription, function (done) {
            var err, value;

            value = testCases.shared.invalidValues[valueDescription];
            err = attributeValidationError(attribute, value);

            expect(err).to.be.an.instanceof(BraintreeError);
            expect(err.type).to.equal('MERCHANT');
            expect(err.code).to.equal('HOSTED_FIELDS_ATTRIBUTE_VALUE_NOT_ALLOWED');
            expect(err.message).to.equal('Value "' + value + '" is not allowed for "' + attribute + '" attribute.');
            expect(err.details).not.to.exist;

            done();
          });
        });
      });
    });
  });
});
