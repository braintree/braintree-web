'use strict';

var sinon = require('sinon');
var browserDetection = require('../../../../src/client/browser-detection');
var AJAXDriver = require('../../../../src/client/request/ajax-driver');
var xhr = require('../../../../src/client/request/xhr');
var GraphQL = require('../../../../src/client/request/graphql');
var TEST_SERVER_URL = 'http://localhost/ajax';

describe('AJAXDriver', function () {
  beforeEach(function () {
    this.server = sinon.fakeServer.create({respondImmediately: true});
    this.fakeGraphQL = {
      isGraphQLRequest: this.sandbox.stub().returns(false)
    };
  });

  afterEach(function () {
    this.server.restore();
  });

  // TODO: figure out a way to reliably test this (peridically fails as-is)
  it.skip('accepts an ajax timeout value which will terminate the request if it is not completed', function (done) {
    this.server.restore();
    this.server = sinon.fakeServer.create();
    this.server.respondWith([200, {}, '']);

    AJAXDriver.request({
      url: TEST_SERVER_URL,
      timeout: 50,
      graphQL: this.fakeGraphQL,
      metadata: this.fakeMetadata
    }, function callback(err) {
      expect(err).to.not.eql(null);
      done();
    });

    setTimeout(function () {
      this.server.respond();
    }.bind(this), 1000);
  });

  describe('tcp preconnect bug retry', function () {
    it('retries if a 408 error and browser is IE', function (done) {
      var responseCount = 0;

      this.sandbox.stub(browserDetection, 'isIe').returns(true);

      this.server.respondWith(function (req) {
        if (responseCount === 0) {
          responseCount++;
          req.respond(408, {}, '');

          return;
        }

        req.respond(200, {}, '{"result": "yay"}');
      });

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET',
        graphQL: this.fakeGraphQL,
        metadata: this.fakeMetadata
      }, function callback(err, data, status) {
        expect(err).to.not.exist;
        expect(status).to.equal(200);
        expect(data).to.deep.equal({result: 'yay'});
        done();
      });
    });

    it('retries if a status code is 0 and browser is IE', function (done) {
      var responseCount = 0;

      this.sandbox.stub(browserDetection, 'isIe').returns(true);

      this.server.respondWith(function (req) {
        if (responseCount === 0) {
          responseCount++;
          req.respond(0, {}, '');

          return;
        }

        req.respond(200, {}, '{"result": "yay"}');
      });

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET',
        graphQL: this.fakeGraphQL,
        metadata: this.fakeMetadata
      }, function callback(err, data, status) {
        expect(err).to.not.exist;
        expect(status).to.equal(200);
        expect(data).to.deep.equal({result: 'yay'});
        done();
      });
    });

    it('only retries once if status is 408 and browser is IE', function (done) {
      var responseCount = 0;

      this.sandbox.stub(browserDetection, 'isIe').returns(true);

      this.server.respondWith(function (req) {
        if (responseCount === 0) {
          responseCount++;
          req.respond(408, {}, 'first');

          return;
        } else if (responseCount === 1) {
          responseCount++;
          req.respond(408, {}, 'second');

          return;
        }

        req.respond(200, {}, '{"never": "gets here"}');
      });

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET',
        graphQL: this.fakeGraphQL,
        metadata: this.fakeMetadata
      }, function callback(err, data, status) {
        expect(err).to.equal('second');
        expect(status).to.equal(408);
        expect(data).to.not.exist;
        done();
      });
    });

    it('only retries for 408 if browser is IE', function (done) {
      var responseCount = 0;

      this.sandbox.stub(browserDetection, 'isIe').returns(false);

      this.server.respondWith(function (req) {
        if (responseCount === 0) {
          responseCount++;
          req.respond(408, {}, 'error');

          return;
        }

        req.respond(200, {}, '{"result": "yay"}');
      });

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET',
        graphQL: this.fakeGraphQL,
        metadata: this.fakeMetadata
      }, function callback(err, data, status) {
        expect(err).to.equal('error');
        expect(status).to.equal(408);
        expect(data).to.not.exist;
        done();
      });
    });
  });

  describe('#request with get', function () {
    it('makes an serialized ajax request', function (done) {
      this.server.respondWith([200, {}, JSON.stringify({marco: 'polo'})]);

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET',
        graphQL: this.fakeGraphQL,
        metadata: this.fakeMetadata
      }, function callback(err, resp) {
        if (err) {
          done(err);

          return;
        }

        expect(resp.marco).to.eql('polo');
        done();
      });
    });

    it('calls callback with error if request is unsuccessful', function (done) {
      this.server.respondWith([500, {}, '']);

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET',
        graphQL: this.fakeGraphQL,
        metadata: this.fakeMetadata
      }, function callback(err) {
        expect(err).to.not.eql(null);
        done();
      });
    });

    it('calls callback with error if request is rate limited', function (done) {
      var body = '<!doctype html><html></html>';

      this.server.respondWith([429, {'Content-Type': 'text/html'}, body]);

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'GET',
        graphQL: this.fakeGraphQL,
        metadata: this.fakeMetadata
      }, function callback(err, res, status) {
        expect(status).to.equal(429);
        expect(res).to.be.null;
        expect(err).to.eql(body);
        done();
      });
    });
  });

  describe('#request with post', function () {
    it('makes a serialized ajax request', function (done) {
      this.server.respondWith([200, {}, JSON.stringify({marco: 'polo'})]);

      AJAXDriver.request({
        url: TEST_SERVER_URL + 'marco',
        data: {marco: 'polo'},
        method: 'POST',
        graphQL: this.fakeGraphQL,
        metadata: this.fakeMetadata
      }, function callback(err, resp) {
        if (err) {
          done(err);

          return;
        }

        expect(resp.marco).to.eql('polo');
        done();
      });
    });

    it('sets the Content-Type header to application/json', function () {
      this.sandbox.stub(XMLHttpRequest.prototype, 'setRequestHeader');

      AJAXDriver.request({
        url: TEST_SERVER_URL + 'marco',
        data: {marco: 'polo'},
        method: 'POST',
        graphQL: this.fakeGraphQL,
        metadata: this.fakeMetadata
      }, function () {});

      expect(XMLHttpRequest.prototype.setRequestHeader).to.be.calledWith('Content-Type', 'application/json');
    });

    it('sets the headers if provided and XHR is available', function () {
      this.sandbox.stub(XMLHttpRequest.prototype, 'setRequestHeader');

      AJAXDriver.request({
        url: TEST_SERVER_URL + 'marco',
        data: {marco: 'polo'},
        headers: {
          Foo: 'foo',
          Bar: 'bar'
        },
        method: 'POST',
        graphQL: this.fakeGraphQL,
        metadata: this.fakeMetadata
      }, function () {});

      expect(XMLHttpRequest.prototype.setRequestHeader).to.be.calledWith('Foo', 'foo');
      expect(XMLHttpRequest.prototype.setRequestHeader).to.be.calledWith('Bar', 'bar');
    });

    it('calls callback with error if request is unsuccessful', function (done) {
      this.server.respondWith([500, {}, '']);

      AJAXDriver.request({
        url: TEST_SERVER_URL,
        method: 'POST',
        graphQL: this.fakeGraphQL,
        metadata: this.fakeMetadata
      }, function callback(err) {
        expect(err).to.not.eql(null);
        done();
      });
    });

    describe('graphql', function () {
      beforeEach(function () {
        this.fakeMetadata = {
          source: 'my-source',
          integration: 'my-integration',
          sessionId: 'my-session-id'
        };
        this.gql = new GraphQL({
          graphQL: {
            url: 'http://localhost/graphql',
            features: ['tokenize_credit_cards']
          }
        });

        this.server.restore();

        this.fakeXHR = {
          open: this.sandbox.stub(),
          send: this.sandbox.stub(),
          setRequestHeader: this.sandbox.stub()
        };
        this.sandbox.stub(xhr, 'getRequestObject').returns(this.fakeXHR);
      });

      it('sets GraphQL required headers for GraphQL URLs', function () {
        AJAXDriver.request({
          url: TEST_SERVER_URL + '/client_api/v1/payment_methods/credit_cards',
          data: {
            tokenizationKey: 'fake_tokenization_key',
            creditCard: {},
            headers: {}
          },
          method: 'POST',
          graphQL: this.gql,
          metadata: this.fakeMetadata
        }, function () {});

        expect(this.fakeXHR.setRequestHeader).to.be.calledWith('Authorization', 'Bearer fake_tokenization_key');
        expect(this.fakeXHR.setRequestHeader).to.be.calledWith('Braintree-Version', this.sandbox.match.string);
      });

      it('does not set GraphQL required headers for non GraphQL URLs', function () {
        AJAXDriver.request({
          url: TEST_SERVER_URL + 'non-graph-ql-endpoint',
          data: {
            tokenizationKey: 'fake_tokenization_key',
            creditCard: {},
            headers: {}
          },
          method: 'POST',
          graphQL: this.gql,
          metadata: this.fakeMetadata
        }, function () {});

        expect(this.fakeXHR.setRequestHeader).to.not.be.calledWith('Authorization', 'Bearer fake_tokenization_key');
        expect(this.fakeXHR.setRequestHeader).to.not.be.calledWith('Braintree-Version', this.sandbox.match.string);
      });

      it('formats body for GraphQL URLs', function () {
        AJAXDriver.request({
          url: TEST_SERVER_URL + '/client_api/v1/payment_methods/credit_cards',
          data: {
            tokenizationKey: 'fake_tokenization_key',
            creditCard: {},
            headers: {}
          },
          method: 'POST',
          graphQL: this.gql,
          metadata: this.fakeMetadata
        }, function () {});

        expect(this.fakeXHR.send).to.be.calledWithMatch('mutation TokenizeCreditCard');
      });

      it('does not format body for non GraphQL URLs', function () {
        AJAXDriver.request({
          url: TEST_SERVER_URL + 'foo',
          data: {
            tokenizationKey: 'fake_tokenization_key',
            creditCard: {},
            headers: {}
          },
          method: 'POST',
          graphQL: this.gql,
          metadata: this.fakeMetadata
        }, function () {});

        expect(this.fakeXHR.send).to.not.be.calledWithMatch('mutation TokenizeCreditCard');
      });

      it('rewrites url for GraphQL URLs', function () {
        AJAXDriver.request({
          url: TEST_SERVER_URL + '/client_api/v1/payment_methods/credit_cards',
          data: {
            tokenizationKey: 'fake_tokenization_key',
            creditCard: {},
            headers: {}
          },
          method: 'POST',
          graphQL: this.gql,
          metadata: this.fakeMetadata
        }, function () {});

        expect(this.fakeXHR.open).to.be.calledWith('POST', 'http://localhost/graphql', true);
      });

      it('does not rewrite url for non GraphQL URLs', function () {
        AJAXDriver.request({
          url: TEST_SERVER_URL + 'foo',
          data: {
            tokenizationKey: 'fake_tokenization_key',
            creditCard: {},
            headers: {}
          },
          method: 'POST',
          graphQL: this.gql,
          metadata: this.fakeMetadata
        }, function () {});

        expect(this.fakeXHR.open).to.not.be.calledWith('POST', 'http://localhost/graphql', true);
      });

      it('provides formatted response from GraphQL', function (done) {
        AJAXDriver.request({
          url: TEST_SERVER_URL + '/client_api/v1/payment_methods/credit_cards',
          data: {
            tokenizationKey: 'fake_tokenization_key',
            creditCard: {
              number: '4111111111111111'
            },
            headers: {}
          },
          method: 'POST',
          graphQL: this.gql,
          metadata: this.fakeMetadata
        }, function (err, body, status) {
          expect(err).to.not.exist;
          expect(status).to.equal(200);

          expect(body).to.deep.equal({
            creditCards: [
              {
                binData: {
                  commercial: 'Unknown',
                  debit: 'No',
                  durbinRegulated: 'Yes',
                  healthcare: 'Unknown',
                  payroll: 'No',
                  prepaid: 'Yes',
                  issuingBank: 'issuing-bank',
                  countryOfIssuance: 'USA',
                  productId: 'product-id'
                },
                consumed: false,
                description: 'ending in 11',
                nonce: 'the-token',
                details: {
                  bin: '',
                  cardType: 'Visa',
                  lastFour: '1111',
                  lastTwo: '11'
                },
                type: 'CreditCard',
                threeDSecureInfo: null
              }
            ]
          });

          done();
        });

        this.fakeXHR.readyState = 4;
        this.fakeXHR.status = 200;
        this.fakeXHR.responseText = JSON.stringify({
          data: {
            tokenizeCreditCard: {
              token: 'the-token',
              creditCard: {
                binData: {
                  commercial: 'UNKNOWN',
                  debit: 'NO',
                  durbinRegulated: 'YES',
                  healthcare: null,
                  payroll: 'NO',
                  prepaid: 'YES',
                  issuingBank: 'issuing-bank',
                  countryOfIssuance: 'USA',
                  productId: 'product-id'
                },
                brandCode: 'VISA',
                last4: '1111'
              }
            }
          }
        });

        this.fakeXHR.onreadystatechange();
      });

      it('does not provide formatted response from non GraphQL endpoints', function (done) {
        AJAXDriver.request({
          url: TEST_SERVER_URL + 'foo',
          data: {
            tokenizationKey: 'fake_tokenization_key'
          },
          method: 'POST',
          graphQL: this.gql,
          metadata: this.fakeMetadata
        }, function (err, body, status) {
          expect(err).to.not.exist;
          expect(status).to.equal(200);

          expect(body).to.deep.equal({
            foo: 'bar'
          });
          done();
        });

        this.fakeXHR.readyState = 4;
        this.fakeXHR.status = 200;
        this.fakeXHR.responseText = '{"foo":"bar"}';

        this.fakeXHR.onreadystatechange();
      });
    });
  });
});
