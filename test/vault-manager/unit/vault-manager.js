'use strict';

var analytics = require('../../../src/lib/analytics');
var VaultManager = require('../../../src/vault-manager/vault-manager');
var Promise = require('../../../src/lib/promise');
var fake = require('../../helpers/fake');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;
var BraintreeError = require('../../../src/lib/braintree-error');
var methods = require('../../../src/lib/methods');

describe('VaultManager', function () {
  beforeEach(function () {
    this.client = fake.client({
      configuration: {
        authorizationType: 'CLIENT_TOKEN'
      }
    });
    this.sandbox.stub(this.client, 'request').resolves();
    this.fakePaymentMethod = {
      nonce: 'nonce',
      'default': false,
      hasSubscription: false,
      details: {},
      type: 'type',
      garbage: 'garbage'
    };
    this.vaultManager = new VaultManager({client: this.client});
    this.sandbox.stub(analytics, 'sendEvent');
  });

  describe('fetchPaymentMethods', function () {
    it('supports a callback', function (done) {
      this.client.request.resolves({
        paymentMethods: [this.fakePaymentMethod]
      });

      return this.vaultManager.fetchPaymentMethods(function (err, paymentMethods) {
        expect(err).to.not.exist;
        expect(paymentMethods).to.deep.equal([{
          nonce: 'nonce',
          'default': false,
          details: {},
          hasSubscription: false,
          type: 'type'
        }]);

        done();
      });
    });

    it('requests payment methods', function () {
      this.client.request.resolves({
        paymentMethods: [this.fakePaymentMethod]
      });

      return this.vaultManager.fetchPaymentMethods().then(function () {
        expect(this.client.request).to.be.calledOnce;
        expect(this.client.request).to.be.calledWith({
          endpoint: 'payment_methods',
          method: 'get',
          data: {
            defaultFirst: 0
          }
        });
      }.bind(this));
    });

    it('allows passing in a defaultFirst param', function () {
      this.client.request.resolves({
        paymentMethods: [this.fakePaymentMethod]
      });

      return this.vaultManager.fetchPaymentMethods({
        defaultFirst: true
      }).then(function () {
        expect(this.client.request).to.be.calledOnce;
        expect(this.client.request).to.be.calledWith({
          endpoint: 'payment_methods',
          method: 'get',
          data: {
            defaultFirst: 1
          }
        });
      }.bind(this));
    });

    it('sends analytics event', function () {
      this.client.request.resolves({
        paymentMethods: [this.fakePaymentMethod]
      });

      return this.vaultManager.fetchPaymentMethods().then(function () {
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'vault-manager.fetch-payment-methods.succeeded');
      }.bind(this));
    });

    it('formats response from server', function () {
      this.client.request.resolves({
        paymentMethods: [this.fakePaymentMethod]
      });

      return this.vaultManager.fetchPaymentMethods().then(function (paymentMethods) {
        expect(paymentMethods).to.deep.equal([{
          nonce: 'nonce',
          'default': false,
          details: {},
          hasSubscription: false,
          type: 'type'
        }]);
      });
    });

    it('includes description if payload includes a description', function () {
      this.fakePaymentMethod.type = 'CreditCard';
      this.fakePaymentMethod.description = 'A card ending in 11';
      this.client.request.resolves({
        paymentMethods: [
          this.fakePaymentMethod, {
            nonce: 'payment-method-without-a-description',
            'default': true,
            details: {},
            hasSubscription: false,
            type: 'Type'
          }, {
            nonce: 'payment-method-with-description',
            'default': false,
            details: {},
            type: 'Description',
            hasSubscription: true,
            description: 'A description'
          }
        ]
      });

      return this.vaultManager.fetchPaymentMethods().then(function (paymentMethods) {
        expect(paymentMethods).to.deep.equal([{
          nonce: 'nonce',
          'default': false,
          details: {},
          type: 'CreditCard',
          hasSubscription: false,
          description: 'A card ending in 11'
        }, {
          nonce: 'payment-method-without-a-description',
          'default': true,
          details: {},
          hasSubscription: false,
          type: 'Type'
        }, {
          nonce: 'payment-method-with-description',
          'default': false,
          details: {},
          type: 'Description',
          hasSubscription: true,
          description: 'A description'
        }]);
      });
    });

    it('includes binData if payload includes a binData', function () {
      this.fakePaymentMethod.type = 'CreditCard';
      this.fakePaymentMethod.binData = {
        some: 'data'
      };
      this.client.request.resolves({
        paymentMethods: [
          this.fakePaymentMethod, {
            nonce: 'payment-method-without-bin-data',
            'default': true,
            details: {},
            type: 'Type'
          }, {
            nonce: 'payment-method-with-bin-data',
            'default': false,
            details: {},
            type: 'BinData',
            binData: {more: 'data'}
          }
        ]
      });

      return this.vaultManager.fetchPaymentMethods().then(function (paymentMethods) {
        expect(paymentMethods[0].binData).to.deep.equal({some: 'data'});
        expect(paymentMethods[1].binData).to.not.exist;
        expect(paymentMethods[2].binData).to.deep.equal({more: 'data'});
      });
    });

    it('sends back error if request fails', function () {
      var fakeError = new Error('error');

      this.client.request.rejects(fakeError);

      return this.vaultManager.fetchPaymentMethods().then(rejectIfResolves).catch(function (err) {
        expect(err).to.equal(fakeError);
      });
    });
  });

  describe('deletePaymentMethod', function () {
    it('calls graphql to delete payment method', function () {
      this.client.request.resolves();

      return this.vaultManager.deletePaymentMethod('nonce-to-delete').then(function () {
        expect(this.client.request).to.be.calledOnce;
        expect(this.client.request).to.be.calledWith({
          api: 'graphQLApi',
          data: this.sandbox.match({
            variables: {
              input: {
                singleUseTokenId: 'nonce-to-delete'
              }
            }
          })
        });
      }.bind(this));
    });

    it('sends analytics event on success', function () {
      this.client.request.resolves();

      return this.vaultManager.deletePaymentMethod('nonce-to-delete').then(function () {
        expect(analytics.sendEvent).to.be.calledOnce;
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'vault-manager.delete-payment-method.succeeded');
      }.bind(this));
    });

    it('errors if a client token is not used', function () {
      this.sandbox.stub(this.client, 'getConfiguration').returns({
        authorizationType: 'TOKENIZATION_KEY'
      });

      return this.vaultManager.deletePaymentMethod('nonce-to-delete').then(rejectIfResolves).catch(function (err) {
        expect(this.client.request).to.not.be.called;

        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('VAULT_MANAGER_DELETE_PAYMENT_METHOD_NONCE_REQUIRES_CLIENT_TOKEN');
        expect(err.message).to.equal('A client token with a customer id must be used to delete a payment method nonce.');

        this.client.getConfiguration.returns({
          authorizationType: 'CLIENT_TOKEN'
        });

        return this.vaultManager.deletePaymentMethod('nonce-to-delete');
      }.bind(this)).then(function () {
        expect(this.client.request).to.be.calledOnce;
      }.bind(this));
    });

    it('provides a not found error when nonce does not exist', function () {
      var graphQLErrors = [
        {
          message: 'Record not found',
          locations: [
            {
              line: 1,
              column: 104
            }
          ],
          path: [
            'deletePaymentMethodFromSingleUseToken'
          ],
          extensions: {
            errorType: 'user_error',
            errorClass: 'NOT_FOUND',
            inputPath: [
              'input',
              'singleUseTokenId'
            ]
          }
        }
      ];
      var requestError = new BraintreeError({
        code: 'CLIENT_GRAPHQL_REQUEST_ERROR',
        message: 'There was a problem with your request.',
        name: 'BraintreeError',
        type: 'NETWORK',
        details: {
          originalError: graphQLErrors
        }
      });

      this.client.request.rejects(requestError);

      return this.vaultManager.deletePaymentMethod('fake-nonce').then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('VAULT_MANAGER_PAYMENT_METHOD_NONCE_NOT_FOUND');
        expect(err.message).to.equal('A payment method for payment method nonce `fake-nonce` could not be found.');
        expect(err.details.originalError).to.equal(graphQLErrors);
      });
    });

    it('provides a generic error for all other errors', function () {
      var graphQLErrors = [
        {
          message: 'Record not found',
          locations: [
            {
              line: 1,
              column: 104
            }
          ],
          path: [
            'deletePaymentMethodFromSingleUseToken'
          ],
          extensions: {
            errorType: 'user_error',
            errorClass: 'UNKOWN',
            inputPath: [
              'input',
              'singleUseTokenId'
            ]
          }
        }
      ];
      var requestError = new BraintreeError({
        code: 'CLIENT_GRAPHQL_REQUEST_ERROR',
        message: 'There was a problem with your request.',
        name: 'BraintreeError',
        type: 'NETWORK',
        details: {
          originalError: graphQLErrors
        }
      });

      this.client.request.rejects(requestError);

      return this.vaultManager.deletePaymentMethod('fake-nonce').then(rejectIfResolves).catch(function (err) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('UNKNOWN');
        expect(err.code).to.equal('VAULT_MANAGER_DELETE_PAYMENT_METHOD_UNKNOWN_ERROR');
        expect(err.message).to.equal('An unknown error occured when attempting to delete the payment method assocaited with the payment method nonce `fake-nonce`.');
        expect(err.details.originalError).to.equal(graphQLErrors);
      });
    });

    it('sends an analytics event when error occurs', function () {
      var graphQLErrors = [
        {
          message: 'Record not found',
          locations: [
            {
              line: 1,
              column: 104
            }
          ],
          path: [
            'deletePaymentMethodFromSingleUseToken'
          ],
          extensions: {
            errorType: 'user_error',
            errorClass: 'UNKOWN',
            inputPath: [
              'input',
              'singleUseTokenId'
            ]
          }
        }
      ];
      var requestError = new BraintreeError({
        code: 'CLIENT_GRAPHQL_REQUEST_ERROR',
        message: 'There was a problem with your request.',
        name: 'BraintreeError',
        type: 'NETWORK',
        details: {
          originalError: graphQLErrors
        }
      });

      this.client.request.rejects(requestError);

      return this.vaultManager.deletePaymentMethod('fake-nonce').then(rejectIfResolves).catch(function () {
        expect(analytics.sendEvent).to.be.calledOnce;
        expect(analytics.sendEvent).to.be.calledWith(this.client, 'vault-manager.delete-payment-method.failed');
      }.bind(this));
    });
  });

  describe('teardown', function () {
    it('returns a promise', function () {
      var promise = this.vaultManager.teardown();

      expect(promise).to.be.an.instanceof(Promise);
    });

    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var instance = this.vaultManager;

      instance.teardown(function () {
        methods(VaultManager.prototype).forEach(function (method) {
          var err;

          try {
            instance[method]();
          } catch (e) {
            err = e;
          }

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal(BraintreeError.types.MERCHANT);
          expect(err.code).to.equal('METHOD_CALLED_AFTER_TEARDOWN');
          expect(err.message).to.equal(method + ' cannot be called after teardown.');
        });

        done();
      });
    });
  });
});
