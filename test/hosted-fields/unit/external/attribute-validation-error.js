"use strict";

const BraintreeError = require("../../../../src/lib/braintree-error");
const attributeValidationError = require("../../../../src/hosted-fields/external/attribute-validation-error");

const testCases = {
  stringType: {
    supportedAttributes: ["placeholder"],
    validValues: {
      string: "string",
      number: 123,
      "string with spaces": "string with spaces",
      "string with dashes": "string-with-dashes",
      "string with underscores": "string_with_underscores",
      "string with slashes": "string/with/slashes",
      "string with numbers": "1111 1111 1111 1111",
      "string with special characters": "•!@#$%*",
    },
    invalidValues: {
      "boolean true": true,
      "boolean false": false,
    },
  },
  booleanType: {
    supportedAttributes: ["aria-invalid", "aria-required", "disabled"],
    validValues: {
      "boolean true": true,
      "boolean false": false,
      'string "true"': "true",
      'string "false"': "false",
    },
    invalidValues: {
      number: 42,
      string: "not a boolean",
    },
  },
  shared: {
    invalidValues: {
      object: { foo: "bar" },
      function: () => {
        throw new Error("this is evil");
      },
      array: [1, 2, 3],
    },
  },
};

describe("attributeValidationError", () => {
  it("returns an error for attributes not in allowed list", (done) => {
    let err;

    err = attributeValidationError("garbage", true);

    expect(err).toBeInstanceOf(BraintreeError);
    expect(err.type).toBe("MERCHANT");
    expect(err.code).toBe("HOSTED_FIELDS_ATTRIBUTE_NOT_SUPPORTED");
    expect(err.message).toBe(
      'The "garbage" attribute is not supported in Hosted Fields.'
    );
    expect(err.details).not.toBeDefined();

    done();
  });

  describe.each([["string"], ["boolean"]])("%s attributes", (type) => {
    describe.each(testCases[`${type}Type`].supportedAttributes)(
      `${type} attributes: %s`,
      (attribute) => {
        const invalidValues = Object.entries(
          testCases[`${type}Type`].invalidValues
        ).concat(Object.entries(testCases.shared.invalidValues));

        it.each(Object.entries(testCases[`${type}Type`].validValues))(
          "does not return an error for %s",
          (valueDescription, value) => {
            expect(
              attributeValidationError(attribute, value)
            ).not.toBeDefined();
          }
        );

        it.each(invalidValues)(
          "returns an error for %s",
          (valueDescription, value) => {
            const err = attributeValidationError(attribute, value);

            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe("MERCHANT");
            expect(err.code).toBe("HOSTED_FIELDS_ATTRIBUTE_VALUE_NOT_ALLOWED");
            expect(err.message).toBe(
              `Value "${value}" is not allowed for "${attribute}" attribute.`
            );
            expect(err.details).not.toBeDefined();
          }
        );
      }
    );
  });
});
