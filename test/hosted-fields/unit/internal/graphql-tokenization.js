import graphqlTokenization from "../../../../src/hosted-fields/internal/graphql-tokenization";
import BraintreeError from "../../../../src/lib/braintree-error";

describe("graphql-tokenization", () => {
  describe("buildTokenizeCreditCardRequest", () => {
    it("builds the standard TokenizeCreditCard mutation and variables", () => {
      const request = graphqlTokenization.buildTokenizeCreditCardRequest({
        creditCard: {
          number: "4111111111111111",
          cvv: "123",
          cardholderName: "Bob Smith",
          expiration_month: "12",
          expiration_year: "2025",
          options: { validate: true },
        },
      });

      expect(request.isFastlane).toBe(false);
      expect(request.query).toContain("mutation TokenizeCreditCard(");
      expect(request.query).not.toContain("authenticationInsightInput");
      expect(request.variables).toEqual({
        input: {
          creditCard: {
            number: "4111111111111111",
            expirationMonth: "12",
            expirationYear: "2025",
            cvv: "123",
            cardholderName: "Bob Smith",
          },
          options: {
            validate: true,
          },
        },
      });
    });

    it("includes billingAddress only when present, mapping snake_case fields to camelCase", () => {
      const request = graphqlTokenization.buildTokenizeCreditCardRequest({
        creditCard: {
          number: "4111111111111111",
          options: { validate: false },
          billing_address: {
            first_name: "Bob",
            last_name: "Smith",
            company: "Acme",
            postal_code: "11111",
            street_address: "123 Main St",
            extended_address: "Apt 1",
            locality: "Chicago",
            region: "IL",
            country_name: "United States",
            country_code_alpha2: "US",
            country_code_alpha3: "USA",
            country_code_numeric: "840",
          },
        },
      });

      expect(request.variables.input.creditCard.billingAddress).toEqual({
        firstName: "Bob",
        lastName: "Smith",
        company: "Acme",
        postalCode: "11111",
        streetAddress: "123 Main St",
        extendedAddress: "Apt 1",
        locality: "Chicago",
        region: "IL",
        countryName: "United States",
        countryCodeAlpha2: "US",
        countryCodeAlpha3: "USA",
        countryCodeNumeric: "840",
      });
    });

    it("omits billingAddress when not provided", () => {
      const request = graphqlTokenization.buildTokenizeCreditCardRequest({
        creditCard: {
          number: "4111111111111111",
          options: { validate: false },
        },
      });

      expect(request.variables.input.creditCard.billingAddress).toBeUndefined();
    });

    it("omits billingAddress when it is present but empty after filtering", () => {
      const request = graphqlTokenization.buildTokenizeCreditCardRequest({
        creditCard: {
          number: "4111111111111111",
          options: { validate: false },
          billing_address: {},
        },
      });

      expect(request.variables.input.creditCard.billingAddress).toEqual({});
    });

    it("includes an empty-string billing address field rather than dropping it", () => {
      const request = graphqlTokenization.buildTokenizeCreditCardRequest({
        creditCard: {
          number: "4111111111111111",
          options: { validate: false },
          billing_address: { postal_code: "" },
        },
      });

      expect(request.variables.input.creditCard.billingAddress).toEqual({
        postalCode: "",
      });
    });

    it("omits options when creditCard.options.validate is not a boolean", () => {
      const request = graphqlTokenization.buildTokenizeCreditCardRequest({
        creditCard: {
          number: "4111111111111111",
        },
      });

      expect(request.variables.input.options).toBeUndefined();
    });

    it("includes the authenticationInsight query fragment and variable when requested", () => {
      const request = graphqlTokenization.buildTokenizeCreditCardRequest({
        creditCard: {
          number: "4111111111111111",
          options: { validate: true },
        },
        authenticationInsight: true,
        merchantAccountId: "my_merchant_account",
      });

      expect(request.query).toContain("$authenticationInsightInput");
      expect(request.query).toContain(
        "customerAuthenticationRegulationEnvironment"
      );
      expect(request.variables.authenticationInsightInput).toEqual({
        merchantAccountId: "my_merchant_account",
      });
    });

    it("does not include authenticationInsight when merchantAccountId is missing", () => {
      const request = graphqlTokenization.buildTokenizeCreditCardRequest({
        creditCard: {
          number: "4111111111111111",
        },
        authenticationInsight: true,
      });

      expect(request.query).not.toContain("authenticationInsightInput");
      expect(request.variables.authenticationInsightInput).toBeUndefined();
    });

    it("builds the Fastlane TokenizeCreditCardForPayPalConnect mutation and variables", () => {
      const request = graphqlTokenization.buildTokenizeCreditCardRequest({
        creditCard: {
          number: "4111111111111111",
          cvv: "123",
          cardholderName: "Bob Smith",
          expiration_month: "12",
          expiration_year: "2025",
          email: "bob@example.com",
          phone: {
            phoneNumber: "3125551234",
            countryPhoneCode: "1",
            extensionNumber: "",
          },
          options: { validate: false },
          fastlane: {
            auth_assertion: "assertion-token",
            has_buyer_consent: true,
            terms_and_conditions_version: "1",
            terms_and_conditions_country: "US",
          },
          shippingAddress: {
            first_name: "Bob",
            postal_code: "22222",
          },
        },
      });

      expect(request.isFastlane).toBe(true);
      expect(request.query).toContain(
        "mutation TokenizeCreditCardForPayPalConnect("
      );
      expect(request.query).toContain("... on CreditCardDetails");
      expect(request.variables).toEqual({
        input: {
          creditCard: {
            number: "4111111111111111",
            expirationMonth: "12",
            expirationYear: "2025",
            cvv: "123",
            cardholderName: "Bob Smith",
          },
          options: {
            validate: false,
          },
          email: "bob@example.com",
          optIn: true,
          phone: {
            phoneNumber: "3125551234",
            countryPhoneCode: "1",
            extensionNumber: "",
          },
          authAssertion: "assertion-token",
          termsAndConditionsVersion: "1",
          termsAndConditionsCountry: "US",
          shippingAddress: {
            firstName: "Bob",
            postalCode: "22222",
          },
        },
      });
    });

    it("defaults optIn to false when has_buyer_consent is not provided", () => {
      const request = graphqlTokenization.buildTokenizeCreditCardRequest({
        creditCard: {
          number: "4111111111111111",
          fastlane: {},
        },
      });

      expect(request.variables.input.optIn).toBe(false);
    });

    it("omits termsAndConditionsVersion/Country and shippingAddress when not provided", () => {
      const request = graphqlTokenization.buildTokenizeCreditCardRequest({
        creditCard: {
          number: "4111111111111111",
          fastlane: { has_buyer_consent: true },
        },
      });

      expect(request.variables.input.termsAndConditionsVersion).toBeUndefined();
      expect(request.variables.input.termsAndConditionsCountry).toBeUndefined();
      expect(request.variables.input.shippingAddress).toBeUndefined();
    });
  });

  describe("shapeTokenizeResponse", () => {
    it("shapes a standard tokenizeCreditCard response", () => {
      const result = graphqlTokenization.shapeTokenizeResponse(
        {
          data: {
            tokenizeCreditCard: {
              token: "the-token",
              creditCard: {
                bin: "411111",
                brandCode: "VISA",
                last4: "1111",
                cardholderName: "Bob Smith",
                expirationMonth: "12",
                expirationYear: "2025",
                binData: {
                  commercial: "YES",
                  debit: "NO",
                  durbinRegulated: "UNKNOWN",
                  healthcare: null,
                  payroll: "NO",
                  prepaid: "YES",
                  issuingBank: "Fake Bank",
                  countryOfIssuance: "USA",
                  productId: "F",
                  business: null,
                  consumer: null,
                  purchase: null,
                  corporate: null,
                },
              },
            },
          },
        },
        false
      );

      expect(result).toEqual({
        nonce: "the-token",
        details: {
          cardholderName: "Bob Smith",
          expirationMonth: "12",
          expirationYear: "2025",
          bin: "411111",
          cardType: "Visa",
          lastFour: "1111",
          lastTwo: "11",
        },
        description: "ending in 11",
        type: "CreditCard",
        binData: {
          commercial: "Yes",
          debit: "No",
          durbinRegulated: "Unknown",
          healthcare: "Unknown",
          payroll: "No",
          prepaid: "Yes",
          issuingBank: "Fake Bank",
          countryOfIssuance: "USA",
          productId: "F",
          business: "Unknown",
          consumer: "Unknown",
          purchase: "Unknown",
          corporate: "Unknown",
        },
      });
    });

    it("shapes a Fastlane tokenizeCreditCardForPayPalConnect response", () => {
      const result = graphqlTokenization.shapeTokenizeResponse(
        {
          data: {
            tokenizeCreditCardForPayPalConnect: {
              paymentMethod: {
                id: "the-nonce",
                details: {
                  bin: "555555",
                  brandCode: "MASTERCARD",
                  last4: "4444",
                  cardholderName: "Jane Doe",
                  expirationMonth: "01",
                  expirationYear: "2030",
                  binData: null,
                },
              },
            },
          },
        },
        true
      );

      expect(result).toEqual({
        nonce: "the-nonce",
        details: {
          cardholderName: "Jane Doe",
          expirationMonth: "01",
          expirationYear: "2030",
          bin: "555555",
          cardType: "MasterCard",
          lastFour: "4444",
          lastTwo: "44",
        },
        description: "ending in 44",
        type: "CreditCard",
        binData: null,
      });
    });

    it("defaults cardType to Unknown for an unrecognized brandCode", () => {
      const result = graphqlTokenization.shapeTokenizeResponse(
        {
          data: {
            tokenizeCreditCard: {
              token: "the-token",
              creditCard: {
                bin: "",
                brandCode: "SOME_NEW_BRAND",
                last4: "",
                cardholderName: "",
                expirationMonth: "",
                expirationYear: "",
                binData: null,
              },
            },
          },
        },
        false
      );

      expect(result.details.cardType).toBe("Unknown");
      expect(result.details.bin).toBe("");
      expect(result.details.lastFour).toBe("");
      expect(result.details.lastTwo).toBe("");
      expect(result.description).toBe("");
    });

    it("includes authenticationInsight when present, mapping PSDTWO to psd2", () => {
      const result = graphqlTokenization.shapeTokenizeResponse(
        {
          data: {
            tokenizeCreditCard: {
              token: "the-token",
              creditCard: {
                brandCode: "VISA",
                last4: "1111",
                binData: null,
              },
              authenticationInsight: {
                customerAuthenticationRegulationEnvironment: "PSDTWO",
              },
            },
          },
        },
        false
      );

      expect(result.authenticationInsight).toEqual({
        regulationEnvironment: "psd2",
      });
    });

    it("lowercases unrecognized authenticationInsight regulation environments", () => {
      const result = graphqlTokenization.shapeTokenizeResponse(
        {
          data: {
            tokenizeCreditCard: {
              token: "the-token",
              creditCard: {
                brandCode: "VISA",
                last4: "1111",
                binData: null,
              },
              authenticationInsight: {
                customerAuthenticationRegulationEnvironment: "UNREGULATED",
              },
            },
          },
        },
        false
      );

      expect(result.authenticationInsight).toEqual({
        regulationEnvironment: "unregulated",
      });
    });

    it("omits authenticationInsight when not present", () => {
      const result = graphqlTokenization.shapeTokenizeResponse(
        {
          data: {
            tokenizeCreditCard: {
              token: "the-token",
              creditCard: {
                brandCode: "VISA",
                last4: "1111",
                binData: null,
              },
            },
          },
        },
        false
      );

      expect(result.authenticationInsight).toBeUndefined();
    });
  });

  describe("extractLegacyErrorCode", () => {
    it("extracts the legacy code from a direct graphQLApi rejection's originalError array", () => {
      const originalError = [
        {
          message: "Already in vault",
          extensions: {
            errorClass: "VALIDATION",
            legacyCode: "81724",
            inputPath: ["input", "creditCard"],
          },
        },
      ];
      const err = new BraintreeError({
        type: BraintreeError.types.NETWORK,
        code: "CLIENT_GRAPHQL_REQUEST_ERROR",
        message: "An error",
        details: { originalError },
      });

      expect(graphqlTokenization.extractLegacyErrorCode(err)).toBe("81724");
    });

    it("returns undefined when there is no originalError", () => {
      const err = new BraintreeError({
        type: BraintreeError.types.NETWORK,
        code: "HOSTED_FIELDS_TOKENIZATION_NETWORK_ERROR",
        message: "A tokenization network error occurred.",
      });

      expect(graphqlTokenization.extractLegacyErrorCode(err)).toBeUndefined();
    });

    it("returns undefined when originalError is not an array of GraphQL errors", () => {
      const err = new BraintreeError({
        type: BraintreeError.types.NETWORK,
        code: "CLIENT_REQUEST_ERROR",
        message: "An error",
        details: { originalError: { message: "not an array" } },
      });

      expect(graphqlTokenization.extractLegacyErrorCode(err)).toBeUndefined();
    });

    it("returns undefined for a plain (non-BraintreeError) error", () => {
      const err = new Error("plain error");

      err.details = { httpStatus: 422 };

      expect(graphqlTokenization.extractLegacyErrorCode(err)).toBeUndefined();
    });
  });
});
