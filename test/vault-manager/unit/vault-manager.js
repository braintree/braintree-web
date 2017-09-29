'use strict';

var VaultManager = require('../../../src/vault-manager/vault-manager');
var rejectIfResolves = require('../../helpers/promise-helper').rejectIfResolves;

describe('VaultManager', function () {
  beforeEach(function () {
    this.client = {
      request: this.sandbox.stub()
    };
    this.fakePaymentMethod = {
      nonce: 'nonce',
      'default': false,
      details: {},
      type: 'type',
      garbage: 'garbage'
    };
    this.vaultManager = new VaultManager({client: this.client});
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

    it('formats response from server', function () {
      this.client.request.resolves({
        paymentMethods: [this.fakePaymentMethod]
      });

      return this.vaultManager.fetchPaymentMethods().then(function (paymentMethods) {
        expect(paymentMethods).to.deep.equal([{
          nonce: 'nonce',
          'default': false,
          details: {},
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
            type: 'Type'
          }, {
            nonce: 'payment-method-with-description',
            'default': false,
            details: {},
            type: 'Description',
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
          description: 'A card ending in 11'
        }, {
          nonce: 'payment-method-without-a-description',
          'default': true,
          details: {},
          type: 'Type'
        }, {
          nonce: 'payment-method-with-description',
          'default': false,
          details: {},
          type: 'Description',
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
});
