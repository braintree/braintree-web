'use strict';
/* eslint-disable camelcase */

var fake = require('../../helpers/fake');
var USBankAccount = require('../../../src/us-bank-account/us-bank-account');
var BraintreeError = require('../../../src/lib/error');

describe('USBankAccount', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();

    this.fakeClient = {
      getConfiguration: function () {
        return this.configuration;
      }.bind(this),
      _request: this.sandbox.stub()
    };

    this.fakePlaidInstance = {open: this.sandbox.stub()};

    this.fakePlaid = {create: this.sandbox.stub()};
    this.fakePlaid.create.returns(this.fakePlaidInstance);

    this.context = {
      _client: this.fakeClient,
      _tokenizeBankDetails: USBankAccount.prototype._tokenizeBankDetails,
      _tokenizeBankLogin: USBankAccount.prototype._tokenizeBankLogin
    };
  });

  describe('tokenize', function () {
    describe('with bad arguments', function () {
      it('errors without any arguments', function (done) {
        try {
          USBankAccount.prototype.tokenize.call(this.context);
        } catch (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('CALLBACK_REQUIRED');
          expect(err.message).to.equal('tokenize must include a callback function.');

          expect(this.fakeClient._request).not.to.have.beenCalled;

          done();
        }
      });

      it('errors without a callback', function (done) {
        try {
          USBankAccount.prototype.tokenize.call(this.context, {});
        } catch (err) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('CALLBACK_REQUIRED');
          expect(err.message).to.equal('tokenize must include a callback function.');

          expect(this.fakeClient._request).not.to.have.beenCalled;

          done();
        }
      });

      it('errors without tokenizing raw bank details or the auth flow', function (done) {
        var client = this.fakeClient;

        USBankAccount.prototype.tokenize.call(this.context, {
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function (err, tokenizedPayload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('US_BANK_OPTION_REQUIRED');
          expect(err.message).to.equal('tokenize must be called with bankDetails or bankLogin.');

          expect(tokenizedPayload).not.to.exist;
          expect(client._request).not.to.have.beenCalled;

          done();
        });
      });

      it('errors when tokenizing raw bank details AND the auth flow', function (done) {
        var client = this.fakeClient;

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0000000',
            accountType: 'checking'
          },
          bankLogin: {
            displayName: 'Pizzas Galore'
          },
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function (err, tokenizedPayload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('US_BANK_MUTUALLY_EXCLUSIVE_OPTIONS');
          expect(err.message).to.equal('tokenize must be called with bankDetails or bankLogin, not both.');

          expect(tokenizedPayload).not.to.exist;
          expect(client._request).not.to.have.beenCalled;

          done();
        });
      });
    });

    describe('raw bank details', function () {
      beforeEach(function () {
        this.fakeUsBankAccountResponse = {
          data: {
            type: 'us_bank_account',
            account_description: null,
            account_holder_name: null,
            billing_address: null,
            owner_id: 'merchant_ngtg6n_2f3xcm_qpbx7z_bx2gvh_6x5',
            custom_fields: [],
            routing_number: '307075259',
            account_type: 'checking',
            id: 'fake-nonce-123',
            last_4: '9999',
            short_id: '45nbvn',
            created_at: '2016-09-21T17:58:13.602Z',
            description: 'US bank account ending in - 9999',
            verifiable: false
          },
          meta: {
            braintree_request_id: '3a36188d-492a-4b3f-8379-de16f99c3c7b'
          }
        };
      });

      it('tokenizes a checking account', function (done) {
        this.fakeClient._request.yields(null, this.fakeUsBankAccountResponse);

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0000000',
            accountType: 'checking',
            accountHolderName: 'Frodo Baggins',
            billingAddress: {
              streetAddress: '123 Townsend St',
              extendedAddress: 'FL 6',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107'
            }
          },
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function (err, tokenizedPayload) {
          expect(err).not.to.exist;

          expect(this.fakeClient._request).to.be.calledOnce;
          expect(this.fakeClient._request).to.be.calledWithMatch({
            method: 'POST',
            url: 'https://braintree-api-endpoint.com/tokens',
            headers: {
              Authorization: 'Bearer fakeToken',
              'Braintree-Version': '2016-08-25'
            },
            data: {
              type: 'us_bank_account',
              routing_number: '1234567',
              account_number: '0000000',
              account_type: 'checking',
              account_holder_name: 'Frodo Baggins',
              billing_address: {
                street_address: '123 Townsend St',
                extended_address: 'FL 6',
                locality: 'San Francisco',
                region: 'CA',
                postal_code: '94107'
              },
              ach_mandate: {
                text: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
              }
            }
          }, this.sandbox.match.func);

          expect(tokenizedPayload.nonce).to.equal('fake-nonce-123');
          done();
        }.bind(this));
      });

      it('errors without mandateText', function (done) {
        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0000000',
            accountType: 'checking'
          }
        }, function (err, tokenizedPayload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('US_BANK_OPTION_REQUIRED');
          expect(err.message).to.equal('mandateText property is required.');

          expect(tokenizedPayload).not.to.exist;
          expect(this.fakeClient._request).not.to.have.been.called;

          done();
        }.bind(this));
      });

      it('errors without routingNumber', function (done) {
        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            accountNumber: '0000000',
            accountType: 'checking'
          },
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function (err, tokenizedPayload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('US_BANK_OPTION_REQUIRED');
          expect(err.message).to.equal('bankDetails.routingNumber property is required.');

          expect(tokenizedPayload).not.to.exist;
          expect(this.fakeClient._request).not.to.have.been.called;

          done();
        }.bind(this));
      });

      it('errors without accountNumber', function (done) {
        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountType: 'checking'
          },
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function (err, tokenizedPayload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('US_BANK_OPTION_REQUIRED');
          expect(err.message).to.equal('bankDetails.accountNumber property is required.');

          expect(tokenizedPayload).not.to.exist;
          expect(this.fakeClient._request).not.to.have.been.called;

          done();
        }.bind(this));
      });

      it('errors without accountType', function (done) {
        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0000000'
          },
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function (err, tokenizedPayload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('US_BANK_OPTION_REQUIRED');
          expect(err.message).to.equal('bankDetails.accountType property is required.');

          expect(tokenizedPayload).not.to.exist;
          expect(this.fakeClient._request).not.to.have.been.called;

          done();
        }.bind(this));
      });
    });

    describe('bank login', function () {
      beforeEach(function () {
        this.fakePlaidResponse = {
        };
        this.fakeGatewayResponse = {
          data: {
            type: 'us_bank_account',
            account_description: null,
            account_holder_name: null,
            billing_address: null,
            owner_id: 'merchant_ngtg6n_2f3xcm_qpbx7z_bx2gvh_6x5',
            custom_fields: [],
            routing_number: '307075259',
            account_type: 'checking',
            id: 'fake-nonce-123',
            last_4: '9999',
            short_id: '45nbvn',
            created_at: '2016-09-21T17:58:13.602Z',
            description: 'US bank account ending in - 9999',
            verifiable: false
          },
          meta: {
            braintree_request_id: '3a36188d-492a-4b3f-8379-de16f99c3c7b'
          }
        };
      });

      it('errors without displayName', function (done) {
        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {},
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function (err, tokenizedPayload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('US_BANK_OPTION_REQUIRED');
          expect(err.message).to.equal('displayName property is required when using bankLogin.');

          expect(tokenizedPayload).not.to.exist;
          expect(this.fakeClient._request).not.to.have.been.called;

          done();
        }.bind(this));
      });

      it('errors without mandateText', function (done) {
        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'My Merchant'
          }
        }, function (err, tokenizedPayload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('US_BANK_OPTION_REQUIRED');
          expect(err.message).to.equal('mandateText property is required.');

          expect(tokenizedPayload).not.to.exist;
          expect(this.fakeClient._request).not.to.have.been.called;

          done();
        }.bind(this));
      });
    });
  });

  describe('_loadPlaid', function () {
    beforeEach(function () {
      this.sandbox.stub(document.body, 'appendChild');
    });

    afterEach(function () {
      delete global.Plaid;
    });

    it('returns the Plaid instance if it already existed on the global', function (done) {
      var fakePlaid = this.fakePlaid;

      global.Plaid = fakePlaid;

      USBankAccount.prototype._loadPlaid.call(this.context, function (err, plaid) {
        expect(err).not.to.exist;
        expect(plaid).to.equal(fakePlaid);
        expect(document.body.appendChild).not.to.have.been.called;

        done();
      });
    });

    it('adds a Plaid Link script tag to the <body>', function () {
      var script;

      USBankAccount.prototype._loadPlaid.call(this.context, function () {});

      expect(document.body.appendChild).to.have.been.calledOnce;

      script = document.body.appendChild.args[0][0];
      expect(script.src).to.equal('https://cdn.plaid.com/link/stable/link-initialize.js');
    });

    it('calls callback with error when script load errors', function (done) {
      var script;

      USBankAccount.prototype._loadPlaid.call(this.context, function (err, plaid) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('NETWORK');
        expect(err.code).to.equal('US_BANK_LOGIN_LOAD_FAILED');
        expect(err.message).to.equal('Bank login flow failed to load.');
        expect(plaid).not.to.exist;
        done();
      });

      script = document.body.appendChild.args[0][0];
      script.onerror();
    });

    it('calls callback on script load', function (done) {
      var script;
      var fakePlaid = this.fakePlaid;

      USBankAccount.prototype._loadPlaid.call(this.context, function (err, plaid) {
        expect(err).to.not.exist;
        expect(plaid).to.equal(fakePlaid);
        done();
      });

      script = document.body.appendChild.args[0][0];

      global.Plaid = fakePlaid;
      script.onload();
    });

    it('calls callback on script readystatechange if readyState is "loaded"', function (done) {
      var script;
      var fakePlaid = this.fakePlaid;

      USBankAccount.prototype._loadPlaid.call(this.context, function (err, plaid) {
        expect(err).to.not.exist;
        expect(plaid).to.equal(fakePlaid);
        done();
      });

      script = document.body.appendChild.args[0][0];
      script.readyState = 'loaded';

      global.Plaid = fakePlaid;
      script.onreadystatechange();
    });

    it('calls callback on script readystatechange if readyState is "complete"', function (done) {
      var script;
      var fakePlaid = this.fakePlaid;

      USBankAccount.prototype._loadPlaid.call(this.context, function (err, plaid) {
        expect(err).to.not.exist;
        expect(plaid).to.equal(fakePlaid);
        done();
      });

      script = document.body.appendChild.args[0][0];
      script.readyState = 'complete';

      global.Plaid = fakePlaid;
      script.onreadystatechange();
    });

    it('does not call callback on script readystatechange if readyState is not "complete" or "loaded"', function () {
      var script;
      var fakePlaid = this.fakePlaid;
      var callbackSpy = this.sandbox.spy();

      USBankAccount.prototype._loadPlaid.call(this.context, callbackSpy);

      script = document.body.appendChild.args[0][0];
      script.readyState = 'loading';

      global.Plaid = fakePlaid;
      script.onreadystatechange();

      expect(callbackSpy).to.not.be.called;
    });

    it('does not call callback more than once', function () {
      var script, onreadystatechange;
      var fakePlaid = this.fakePlaid;
      var callbackSpy = this.sandbox.spy();

      USBankAccount.prototype._loadPlaid.call(this.context, callbackSpy);

      script = document.body.appendChild.args[0][0];

      global.Plaid = fakePlaid;

      onreadystatechange = script.onreadystatechange;
      script.onload();
      onreadystatechange.call({readyState: 'complete'});

      expect(callbackSpy).to.have.been.calledOnce;
    });

    it('removes load callbacks on load', function () {
      var script;

      USBankAccount.prototype._loadPlaid.call(this.context, function () {});

      script = document.body.appendChild.args[0][0];
      script.onload();

      expect(script.onload).not.to.exist;
      expect(script.onerror).not.to.exist;
      expect(script.onreadystatechange).not.to.exist;
    });

    it('removes load callbacks on error', function () {
      var script;

      USBankAccount.prototype._loadPlaid.call(this.context, function () {});

      script = document.body.appendChild.args[0][0];
      script.onerror();

      expect(script.onload).not.to.exist;
      expect(script.onerror).not.to.exist;
      expect(script.onreadystatechange).not.to.exist;
    });

    it('removes load callbacks on readystatechange completion', function () {
      var script;

      USBankAccount.prototype._loadPlaid.call(this.context, function () {});

      script = document.body.appendChild.args[0][0];
      script.readyState = 'complete';
      script.onreadystatechange();

      expect(script.onload).not.to.exist;
      expect(script.onerror).not.to.exist;
      expect(script.onreadystatechange).not.to.exist;
    });

    it('does not remove load callbacks if readystatechange is not "complete" or "loaded"', function () {
      var script;

      USBankAccount.prototype._loadPlaid.call(this.context, function () {});

      script = document.body.appendChild.args[0][0];
      script.readyState = 'loading';
      script.onreadystatechange();

      expect(script.onload).to.be.a('function');
      expect(script.onerror).to.be.a('function');
      expect(script.onreadystatechange).to.be.a('function');
    });

    it('handles multiple calls');
  });
});
