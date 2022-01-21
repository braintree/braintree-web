'use strict';

const GraphQL = require('../../../../../src/client/request/graphql');
const GraphQLRequest = require('../../../../../src/client/request/graphql/request');

describe('GraphQL', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.tokenizeUrl = 'https://localhost/merchant_id/client_api/v1/payment_methods/credit_cards?12312';
    testContext.config = {
      graphQL: {
        url: 'http://localhost/graphql',
        features: [
          'tokenize_credit_cards'
        ]
      }
    };
    testContext.options = {
      graphQL: new GraphQL(testContext.config),
      url: testContext.tokenizeUrl,
      headers: {
        FAKE_HEADER: 'Fake header'
      },
      metadata: {
        source: 'my-source',
        integration: 'my-integration',
        sessionId: 'my-session-id',
        extraneousProperty: 'dummy-value'
      }
    };
  });

  it('sends an analytics event during initialization', () => {
    const analyticsEvents = [];

    testContext.options.sendAnalyticsEvent = event => {
      analyticsEvents.push(event);
    };

    new GraphQLRequest(testContext.options);

    expect(analyticsEvents).toEqual(['graphql.init']);
  });

  describe('getHeaders', () => {
    it('provides an authorization header for tokenization keys', () => {
      let graphQLRequest, headers;

      testContext.options.data = {
        tokenizationKey: 'fakeTokenizationKey'
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      headers = graphQLRequest.getHeaders();

      expect(headers.Authorization).toBe('Bearer fakeTokenizationKey');
    });

    it('provides an authorization header for authorization fingerprints', () => {
      let graphQLRequest, headers;

      testContext.options.data = {
        authorizationFingerprint: 'fakeAuthorizationFingerprint'
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      headers = graphQLRequest.getHeaders();

      expect(headers.Authorization).toBe('Bearer fakeAuthorizationFingerprint');
    });

    it('uses the authorization fingerprint if both are provided', () => {
      let graphQLRequest, headers;

      testContext.options.data = {
        tokenizationKey: 'fakeTokenizationKey',
        authorizationFingerprint: 'fakeAuthorizationFingerprint'
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      headers = graphQLRequest.getHeaders();

      expect(headers.Authorization).toBe('Bearer fakeAuthorizationFingerprint');
    });

    it('includes a Braintree-Version', () => {
      let graphQLRequest, headers;

      testContext.options.data = {
        tokenizationKey: 'fakeTokenizationKey'
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      headers = graphQLRequest.getHeaders();

      expect(headers['Braintree-Version']).toMatch(/\d\d\d\d\-\d\d\-\d\d/);
    });

    it('sends an analytics event for tokenization key', () => {
      let graphQLRequest;
      const analyticsEvents = [];

      testContext.options.data = {
        tokenizationKey: 'fakeTokenizationKey'
      };

      testContext.options.sendAnalyticsEvent = event => {
        analyticsEvents.push(event);
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      graphQLRequest.getHeaders();

      expect(analyticsEvents).toStrictEqual(expect.arrayContaining(['graphql.tokenization-key']));
      expect(analyticsEvents).not.toStrictEqual(expect.arrayContaining(['graphql.authorization-fingerprint']));
    });

    it('sends an analytics event for authorization fingerprint', () => {
      let graphQLRequest;
      const analyticsEvents = [];

      testContext.options.data = {
        authorizationFingerprint: 'fakeAuthorizationFingerprint'
      };

      testContext.options.sendAnalyticsEvent = event => {
        analyticsEvents.push(event);
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      graphQLRequest.getHeaders();

      expect(analyticsEvents).toStrictEqual(expect.arrayContaining(['graphql.authorization-fingerprint']));
      expect(analyticsEvents).not.toStrictEqual(expect.arrayContaining(['graphql.tokenization-key']));
    });
  });

  describe('getBody', () => {
    it('creates a GraphQL mutation for credit card tokenization', () => {
      let graphQLRequest, body, parsedBody;

      testContext.options.data = {
        creditCard: {
          number: '4111111111111111',
          expirationYear: '12',
          expirationMonth: '2020',
          cvv: '123',
          cardholderName: 'Brian Treep',
          billingAddress: {
            company: 'Braintree',
            streetAddress: '123 Townsend St.',
            extendedAddress: '8th Floor',
            firstName: 'Dale',
            lastName: 'Cooper',
            locality: 'San Francisco',
            region: 'CA',
            postalCode: '94107',
            countryCodeAlpha3: 'USA'
          }
        }
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).toStrictEqual(expect.stringContaining('mutation'));
      expect(parsedBody.query).toStrictEqual(expect.stringContaining('tokenizeCreditCard'));
      expect(parsedBody.variables).toBeDefined();
      expect(parsedBody.operationName).toEqual('TokenizeCreditCard');

      expect(parsedBody.variables.input).toEqual({
        creditCard: {
          number: '4111111111111111',
          expirationYear: '12',
          expirationMonth: '2020',
          cvv: '123',
          cardholderName: 'Brian Treep',
          billingAddress: {
            company: 'Braintree',
            streetAddress: '123 Townsend St.',
            extendedAddress: '8th Floor',
            firstName: 'Dale',
            lastName: 'Cooper',
            locality: 'San Francisco',
            region: 'CA',
            postalCode: '94107',
            countryCodeAlpha3: 'USA'
          }
        },
        options: {}
      });
    });

    it('creates a GraphQL mutation for credit card tokenization with authentication insight in the query when an authentication insight param is passed in the body', () => {
      let graphQLRequest, body, parsedBody;

      testContext.options.data = {
        creditCard: {
          number: '4111111111111111',
          expirationYear: '12',
          expirationMonth: '2020',
          cvv: '123',
          cardholderName: 'Brian Treep',
          billingAddress: {
            company: 'Braintree',
            streetAddress: '123 Townsend St.',
            extendedAddress: '8th Floor',
            firstName: 'Dale',
            lastName: 'Cooper',
            locality: 'San Francisco',
            region: 'CA',
            postalCode: '94107',
            countryCodeAlpha3: 'USA'
          }
        },
        authenticationInsight: true,
        merchantAccountId: 'the_merchant_account_id'
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).toStrictEqual(expect.stringContaining('mutation'));
      expect(parsedBody.query).toStrictEqual(expect.stringContaining('tokenizeCreditCard'));
      expect(parsedBody.variables).toBeDefined();
      expect(parsedBody.operationName).toStrictEqual('TokenizeCreditCard');
      expect(parsedBody.query).toStrictEqual(expect.stringContaining('authenticationInsight'));
      expect(parsedBody.query).toStrictEqual(expect.stringContaining('customerAuthenticationRegulationEnvironment'));
      expect(parsedBody.variables).toBeDefined();

      expect(parsedBody.variables.input).toEqual({
        creditCard: {
          number: '4111111111111111',
          expirationYear: '12',
          expirationMonth: '2020',
          cvv: '123',
          cardholderName: 'Brian Treep',
          billingAddress: {
            company: 'Braintree',
            streetAddress: '123 Townsend St.',
            extendedAddress: '8th Floor',
            firstName: 'Dale',
            lastName: 'Cooper',
            locality: 'San Francisco',
            region: 'CA',
            postalCode: '94107',
            countryCodeAlpha3: 'USA'
          }
        },
        options: {}
      });

      expect(parsedBody.variables.authenticationInsightInput).toEqual({
        merchantAccountId: 'the_merchant_account_id'
      });
    });

    it('creates a GraphQL mutation for credit card tokenization without authentication insight in the query when no authentication insight param is passed in the body', () => {
      let graphQLRequest, body, parsedBody;

      testContext.options.data = {
        creditCard: {
          number: '4111111111111111',
          expirationYear: '12',
          expirationMonth: '2020',
          cvv: '123',
          cardholderName: 'Brian Treep',
          billingAddress: {
            company: 'Braintree',
            streetAddress: '123 Townsend St.',
            extendedAddress: '8th Floor',
            firstName: 'Dale',
            lastName: 'Cooper',
            locality: 'San Francisco',
            region: 'CA',
            postalCode: '94107',
            countryCodeAlpha3: 'USA'
          }
        },
        merchantAccountId: 'the_merchant_account_id'
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).toStrictEqual(expect.stringContaining('tokenizeCreditCard'));
      expect(parsedBody.query).not.toStrictEqual(expect.stringContaining('authenticationInsight'));
      expect(parsedBody.query).not.toStrictEqual(expect.stringContaining('merchantAccountId'));
      expect(parsedBody.query).not.toStrictEqual(expect.stringContaining('customerAuthenticationRegulationEnvironment'));
      expect(parsedBody.variables).toBeDefined();

      expect(parsedBody.variables.authenticationInsightInput).toBeFalsy();
    });

    it('creates a GraphQL mutation for credit card tokenization without authentication insight when no merchant account id is passed', () => {
      let graphQLRequest, body, parsedBody;

      testContext.options.data = {
        creditCard: {
          number: '4111111111111111',
          expirationYear: '12',
          expirationMonth: '2020',
          cvv: '123',
          cardholderName: 'Brian Treep',
          billingAddress: {
            company: 'Braintree',
            streetAddress: '123 Townsend St.',
            extendedAddress: '8th Floor',
            firstName: 'Dale',
            lastName: 'Cooper',
            locality: 'San Francisco',
            region: 'CA',
            postalCode: '94107',
            countryCodeAlpha3: 'USA'
          }
        },
        authenticationInsight: true
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).toStrictEqual(expect.stringContaining('tokenizeCreditCard'));
      expect(parsedBody.query).not.toStrictEqual(expect.stringContaining('authenticationInsight'));
      expect(parsedBody.query).not.toStrictEqual(expect.stringContaining('merchantAccountId'));
      expect(parsedBody.query).not.toStrictEqual(expect.stringContaining('customerAuthenticationRegulationEnvironment'));
      expect(parsedBody.variables).toBeDefined();

      expect(parsedBody.variables.authenticationInsightInput).toBeFalsy();
    });

    it('includes client sdk metadata', () => {
      let graphQLRequest, body, parsedBody;

      testContext.options.data = {
        creditCard: {
          number: '4111111111111111',
          expirationYear: '12',
          expirationMonth: '2020',
          cvv: '123',
          cardholderName: 'Brian Treep',
          billingAddress: {
            company: 'Braintree',
            streetAddress: '123 Townsend St.',
            extendedAddress: '8th Floor',
            firstName: 'Dale',
            lastName: 'Cooper',
            locality: 'San Francisco',
            region: 'CA',
            postalCode: '94107',
            countryCodeAlpha3: 'USA'
          }
        }
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.clientSdkMetadata).toEqual({
        source: 'my-source',
        integration: 'my-integration',
        sessionId: 'my-session-id'
      });
    });

    it('creates a GraphQL query for configuration', () => {
      let graphQLRequest, body, parsedBody;
      const options = {
        graphQL: new GraphQL({
          graphQL: {
            url: 'http://localhost/graphql',
            features: [
              'configuration'
            ]
          }
        }),
        url: 'https://localhost/merchant_id/client_api/v1/configuration',
        headers: {
          FAKE_HEADER: 'Fake header'
        },
        data: {},
        metadata: {
          source: 'my-source',
          integration: 'my-integration',
          sessionId: 'my-session-id',
          extraneousProperty: 'dummy-value'
        }
      };

      graphQLRequest = new GraphQLRequest(options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).toStrictEqual(expect.stringContaining('query'));
      expect(parsedBody.query).toStrictEqual(expect.stringContaining('clientConfiguration'));
      expect(parsedBody.operationName).toStrictEqual('ClientConfiguration');
    });

    it('handles snake case keys', () => {
      let graphQLRequest, body, parsedBody;

      /* eslint-disable camelcase */
      testContext.options.data = {
        credit_card: {
          number: '4111111111111111',
          expiration_year: '12',
          expiration_month: '2020',
          cvv: '123',
          cardholder_name: 'Brian Treep',
          billing_address: {
            company: 'Braintree',
            street_address: '123 Townsend St.',
            extended_address: '8th Floor',
            first_name: 'Dale',
            last_name: 'Cooper',
            locality: 'San Francisco',
            region: 'CA',
            postal_code: '94107',
            country_code_alpha3: 'USA'
          }
        }
      };
      /* eslint-enable camelcase */

      graphQLRequest = new GraphQLRequest(testContext.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).toBeDefined();
      expect(parsedBody.variables).toBeDefined();

      expect(parsedBody.variables.input).toEqual({
        creditCard: {
          number: '4111111111111111',
          expirationYear: '12',
          expirationMonth: '2020',
          cvv: '123',
          cardholderName: 'Brian Treep',
          billingAddress: {
            company: 'Braintree',
            streetAddress: '123 Townsend St.',
            extendedAddress: '8th Floor',
            firstName: 'Dale',
            lastName: 'Cooper',
            locality: 'San Francisco',
            region: 'CA',
            postalCode: '94107',
            countryCodeAlpha3: 'USA'
          }
        },
        options: {}
      });
    });

    it('prefers expiration month and year over expiration date', () => {
      let graphQLRequest, body, parsedBody;

      testContext.options.data = {
        creditCard: {
          number: '4111111111111111',
          expirationDate: '12 / 2020',
          expirationMonth: '03',
          expirationYear: '2017',
          cvv: '123',
          cardholderName: 'Brian Treep'
        }
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).toBeDefined();
      expect(parsedBody.variables).toBeDefined();

      expect(parsedBody.variables.input).toEqual({
        creditCard: {
          number: '4111111111111111',
          expirationMonth: '03',
          expirationYear: '2017',
          cvv: '123',
          cardholderName: 'Brian Treep'
        },
        options: {}
      });
    });

    it('splits expirationDate into month and year', () => {
      let graphQLRequest, body, parsedBody;

      testContext.options.data = {
        creditCard: {
          number: '4111111111111111',
          expirationDate: '12 / 2020',
          cvv: '123',
          cardholderName: 'Brian Treep'
        }
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).toBeDefined();
      expect(parsedBody.variables).toBeDefined();

      expect(parsedBody.variables.input).toEqual({
        creditCard: {
          number: '4111111111111111',
          expirationMonth: '12',
          expirationYear: '2020',
          cvv: '123',
          cardholderName: 'Brian Treep'
        },
        options: {}
      });
    });

    it('does not require billing address', () => {
      let graphQLRequest, body, parsedBody;

      testContext.options.data = {
        creditCard: {
          number: '4111111111111111',
          expirationYear: '2020',
          expirationMonth: '12',
          cvv: '123',
          cardholderName: 'Brian Treep'
        }
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).toBeDefined();
      expect(parsedBody.variables).toBeDefined();

      expect(parsedBody.variables.input).toEqual({
        creditCard: {
          number: '4111111111111111',
          expirationYear: '2020',
          expirationMonth: '12',
          cvv: '123',
          cardholderName: 'Brian Treep'
        },
        options: {}
      });
    });

    it('tokenizes a cvv only input', () => {
      let graphQLRequest, body, parsedBody;

      testContext.options.data = {
        creditCard: {
          cvv: '123'
        }
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).toStrictEqual(expect.stringContaining('mutation'));
      expect(parsedBody.query).toStrictEqual(expect.stringContaining('tokenizeCreditCard'));
      expect(parsedBody.variables).toBeDefined();
      expect(parsedBody.operationName).toStrictEqual('TokenizeCreditCard');

      expect(parsedBody.variables.input).toEqual({
        creditCard: {
          cvv: '123'
        },
        options: {}
      });
    });

    it('will not throw an error if credit card field is missing', () => {
      let graphQLRequest;

      testContext.options.data = {};

      graphQLRequest = new GraphQLRequest(testContext.options);
      expect(() => {
        graphQLRequest.getBody();
      }).not.toThrowError();
    });

    describe('country codes', () => {
      it('supports legacy countryName', () => {
        let graphQLRequest, body, parsedBody;

        testContext.options.data = {
          creditCard: {
            number: '4111111111111111',
            expirationYear: '12',
            expirationMonth: '2020',
            cvv: '123',
            cardholderName: 'Brian Treep',
            billingAddress: {
              company: 'Braintree',
              streetAddress: '123 Townsend St.',
              extendedAddress: '8th Floor',
              firstName: 'Dale',
              lastName: 'Cooper',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107',
              countryName: 'USA'
            }
          }
        };

        graphQLRequest = new GraphQLRequest(testContext.options);
        body = graphQLRequest.getBody();
        parsedBody = JSON.parse(body);

        expect(parsedBody.query).toStrictEqual(expect.stringContaining('mutation'));
        expect(parsedBody.query).toStrictEqual(expect.stringContaining('tokenizeCreditCard'));
        expect(parsedBody.variables).toBeDefined();

        expect(parsedBody.variables.input).toEqual({
          creditCard: {
            number: '4111111111111111',
            expirationYear: '12',
            expirationMonth: '2020',
            cvv: '123',
            cardholderName: 'Brian Treep',
            billingAddress: {
              company: 'Braintree',
              streetAddress: '123 Townsend St.',
              extendedAddress: '8th Floor',
              firstName: 'Dale',
              lastName: 'Cooper',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107',
              countryName: 'USA'
            }
          },
          options: {}
        });
      });

      it('supports legacy countryCodeAlpha2', () => {
        let graphQLRequest, body, parsedBody;

        testContext.options.data = {
          creditCard: {
            number: '4111111111111111',
            expirationYear: '12',
            expirationMonth: '2020',
            cvv: '123',
            cardholderName: 'Brian Treep',
            billingAddress: {
              company: 'Braintree',
              streetAddress: '123 Townsend St.',
              extendedAddress: '8th Floor',
              firstName: 'Dale',
              lastName: 'Cooper',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107',
              countryCodeAlpha2: 'US'
            }
          }
        };

        graphQLRequest = new GraphQLRequest(testContext.options);
        body = graphQLRequest.getBody();
        parsedBody = JSON.parse(body);

        expect(parsedBody.query).toStrictEqual(expect.stringContaining('mutation'));
        expect(parsedBody.query).toStrictEqual(expect.stringContaining('tokenizeCreditCard'));
        expect(parsedBody.variables).toBeDefined();

        expect(parsedBody.variables.input).toEqual({
          creditCard: {
            number: '4111111111111111',
            expirationYear: '12',
            expirationMonth: '2020',
            cvv: '123',
            cardholderName: 'Brian Treep',
            billingAddress: {
              company: 'Braintree',
              streetAddress: '123 Townsend St.',
              extendedAddress: '8th Floor',
              firstName: 'Dale',
              lastName: 'Cooper',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107',
              countryCodeAlpha2: 'US'
            }
          },
          options: {}
        });
      });

      it('supports legacy countryCodeNumeric', () => {
        let graphQLRequest, body, parsedBody;

        testContext.options.data = {
          creditCard: {
            number: '4111111111111111',
            expirationYear: '12',
            expirationMonth: '2020',
            cvv: '123',
            cardholderName: 'Brian Treep',
            billingAddress: {
              company: 'Braintree',
              streetAddress: '123 Townsend St.',
              extendedAddress: '8th Floor',
              firstName: 'Dale',
              lastName: 'Cooper',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107',
              countryCodeNumeric: '840'
            }
          }
        };

        graphQLRequest = new GraphQLRequest(testContext.options);
        body = graphQLRequest.getBody();
        parsedBody = JSON.parse(body);

        expect(parsedBody.query).toStrictEqual(expect.stringContaining('mutation'));
        expect(parsedBody.query).toStrictEqual(expect.stringContaining('tokenizeCreditCard'));
        expect(parsedBody.variables).toBeDefined();

        expect(parsedBody.variables.input).toEqual({
          creditCard: {
            number: '4111111111111111',
            expirationYear: '12',
            expirationMonth: '2020',
            cvv: '123',
            cardholderName: 'Brian Treep',
            billingAddress: {
              company: 'Braintree',
              streetAddress: '123 Townsend St.',
              extendedAddress: '8th Floor',
              firstName: 'Dale',
              lastName: 'Cooper',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107',
              countryCodeNumeric: '840'
            }
          },
          options: {}
        });
      });

      it('supports legacy countryCodeAlpha3', () => {
        let graphQLRequest, body, parsedBody;

        testContext.options.data = {
          creditCard: {
            number: '4111111111111111',
            expirationYear: '12',
            expirationMonth: '2020',
            cvv: '123',
            cardholderName: 'Brian Treep',
            billingAddress: {
              company: 'Braintree',
              streetAddress: '123 Townsend St.',
              extendedAddress: '8th Floor',
              firstName: 'Dale',
              lastName: 'Cooper',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107',
              countryCodeAlpha3: 'USA'
            }
          }
        };

        graphQLRequest = new GraphQLRequest(testContext.options);
        body = graphQLRequest.getBody();
        parsedBody = JSON.parse(body);

        expect(parsedBody.query).toStrictEqual(expect.stringContaining('mutation'));
        expect(parsedBody.query).toStrictEqual(expect.stringContaining('tokenizeCreditCard'));
        expect(parsedBody.variables).toBeDefined();

        expect(parsedBody.variables.input).toEqual({
          creditCard: {
            number: '4111111111111111',
            expirationYear: '12',
            expirationMonth: '2020',
            cvv: '123',
            cardholderName: 'Brian Treep',
            billingAddress: {
              company: 'Braintree',
              streetAddress: '123 Townsend St.',
              extendedAddress: '8th Floor',
              firstName: 'Dale',
              lastName: 'Cooper',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107',
              countryCodeAlpha3: 'USA'
            }
          },
          options: {}
        });
      });
    });

    describe('validation', () => {
      describe('with tokenization key', () => {
        it('sends validate true when client sets validate as true', () => {
          let graphQLRequest, body, parsedBody;

          testContext.options.data = {
            tokenizationKey: 'fake-tokenization-key',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep',
              options: {
                validate: true
              }
            }
          };

          graphQLRequest = new GraphQLRequest(testContext.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).toBeDefined();
          expect(parsedBody.variables).toBeDefined();

          expect(parsedBody.variables.input).toEqual({
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            },
            options: {
              validate: true
            }
          });
        });

        it('sends validate false when client does not specify validation', () => {
          let graphQLRequest, body, parsedBody;

          testContext.options.data = {
            tokenizationKey: 'fake-tokenization-key',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            }
          };

          graphQLRequest = new GraphQLRequest(testContext.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).toBeDefined();
          expect(parsedBody.variables).toBeDefined();

          expect(parsedBody.variables.input).toEqual({
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            },
            options: {
              validate: false
            }
          });
        });

        it('sends validate false when client sets options but not validation', () => {
          let graphQLRequest, body, parsedBody;

          testContext.options.data = {
            tokenizationKey: 'fake-tokenization-key',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep',
              options: {}
            }
          };

          graphQLRequest = new GraphQLRequest(testContext.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).toBeDefined();
          expect(parsedBody.variables).toBeDefined();

          expect(parsedBody.variables.input).toEqual({
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            },
            options: {
              validate: false
            }
          });
        });

        it('sends validate false when client sets validate as false', () => {
          let graphQLRequest, body, parsedBody;

          testContext.options.data = {
            tokenizationKey: 'fake-tokenization-key',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep',
              options: {
                validate: false
              }
            }
          };

          graphQLRequest = new GraphQLRequest(testContext.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).toBeDefined();
          expect(parsedBody.variables).toBeDefined();

          expect(parsedBody.variables.input).toEqual({
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            },
            options: {
              validate: false
            }
          });
        });
      });

      describe('with authorization fingerprint', () => {
        it('sends validate true when client does not specify validation', () => {
          let graphQLRequest, body, parsedBody;

          testContext.options.data = {
            authorizationFingerprint: 'fake-authorization-fingerprint',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            }
          };

          graphQLRequest = new GraphQLRequest(testContext.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).toBeDefined();
          expect(parsedBody.variables).toBeDefined();

          expect(parsedBody.variables.input).toEqual({
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            },
            options: {
              validate: true
            }
          });
        });

        it('sends validate true when client sets options but not validation', () => {
          let graphQLRequest, body, parsedBody;

          testContext.options.data = {
            authorizationFingerprint: 'fake-authorization-fingerprint',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep',
              options: {}
            }
          };

          graphQLRequest = new GraphQLRequest(testContext.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).toBeDefined();
          expect(parsedBody.variables).toBeDefined();

          expect(parsedBody.variables.input).toEqual({
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            },
            options: {
              validate: true
            }
          });
        });

        it('sends validate true when client sets validate as true', () => {
          let graphQLRequest, body, parsedBody;

          testContext.options.data = {
            authorizationFingerprint: 'fake-authorization-fingerprint',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep',
              options: {
                validate: true
              }
            }
          };

          graphQLRequest = new GraphQLRequest(testContext.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).toBeDefined();
          expect(parsedBody.variables).toBeDefined();

          expect(parsedBody.variables.input).toEqual({
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            },
            options: {
              validate: true
            }
          });
        });

        it('sends validate false when client sets validate as false', () => {
          let graphQLRequest, body, parsedBody;

          testContext.options.data = {
            authorizationFingerprint: 'fake-authorization-fingerprint',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep',
              options: {
                validate: false
              }
            }
          };

          graphQLRequest = new GraphQLRequest(testContext.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).toBeDefined();
          expect(parsedBody.variables).toBeDefined();

          expect(parsedBody.variables.input).toEqual({
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            },
            options: {
              validate: false
            }
          });
        });
      });

      describe('handle with authorization fingerprint logic when both authorization fingerprint and tokenization key are provided', () => {
        it('sends validate true when client does not specify validation', () => {
          let graphQLRequest, body, parsedBody;

          testContext.options.data = {
            tokenizationKey: 'fake-tokenization-key',
            authorizationFingerprint: 'fake-authorization-fingerprint',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            }
          };

          graphQLRequest = new GraphQLRequest(testContext.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).toBeDefined();
          expect(parsedBody.variables).toBeDefined();

          expect(parsedBody.variables.input).toEqual({
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            },
            options: {
              validate: true
            }
          });
        });

        it('sends validate true when client sets validate as true', () => {
          let graphQLRequest, body, parsedBody;

          testContext.options.data = {
            tokenizationKey: 'fake-tokenization-key',
            authorizationFingerprint: 'fake-authorization-fingerprint',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep',
              options: {
                validate: true
              }
            }
          };

          graphQLRequest = new GraphQLRequest(testContext.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).toBeDefined();
          expect(parsedBody.variables).toBeDefined();

          expect(parsedBody.variables.input).toEqual({
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            },
            options: {
              validate: true
            }
          });
        });

        it('sends validate false when client sets validate as false', () => {
          let graphQLRequest, body, parsedBody;

          testContext.options.data = {
            tokenizationKey: 'fake-tokenization-key',
            authorizationFingerprint: 'fake-authorization-fingerprint',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep',
              options: {
                validate: false
              }
            }
          };

          graphQLRequest = new GraphQLRequest(testContext.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).toBeDefined();
          expect(parsedBody.variables).toBeDefined();

          expect(parsedBody.variables.input).toEqual({
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            },
            options: {
              validate: false
            }
          });
        });
      });
    });
  });

  describe('adaptResponseBody', () => {
    beforeEach(() => {
      testContext.binData = {
        prepaid: 'Yes',
        healthcare: 'Unknown',
        debit: 'No',
        durbinRegulated: 'Yes',
        commercial: 'No',
        payroll: 'Unknown',
        issuingBank: 'Fake Bank',
        countryOfIssuance: 'USA',
        productId: '123'
      };
    });

    it('normalizes a GraphQL credit card tokenization response', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            token: 'faketoken',
            creditCard: {
              cardholderName: 'Given Sur',
              expirationMonth: '09',
              expirationYear: '2020',
              brandCode: 'VISA',
              last4: '1234',
              bin: '401111',
              binData: {
                prepaid: 'YES',
                healthcare: null,
                debit: 'NO',
                durbinRegulated: 'YES',
                commercial: 'NO',
                payroll: 'UNKNOWN',
                issuingBank: 'Fake Bank',
                countryOfIssuance: 'USA',
                productId: '123'
              }
            }
          }
        }
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).toEqual({
        creditCards: [{
          binData: testContext.binData,
          consumed: false,
          description: 'ending in 34',
          nonce: 'faketoken',
          details: {
            cardholderName: 'Given Sur',
            expirationMonth: '09',
            expirationYear: '2020',
            bin: '401111',
            cardType: 'Visa',
            lastFour: '1234',
            lastTwo: '34'
          },
          type: 'CreditCard',
          threeDSecureInfo: null
        }]
      });
    });

    it('normalizes a GraphQL credit card tokenization response with psd2 authentication insight', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            authenticationInsight: {
              customerAuthenticationRegulationEnvironment: 'PSDTWO'
            },
            token: 'faketoken',
            creditCard: {
              expirationMonth: '09',
              expirationYear: '2020',
              brandCode: 'VISA',
              last4: '1234',
              bin: '401111',
              binData: {
                prepaid: 'YES',
                healthcare: null,
                debit: 'NO',
                durbinRegulated: 'YES',
                commercial: 'NO',
                payroll: 'UNKNOWN',
                issuingBank: 'Fake Bank',
                countryOfIssuance: 'USA',
                productId: '123'
              }
            }
          }
        }
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).toEqual({
        creditCards: [{
          authenticationInsight: {
            regulationEnvironment: 'psd2'
          },
          binData: testContext.binData,
          consumed: false,
          description: 'ending in 34',
          nonce: 'faketoken',
          details: {
            expirationMonth: '09',
            expirationYear: '2020',
            bin: '401111',
            cardType: 'Visa',
            lastFour: '1234',
            lastTwo: '34'
          },
          type: 'CreditCard',
          threeDSecureInfo: null
        }]
      });
    });

    it('normalizes a GraphQL credit card tokenization response with unregulated authentication insight', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            authenticationInsight: {
              customerAuthenticationRegulationEnvironment: 'UNREGULATED'
            },
            token: 'faketoken',
            creditCard: {
              expirationMonth: '09',
              expirationYear: '2020',
              brandCode: 'VISA',
              last4: '1234',
              bin: '401111',
              binData: {
                prepaid: 'YES',
                healthcare: null,
                debit: 'NO',
                durbinRegulated: 'YES',
                commercial: 'NO',
                payroll: 'UNKNOWN',
                issuingBank: 'Fake Bank',
                countryOfIssuance: 'USA',
                productId: '123'
              }
            }
          }
        }
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).toEqual({
        creditCards: [{
          authenticationInsight: {
            regulationEnvironment: 'unregulated'
          },
          binData: testContext.binData,
          consumed: false,
          description: 'ending in 34',
          nonce: 'faketoken',
          details: {
            expirationMonth: '09',
            expirationYear: '2020',
            bin: '401111',
            cardType: 'Visa',
            lastFour: '1234',
            lastTwo: '34'
          },
          type: 'CreditCard',
          threeDSecureInfo: null
        }]
      });
    });

    it('normalizes a GraphQL credit card tokenization response with unavailable authentication insight', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            authenticationInsight: {
              customerAuthenticationRegulationEnvironment: 'UNAVAILABLE'
            },
            token: 'faketoken',
            creditCard: {
              expirationMonth: '09',
              expirationYear: '2020',
              brandCode: 'VISA',
              last4: '1234',
              bin: '401111',
              binData: {
                prepaid: 'YES',
                healthcare: null,
                debit: 'NO',
                durbinRegulated: 'YES',
                commercial: 'NO',
                payroll: 'UNKNOWN',
                issuingBank: 'Fake Bank',
                countryOfIssuance: 'USA',
                productId: '123'
              }
            }
          }
        }
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).toEqual({
        creditCards: [{
          authenticationInsight: {
            regulationEnvironment: 'unavailable'
          },
          binData: testContext.binData,
          consumed: false,
          description: 'ending in 34',
          nonce: 'faketoken',
          details: {
            expirationMonth: '09',
            expirationYear: '2020',
            bin: '401111',
            cardType: 'Visa',
            lastFour: '1234',
            lastTwo: '34'
          },
          type: 'CreditCard',
          threeDSecureInfo: null
        }]
      });
    });

    it('normalizes a GraphQL credit card tokenization response with any new unrecongized authentication insight values', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            authenticationInsight: {
              customerAuthenticationRegulationEnvironment: 'SOME_NEW_VALUE'
            },
            token: 'faketoken',
            creditCard: {
              expirationMonth: '09',
              expirationYear: '2020',
              brandCode: 'VISA',
              last4: '1234',
              bin: '401111',
              binData: {
                prepaid: 'YES',
                healthcare: null,
                debit: 'NO',
                durbinRegulated: 'YES',
                commercial: 'NO',
                payroll: 'UNKNOWN',
                issuingBank: 'Fake Bank',
                countryOfIssuance: 'USA',
                productId: '123'
              }
            }
          }
        }
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).toEqual({
        creditCards: [{
          authenticationInsight: {
            regulationEnvironment: 'some_new_value'
          },
          binData: testContext.binData,
          consumed: false,
          description: 'ending in 34',
          nonce: 'faketoken',
          details: {
            expirationMonth: '09',
            expirationYear: '2020',
            bin: '401111',
            cardType: 'Visa',
            lastFour: '1234',
            lastTwo: '34'
          },
          type: 'CreditCard',
          threeDSecureInfo: null
        }]
      });
    });

    it('remaps card brand codes', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);

      function makeResponse(brandCode) {
        return {
          data: {
            tokenizeCreditCard: {
              token: 'faketoken',
              creditCard: {
                brandCode: brandCode,
                last4: '1234',
                binData: self.binData
              }
            }
          }
        };
      }

      expect(graphQLRequest.adaptResponseBody(makeResponse('MASTERCARD')).creditCards[0].details.cardType).toBe('MasterCard');
      expect(graphQLRequest.adaptResponseBody(makeResponse('DINERS')).creditCards[0].details.cardType).toBe('Discover');
      expect(graphQLRequest.adaptResponseBody(makeResponse('DISCOVER')).creditCards[0].details.cardType).toBe('Discover');
      expect(graphQLRequest.adaptResponseBody(makeResponse('INTERNATIONAL_MAESTRO')).creditCards[0].details.cardType).toBe('Maestro');
      expect(graphQLRequest.adaptResponseBody(makeResponse('UK_MAESTRO')).creditCards[0].details.cardType).toBe('Maestro');
      expect(graphQLRequest.adaptResponseBody(makeResponse('JCB')).creditCards[0].details.cardType).toBe('JCB');
      expect(graphQLRequest.adaptResponseBody(makeResponse('UNION_PAY')).creditCards[0].details.cardType).toBe('UnionPay');
      expect(graphQLRequest.adaptResponseBody(makeResponse('VISA')).creditCards[0].details.cardType).toBe('Visa');
      expect(graphQLRequest.adaptResponseBody(makeResponse('ELO')).creditCards[0].details.cardType).toBe('Elo');
      expect(graphQLRequest.adaptResponseBody(makeResponse('HIPER')).creditCards[0].details.cardType).toBe('Hiper');
      expect(graphQLRequest.adaptResponseBody(makeResponse('HIPERCARD')).creditCards[0].details.cardType).toBe('Hipercard');
      expect(graphQLRequest.adaptResponseBody(makeResponse('SOLO')).creditCards[0].details.cardType).toBe('Unknown');
      expect(graphQLRequest.adaptResponseBody(makeResponse('UNKNOWN')).creditCards[0].details.cardType).toBe('Unknown');
      expect(graphQLRequest.adaptResponseBody(makeResponse()).creditCards[0].details.cardType).toBe('Unknown');
    });

    it('normalizes null bin data fields', () => {
      let adaptedResponse;
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            token: 'faketoken',
            creditCard: {
              brandCode: 'visa',
              last4: '1234',
              binData: {
                issuingBank: null,
                countryOfIssuance: null,
                productId: null
              }
            }
          }
        }
      };

      adaptedResponse = graphQLRequest.adaptResponseBody(fakeGraphQLResponse);

      expect(adaptedResponse.creditCards[0].binData).toEqual({
        prepaid: 'Unknown',
        healthcare: 'Unknown',
        debit: 'Unknown',
        durbinRegulated: 'Unknown',
        commercial: 'Unknown',
        payroll: 'Unknown',
        issuingBank: 'Unknown',
        countryOfIssuance: 'Unknown',
        productId: 'Unknown'
      });
    });

    it('normalizes a GraphQL cvv only tokenization response', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            token: 'faketoken',
            creditCard: {
              brand: null,
              brandCode: null,
              last4: null,
              binData: null,
              expirationMonth: null,
              expirationYear: null
            }
          },
          extensions: {
            requestId: 'fake_request_id'
          }
        }
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).toEqual({
        creditCards: [{
          binData: null,
          consumed: false,
          description: '',
          nonce: 'faketoken',
          details: {
            expirationMonth: null,
            expirationYear: null,
            bin: '',
            cardType: 'Unknown',
            lastFour: '',
            lastTwo: ''
          },
          type: 'CreditCard',
          threeDSecureInfo: null
        }]
      });
    });

    it('normalizes a GraphQL validation error response', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: { tokenizeCreditCard: null },
        errors: [
          {
            message: 'Expiration year error 1',
            locations: [{ line: 2, column: 9 }],
            path: ['tokenizeCreditCard'],
            extensions: {
              errorClass: 'VALIDATION',
              inputPath: ['input', 'creditCard', 'expirationYear'],
              legacyCode: '001'
            }
          },
          {
            message: 'Expiration year error 2',
            locations: [{ line: 2, column: 9 }],
            path: ['tokenizeCreditCard'],
            extensions: {
              errorClass: 'VALIDATION',
              inputPath: ['input', 'creditCard', 'expirationYear'],
              legacyCode: '002'
            }
          },
          {
            message: 'Street address error',
            locations: [{ line: 2, column: 9 }],
            path: ['tokenizeCreditCard'],
            extensions: {
              errorClass: 'VALIDATION',
              inputPath: ['input', 'creditCard', 'billingAddress', 'streetAddress'],
              legacyCode: '003'
            }
          }
        ]
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).toEqual({
        error: {
          message: 'Credit card is invalid'
        },
        fieldErrors: [
          {
            field: 'creditCard',
            fieldErrors: [
              {
                code: '001',
                field: 'expirationYear',
                message: 'Expiration year error 1'
              },
              {
                code: '002',
                field: 'expirationYear',
                message: 'Expiration year error 2'
              },
              {
                field: 'billingAddress',
                fieldErrors: [
                  {
                    code: '003',
                    field: 'streetAddress',
                    message: 'Street address error'
                  }
                ]
              }
            ]
          }
        ]
      });
    });

    it('normalizes a GraphQL validation error response without field errors', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: { tokenizeCreditCard: null },
        errors: [
          {
            message: 'Valid merchant account must be provided',
            locations: [{
              line: 1,
              column: 473
            }],
            path: ['tokenizeCreditCard', 'authenticationInsight'],
            extensions: {
              errorType: 'developer_error',
              errorClass: 'VALIDATION'
            }
          }
        ]
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).toEqual({
        error: {
          message: 'Valid merchant account must be provided'
        }
      });
    });

    it('normalizes a GraphQL error response with a non-VALIDATION errorClass', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: null,
        errors: [
          {
            message: 'Some developer error',
            extensions: {
              errorClass: 'AUTHORIZATION'
            }
          }
        ]
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).toEqual({
        error: { message: 'Some developer error' },
        fieldErrors: []
      });
    });

    it('normalizes a GraphQL error response without an errorClass', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: null,
        errors: [
          {
            message: 'This is a bad error message'
          }
        ]
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).toEqual({
        error: { message: 'There was a problem serving your request' },
        fieldErrors: []
      });
    });

    it('normalizes a garbage error response', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = 'something went wrong';

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).toEqual({
        error: {
          message: 'There was a problem serving your request'
        },
        fieldErrors: []
      });
    });
  });

  describe('determineStatus', () => {
    it('returns 200 for successful responses', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            token: 'faketoken'
          },
          extensions: {
            requestId: 'fake_request_id'
          }
        }
      };

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).toBe(200);
    });

    it('returns 422 for validation errors', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: { tokenizeCreditCard: null },
        errors: [
          {
            message: 'Input is invalid.',
            locations: [{ line: 2, column: 9 }],
            path: ['tokenizeCreditCard'],
            extensions: {
              legacyMessage: 'Credit card is invalid',
              errorClass: 'VALIDATION',
              errorDetails: []
            }
          }
        ]
      };

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).toBe(422);
    });

    it('returns 403 for AUTHORIZATION errors', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: null,
        errors: [
          {
            message: 'Some developer error',
            extensions: {
              errorClass: 'AUTHORIZATION'
            }
          }
        ]
      };

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).toBe(403);
    });

    it('returns 500 for unknown errors', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: null,
        errors: [
          {
            message: 'Some unknown error',
            extensions: {
              errorClass: 'UNKNOWN'
            }
          }
        ]
      };

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).toBe(500);
    });

    it('returns 500 for unknown errors with a success body', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            token: 'fake_token',
            creditCard: {
              brandCode: 'visa',
              last4: '1111',
              binData: null
            }
          }
        },
        errors: [{
          message: 'An unknown error occurred.',
          extensions: {
            errorClass: 'UNKNOWN',
            errorDetails: []
          }
        }]
      };

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).toBe(500);
    });

    it('returns 403 for field coercion errors', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);

      const fakeGraphQLResponse = {
        data: null,
        errors: [{
          message: 'Variable \'billingAddress\' has an invalid value. Expected type \'Map\' but was \'String\'. Variables for input objects must be an instance of type \'Map\'.',
          locations: [{
            line: 1,
            column: 29
          }]
        }]
      };

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).toBe(403);
    });

    it('returns 403 for validation errors', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);

      const fakeGraphQLResponse = {
        data: null,
        errors: [{
          message: 'Validation error of type FieldUndefined: Field \'cardType\' in type \'TokenizeCreditCard\' is undefined',
          locations: [{
            line: 1,
            column: 29
          }]
        }]
      };

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).toBe(403);
    });

    it('returns 500 when status code is not present', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);
      const fakeGraphQLResponse = {};

      expect(graphQLRequest.determineStatus(null, fakeGraphQLResponse)).toBe(500);
    });

    it('passes through non-200 graphql status codes', () => {
      const graphQLRequest = new GraphQLRequest(testContext.options);

      expect(graphQLRequest.determineStatus(418, {})).toBe(418);
      expect(graphQLRequest.determineStatus(500, {})).toBe(500);
    });

    it('sends an analytics event for actual and determined http status', () => {
      let graphQLRequest, fakeGraphQLResponse;
      const analyticsEvents = [];

      testContext.options.sendAnalyticsEvent = event => {
        analyticsEvents.push(event);
      };

      graphQLRequest = new GraphQLRequest(testContext.options);
      fakeGraphQLResponse = {
        data: null,
        errors: [
          {
            message: 'Some developer error',
            extensions: {
              errorClass: 'AUTHORIZATION'
            }
          }
        ]
      };

      graphQLRequest.determineStatus(200, fakeGraphQLResponse);

      expect(analyticsEvents).toStrictEqual(expect.arrayContaining(['graphql.status.200']));
      expect(analyticsEvents).toStrictEqual(expect.arrayContaining(['graphql.determinedStatus.403']));
    });
  });
});
