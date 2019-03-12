'use strict';

var GraphQL = require('../../../../../src/client/request/graphql');
var GraphQLRequest = require('../../../../../src/client/request/graphql/request');

describe('GraphQL', function () {
  beforeEach(function () {
    this.tokenizeUrl = 'https://localhost/merchant_id/client_api/v1/payment_methods/credit_cards?12312';
    this.config = {
      graphQL: {
        url: 'http://localhost/graphql',
        features: [
          'tokenize_credit_cards'
        ]
      }
    };
    this.options = {
      graphQL: new GraphQL(this.config),
      url: this.tokenizeUrl,
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

  it('sends an analytics event during initialization', function () {
    var analyticsEvents = [];

    this.options.sendAnalyticsEvent = function (event) { analyticsEvents.push(event); };

    new GraphQLRequest(this.options); // eslint-disable-line no-new

    expect(analyticsEvents).to.deep.equal(['graphql.init']);
  });

  describe('getHeaders', function () {
    it('provides an authorization header for tokenization keys', function () {
      var graphQLRequest, headers;

      this.options.data = {
        tokenizationKey: 'fakeTokenizationKey'
      };

      graphQLRequest = new GraphQLRequest(this.options);
      headers = graphQLRequest.getHeaders();

      expect(headers.Authorization).to.equal('Bearer fakeTokenizationKey');
    });

    it('provides an authorization header for authorization fingerprints', function () {
      var graphQLRequest, headers;

      this.options.data = {
        authorizationFingerprint: 'fakeAuthorizationFingerprint'
      };

      graphQLRequest = new GraphQLRequest(this.options);
      headers = graphQLRequest.getHeaders();

      expect(headers.Authorization).to.equal('Bearer fakeAuthorizationFingerprint');
    });

    it('uses the authorization fingerprint if both are provided', function () {
      var graphQLRequest, headers;

      this.options.data = {
        tokenizationKey: 'fakeTokenizationKey',
        authorizationFingerprint: 'fakeAuthorizationFingerprint'
      };

      graphQLRequest = new GraphQLRequest(this.options);
      headers = graphQLRequest.getHeaders();

      expect(headers.Authorization).to.equal('Bearer fakeAuthorizationFingerprint');
    });

    it('includes a Braintree-Version', function () {
      var graphQLRequest, headers;

      this.options.data = {
        tokenizationKey: 'fakeTokenizationKey'
      };

      graphQLRequest = new GraphQLRequest(this.options);
      headers = graphQLRequest.getHeaders();

      expect(headers['Braintree-Version']).to.match(/\d\d\d\d\-\d\d\-\d\d/);
    });

    it('sends an analytics event for tokenization key', function () {
      var graphQLRequest;
      var analyticsEvents = [];

      this.options.data = {
        tokenizationKey: 'fakeTokenizationKey'
      };

      this.options.sendAnalyticsEvent = function (event) { analyticsEvents.push(event); };

      graphQLRequest = new GraphQLRequest(this.options);
      graphQLRequest.getHeaders();

      expect(analyticsEvents).to.include('graphql.tokenization-key');
      expect(analyticsEvents).to.not.include('graphql.authorization-fingerprint');
    });

    it('sends an analytics event for authorization fingerprint', function () {
      var graphQLRequest;
      var analyticsEvents = [];

      this.options.data = {
        authorizationFingerprint: 'fakeAuthorizationFingerprint'
      };

      this.options.sendAnalyticsEvent = function (event) { analyticsEvents.push(event); };

      graphQLRequest = new GraphQLRequest(this.options);
      graphQLRequest.getHeaders();

      expect(analyticsEvents).to.include('graphql.authorization-fingerprint');
      expect(analyticsEvents).to.not.include('graphql.tokenization-key');
    });
  });

  describe('getBody', function () {
    it('creates a GraphQL mutation for credit card tokenization', function () {
      var graphQLRequest, body, parsedBody;

      this.options.data = {
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

      graphQLRequest = new GraphQLRequest(this.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).to.contain('mutation');
      expect(parsedBody.query).to.contain('tokenizeCreditCard');
      expect(parsedBody.variables).to.exist;
      expect(parsedBody.operationName).to.equal('TokenizeCreditCard');

      expect(parsedBody.variables.input).to.deep.equal({
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

    it('includes client sdk metadata', function () {
      var graphQLRequest, body, parsedBody;

      this.options.data = {
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

      graphQLRequest = new GraphQLRequest(this.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.clientSdkMetadata).to.deep.equal({
        source: 'my-source',
        integration: 'my-integration',
        sessionId: 'my-session-id'
      });
    });

    it('creates a GraphQL query for configuration', function () {
      var graphQLRequest, body, parsedBody;
      var options = {
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

      expect(parsedBody.query).to.contain('query');
      expect(parsedBody.query).to.contain('clientConfiguration');
      expect(parsedBody.operationName).to.equal('ClientConfiguration');
    });

    it('handles snake case keys', function () {
      var graphQLRequest, body, parsedBody;

      /* eslint-disable camelcase */
      this.options.data = {
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

      graphQLRequest = new GraphQLRequest(this.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).to.exist;
      expect(parsedBody.variables).to.exist;

      expect(parsedBody.variables.input).to.deep.equal({
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

    it('prefers expiration month and year over expiration date', function () {
      var graphQLRequest, body, parsedBody;

      this.options.data = {
        creditCard: {
          number: '4111111111111111',
          expirationDate: '12 / 2020',
          expirationMonth: '03',
          expirationYear: '2017',
          cvv: '123',
          cardholderName: 'Brian Treep'
        }
      };

      graphQLRequest = new GraphQLRequest(this.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).to.exist;
      expect(parsedBody.variables).to.exist;

      expect(parsedBody.variables.input).to.deep.equal({
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

    it('splits expirationDate into month and year', function () {
      var graphQLRequest, body, parsedBody;

      this.options.data = {
        creditCard: {
          number: '4111111111111111',
          expirationDate: '12 / 2020',
          cvv: '123',
          cardholderName: 'Brian Treep'
        }
      };

      graphQLRequest = new GraphQLRequest(this.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).to.exist;
      expect(parsedBody.variables).to.exist;

      expect(parsedBody.variables.input).to.deep.equal({
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

    it('does not require billing address', function () {
      var graphQLRequest, body, parsedBody;

      this.options.data = {
        creditCard: {
          number: '4111111111111111',
          expirationYear: '2020',
          expirationMonth: '12',
          cvv: '123',
          cardholderName: 'Brian Treep'
        }
      };

      graphQLRequest = new GraphQLRequest(this.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).to.exist;
      expect(parsedBody.variables).to.exist;

      expect(parsedBody.variables.input).to.deep.equal({
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

    it('tokenizes a cvv only input', function () {
      var graphQLRequest, body, parsedBody;

      this.options.data = {
        creditCard: {
          cvv: '123'
        }
      };

      graphQLRequest = new GraphQLRequest(this.options);
      body = graphQLRequest.getBody();
      parsedBody = JSON.parse(body);

      expect(parsedBody.query).to.contain('mutation');
      expect(parsedBody.query).to.contain('tokenizeCreditCard');
      expect(parsedBody.variables).to.exist;
      expect(parsedBody.operationName).to.equal('TokenizeCreditCard');

      expect(parsedBody.variables.input).to.deep.equal({
        creditCard: {
          cvv: '123'
        },
        options: {}
      });
    });

    it('will not throw an error if credit card field is missing', function () {
      var graphQLRequest;

      this.options.data = {};

      graphQLRequest = new GraphQLRequest(this.options);
      expect(function () {
        graphQLRequest.getBody();
      }).to.not.throw();
    });

    describe('country codes', function () {
      it('supports legacy countryName', function () {
        var graphQLRequest, body, parsedBody;

        this.options.data = {
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

        graphQLRequest = new GraphQLRequest(this.options);
        body = graphQLRequest.getBody();
        parsedBody = JSON.parse(body);

        expect(parsedBody.query).to.contain('mutation');
        expect(parsedBody.query).to.contain('tokenizeCreditCard');
        expect(parsedBody.variables).to.exist;

        expect(parsedBody.variables.input).to.deep.equal({
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

      it('supports legacy countryCodeAlpha2', function () {
        var graphQLRequest, body, parsedBody;

        this.options.data = {
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

        graphQLRequest = new GraphQLRequest(this.options);
        body = graphQLRequest.getBody();
        parsedBody = JSON.parse(body);

        expect(parsedBody.query).to.contain('mutation');
        expect(parsedBody.query).to.contain('tokenizeCreditCard');
        expect(parsedBody.variables).to.exist;

        expect(parsedBody.variables.input).to.deep.equal({
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

      it('supports legacy countryCodeNumeric', function () {
        var graphQLRequest, body, parsedBody;

        this.options.data = {
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

        graphQLRequest = new GraphQLRequest(this.options);
        body = graphQLRequest.getBody();
        parsedBody = JSON.parse(body);

        expect(parsedBody.query).to.contain('mutation');
        expect(parsedBody.query).to.contain('tokenizeCreditCard');
        expect(parsedBody.variables).to.exist;

        expect(parsedBody.variables.input).to.deep.equal({
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

      it('supports legacy countryCodeAlpha3', function () {
        var graphQLRequest, body, parsedBody;

        this.options.data = {
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

        graphQLRequest = new GraphQLRequest(this.options);
        body = graphQLRequest.getBody();
        parsedBody = JSON.parse(body);

        expect(parsedBody.query).to.contain('mutation');
        expect(parsedBody.query).to.contain('tokenizeCreditCard');
        expect(parsedBody.variables).to.exist;

        expect(parsedBody.variables.input).to.deep.equal({
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

    describe('validation', function () {
      describe('with tokenization key', function () {
        it('sends validate true when client sets validate as true', function () {
          var graphQLRequest, body, parsedBody;

          this.options.data = {
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

          graphQLRequest = new GraphQLRequest(this.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).to.exist;
          expect(parsedBody.variables).to.exist;

          expect(parsedBody.variables.input).to.deep.equal({
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

        it('sends validate false when client does not specify validation', function () {
          var graphQLRequest, body, parsedBody;

          this.options.data = {
            tokenizationKey: 'fake-tokenization-key',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            }
          };

          graphQLRequest = new GraphQLRequest(this.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).to.exist;
          expect(parsedBody.variables).to.exist;

          expect(parsedBody.variables.input).to.deep.equal({
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

        it('sends validate false when client sets options but not validation', function () {
          var graphQLRequest, body, parsedBody;

          this.options.data = {
            tokenizationKey: 'fake-tokenization-key',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep',
              options: {
              }
            }
          };

          graphQLRequest = new GraphQLRequest(this.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).to.exist;
          expect(parsedBody.variables).to.exist;

          expect(parsedBody.variables.input).to.deep.equal({
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

        it('sends validate false when client sets validate as false', function () {
          var graphQLRequest, body, parsedBody;

          this.options.data = {
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

          graphQLRequest = new GraphQLRequest(this.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).to.exist;
          expect(parsedBody.variables).to.exist;

          expect(parsedBody.variables.input).to.deep.equal({
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

      describe('with authorization fingerprint', function () {
        it('sends validate true when client does not specify validation', function () {
          var graphQLRequest, body, parsedBody;

          this.options.data = {
            authorizationFingerprint: 'fake-authorization-fingerprint',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep'
            }
          };

          graphQLRequest = new GraphQLRequest(this.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).to.exist;
          expect(parsedBody.variables).to.exist;

          expect(parsedBody.variables.input).to.deep.equal({
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

        it('sends validate true when client sets options but not validation', function () {
          var graphQLRequest, body, parsedBody;

          this.options.data = {
            authorizationFingerprint: 'fake-authorization-fingerprint',
            creditCard: {
              number: '4111111111111111',
              expirationYear: '2020',
              expirationMonth: '12',
              cvv: '123',
              cardholderName: 'Brian Treep',
              options: {
              }
            }
          };

          graphQLRequest = new GraphQLRequest(this.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).to.exist;
          expect(parsedBody.variables).to.exist;

          expect(parsedBody.variables.input).to.deep.equal({
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

        it('sends validate true when client sets validate as true', function () {
          var graphQLRequest, body, parsedBody;

          this.options.data = {
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

          graphQLRequest = new GraphQLRequest(this.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).to.exist;
          expect(parsedBody.variables).to.exist;

          expect(parsedBody.variables.input).to.deep.equal({
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

        it('sends validate false when client sets validate as false', function () {
          var graphQLRequest, body, parsedBody;

          this.options.data = {
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

          graphQLRequest = new GraphQLRequest(this.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).to.exist;
          expect(parsedBody.variables).to.exist;

          expect(parsedBody.variables.input).to.deep.equal({
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

      describe('handle with authorization fingerprint logic when both authorization fingerprint and tokenization key are provided', function () {
        it('sends validate true when client does not specify validation', function () {
          var graphQLRequest, body, parsedBody;

          this.options.data = {
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

          graphQLRequest = new GraphQLRequest(this.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).to.exist;
          expect(parsedBody.variables).to.exist;

          expect(parsedBody.variables.input).to.deep.equal({
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

        it('sends validate true when client sets validate as true', function () {
          var graphQLRequest, body, parsedBody;

          this.options.data = {
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

          graphQLRequest = new GraphQLRequest(this.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).to.exist;
          expect(parsedBody.variables).to.exist;

          expect(parsedBody.variables.input).to.deep.equal({
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

        it('sends validate false when client sets validate as false', function () {
          var graphQLRequest, body, parsedBody;

          this.options.data = {
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

          graphQLRequest = new GraphQLRequest(this.options);
          body = graphQLRequest.getBody();
          parsedBody = JSON.parse(body);

          expect(parsedBody.query).to.exist;
          expect(parsedBody.variables).to.exist;

          expect(parsedBody.variables.input).to.deep.equal({
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

  describe('adaptResponseBody', function () {
    it('normalizes a GraphQL credit card tokenization response', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var binData = {
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
      var fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            token: 'faketoken',
            creditCard: {
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

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).to.deep.equal({
        creditCards: [{
          binData: binData,
          consumed: false,
          description: 'ending in 34',
          nonce: 'faketoken',
          details: {
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

    it('remaps card brand codes', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var binData = {
        prepaid: 'YES',
        healthcare: 'UNKNOWN',
        debit: 'NO',
        durbinRegulated: 'YES',
        commercial: 'NO',
        payroll: 'UNKNOWN',
        issuingBank: 'Fake Bank',
        countryOfIssuance: 'USA',
        productId: '123'
      };

      function makeResponse(brandCode) {
        return {
          data: {
            tokenizeCreditCard: {
              token: 'faketoken',
              creditCard: {
                brandCode: brandCode,
                last4: '1234',
                binData: binData
              }
            }
          }
        };
      }

      expect(graphQLRequest.adaptResponseBody(makeResponse('MASTERCARD')).creditCards[0].details.cardType).to.equal('MasterCard');
      expect(graphQLRequest.adaptResponseBody(makeResponse('DINERS')).creditCards[0].details.cardType).to.equal('Discover');
      expect(graphQLRequest.adaptResponseBody(makeResponse('DISCOVER')).creditCards[0].details.cardType).to.equal('Discover');
      expect(graphQLRequest.adaptResponseBody(makeResponse('INTERNATIONAL_MAESTRO')).creditCards[0].details.cardType).to.equal('Maestro');
      expect(graphQLRequest.adaptResponseBody(makeResponse('UK_MAESTRO')).creditCards[0].details.cardType).to.equal('Maestro');
      expect(graphQLRequest.adaptResponseBody(makeResponse('JCB')).creditCards[0].details.cardType).to.equal('JCB');
      expect(graphQLRequest.adaptResponseBody(makeResponse('UNION_PAY')).creditCards[0].details.cardType).to.equal('Union Pay');
      expect(graphQLRequest.adaptResponseBody(makeResponse('VISA')).creditCards[0].details.cardType).to.equal('Visa');
      expect(graphQLRequest.adaptResponseBody(makeResponse('SOLO')).creditCards[0].details.cardType).to.equal('Unknown');
      expect(graphQLRequest.adaptResponseBody(makeResponse('UNKNOWN')).creditCards[0].details.cardType).to.equal('Unknown');
      expect(graphQLRequest.adaptResponseBody(makeResponse()).creditCards[0].details.cardType).to.equal('Unknown');
    });

    it('normalizes null bin data fields', function () {
      var adaptedResponse;
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = {
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

      expect(adaptedResponse.creditCards[0].binData).to.deep.equal({
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

    it('normalizes a GraphQL cvv only tokenization response', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            token: 'faketoken',
            creditCard: {
              brand: null,
              brandCode: null,
              last4: null,
              binData: null
            }
          },
          extensions: {
            requestId: 'fake_request_id'
          }
        }
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).to.deep.equal({
        creditCards: [{
          binData: null,
          consumed: false,
          description: '',
          nonce: 'faketoken',
          details: {
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

    it('normalizes a GraphQL validation error response', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = {
        data: {tokenizeCreditCard: null},
        errors: [
          {
            message: 'Expiration year error 1',
            locations: [{line: 2, column: 9}],
            path: ['tokenizeCreditCard'],
            extensions: {
              errorClass: 'VALIDATION',
              inputPath: ['input', 'creditCard', 'expirationYear'],
              legacyCode: '001'
            }
          },
          {
            message: 'Expiration year error 2',
            locations: [{line: 2, column: 9}],
            path: ['tokenizeCreditCard'],
            extensions: {
              errorClass: 'VALIDATION',
              inputPath: ['input', 'creditCard', 'expirationYear'],
              legacyCode: '002'
            }
          },
          {
            message: 'Street address error',
            locations: [{line: 2, column: 9}],
            path: ['tokenizeCreditCard'],
            extensions: {
              errorClass: 'VALIDATION',
              inputPath: ['input', 'creditCard', 'billingAddress', 'streetAddress'],
              legacyCode: '003'
            }
          }
        ]
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).to.deep.equal({
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

    it('normalizes a GraphQL error response with a non-VALIDATION errorClass', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = {
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

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).to.deep.equal({
        error: {message: 'Some developer error'},
        fieldErrors: []
      });
    });

    it('normalizes a GraphQL error response without an errorClass', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = {
        data: null,
        errors: [
          {
            message: 'This is a bad error message'
          }
        ]
      };

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).to.deep.equal({
        error: {message: 'There was a problem serving your request'},
        fieldErrors: []
      });
    });

    it('normalizes a garbage error response', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = 'something went wrong';

      expect(graphQLRequest.adaptResponseBody(fakeGraphQLResponse)).to.deep.equal({
        error: {
          message: 'There was a problem serving your request'
        },
        fieldErrors: []
      });
    });
  });

  describe('determineStatus', function () {
    it('returns 200 for successful responses', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = {
        data: {
          tokenizeCreditCard: {
            token: 'faketoken'
          },
          extensions: {
            requestId: 'fake_request_id'
          }
        }
      };

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).to.equal(200);
    });

    it('returns 422 for validation errors', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = {
        data: {tokenizeCreditCard: null},
        errors: [
          {
            message: 'Input is invalid.',
            locations: [{line: 2, column: 9}],
            path: ['tokenizeCreditCard'],
            extensions: {
              legacyMessage: 'Credit card is invalid',
              errorClass: 'VALIDATION',
              errorDetails: []
            }
          }
        ]
      };

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).to.equal(422);
    });

    it('returns 403 for AUTHORIZATION errors', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = {
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

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).to.equal(403);
    });

    it('returns 500 for unknown errors', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = {
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

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).to.equal(500);
    });

    it('returns 500 for unknown errors with a success body', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = {
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

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).to.equal(500);
    });

    it('returns 403 for field coercion errors', function () {
      var graphQLRequest = new GraphQLRequest(this.options);

      var fakeGraphQLResponse = {
        data: null,
        errors: [{
          message: "Variable 'billingAddress' has an invalid value. Expected type 'Map' but was 'String'. Variables for input objects must be an instance of type 'Map'.",
          locations: [{
            line: 1,
            column: 29
          }]
        }]
      };

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).to.equal(403);
    });

    it('returns 403 for validation errors', function () {
      var graphQLRequest = new GraphQLRequest(this.options);

      var fakeGraphQLResponse = {
        data: null,
        errors: [{
          message: "Validation error of type FieldUndefined: Field 'cardType' in type 'TokenizeCreditCard' is undefined",
          locations: [{
            line: 1,
            column: 29
          }]
        }]
      };

      expect(graphQLRequest.determineStatus(200, fakeGraphQLResponse)).to.equal(403);
    });

    it('returns 500 when status code is not present', function () {
      var graphQLRequest = new GraphQLRequest(this.options);
      var fakeGraphQLResponse = {
      };

      expect(graphQLRequest.determineStatus(null, fakeGraphQLResponse)).to.equal(500);
    });

    it('passes through non-200 graphql status codes', function () {
      var graphQLRequest = new GraphQLRequest(this.options);

      expect(graphQLRequest.determineStatus(418, {})).to.equal(418);
      expect(graphQLRequest.determineStatus(500, {})).to.equal(500);
    });

    it('sends an analytics event for actual and determined http status', function () {
      var graphQLRequest, fakeGraphQLResponse;
      var analyticsEvents = [];

      this.options.sendAnalyticsEvent = function (event) { analyticsEvents.push(event); };

      graphQLRequest = new GraphQLRequest(this.options);
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

      expect(analyticsEvents).to.include('graphql.status.200');
      expect(analyticsEvents).to.include('graphql.determinedStatus.403');
    });
  });
});
