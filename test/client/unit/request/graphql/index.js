'use strict';

var browserDetection = require('../../../../../src/client/browser-detection');
var GraphQL = require('../../../../../src/client/request/graphql');

describe('GraphQL', function () {
  beforeEach(function () {
    this.tokenizeUrl = 'https://localhost:3443/merchant_id/client_api/v1/payment_methods/credit_cards?12312';
    this.tokenizePayPalUrl = 'https://localhost:3443/merchant_id/client_api/v1/payment_methods/paypal?12312';
    this.config = {
      graphQL: {
        url: 'http://localhost:8080/graphql',
        features: [
          'tokenize_credit_cards'
        ]
      }
    };
  });

  describe('getGraphQLEndpoint', function () {
    it('provides a GraphQL endpoint', function () {
      var gql = new GraphQL(this.config);

      expect(gql.getGraphQLEndpoint()).to.equal(this.config.graphQL.url);
    });
  });

  describe('isGraphQLRequest', function () {
    it('returns true if url is a GraphQL url', function () {
      var gql = new GraphQL(this.config);

      expect(gql.isGraphQLRequest(this.tokenizeUrl), {}).to.equal(true);
    });

    it('returns false if url is a non-GraphQL client api url', function () {
      var gql = new GraphQL(this.config);

      expect(gql.isGraphQLRequest(this.tokenizePayPalUrl, {})).to.equal(false);
    });

    it('returns false if url is not a GraphQL url', function () {
      var gql = new GraphQL(this.config);

      expect(gql.isGraphQLRequest('https://localhost:3443/other', {})).to.equal(false);
    });

    it('returns false if GraphQL configuration is not present', function () {
      var gql = new GraphQL({});

      expect(gql.isGraphQLRequest('https://localhost:3443/other', {})).to.equal(false);
    });

    it('returns false if browser is IE9', function () {
      var gql = new GraphQL(this.config);

      this.sandbox.stub(browserDetection, 'isIe9').returns(true);

      expect(gql.isGraphQLRequest(this.tokenizeUrl, {})).to.equal(false);
    });

    it('returns false if body contains blacklisted key', function () {
      var gql = new GraphQL(this.config);
      var body = {
        creditCard: {
          options: {
            unionPayEnrollment: {
              id: 'id',
              smsCode: 'smsCode'
            }
          }
        }
      };

      expect(gql.isGraphQLRequest(this.tokenizeUrl, body)).to.equal(false);
    });

    it('returns false if body contains blacklisted key with falsy, but not undefined value', function () {
      var gql = new GraphQL(this.config);

      expect(gql.isGraphQLRequest(this.tokenizeUrl, {
        creditCard: {
          options: {
            unionPayEnrollment: null
          }
        }
      })).to.equal(false);
      expect(gql.isGraphQLRequest(this.tokenizeUrl, {
        creditCard: {
          options: {
            unionPayEnrollment: false
          }
        }
      })).to.equal(false);
      expect(gql.isGraphQLRequest(this.tokenizeUrl, {
        creditCard: {
          options: {
            unionPayEnrollment: 0
          }
        }
      })).to.equal(false);
    });
  });
});
