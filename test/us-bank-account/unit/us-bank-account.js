'use strict';
/* eslint-disable camelcase */

var fake = require('../../helpers/fake');
var USBankAccount = require('../../../src/us-bank-account/us-bank-account');
var BraintreeError = require('../../../src/lib/braintree-error');
var analytics = require('../../../src/lib/analytics');
var methods = require('../../../src/lib/methods');

describe('USBankAccount', function () {
  beforeEach(function () {
    this.configuration = fake.configuration();

    this.configuration.gatewayConfiguration.usBankAccount = {
      plaid: {
        publicKey: 'abc123'
      }
    };

    this.fakeClient = {
      getConfiguration: function () {
        return this.configuration;
      }.bind(this),
      request: this.sandbox.stub()
    };

    this.context = {
      _client: this.fakeClient,
      _tokenizeBankDetails: USBankAccount.prototype._tokenizeBankDetails,
      _tokenizeBankLogin: USBankAccount.prototype._tokenizeBankLogin
    };

    this.sandbox.stub(analytics, 'sendEvent');
  });

  describe('Constructor', function () {
    it('sends an analytics event', function () {
      new USBankAccount({client: this.fakeClient}); // eslint-disable-line no-new

      expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'usbankaccount.initialized');
      expect(analytics.sendEvent).to.be.calledOnce;
    });
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

          expect(this.fakeClient.request).not.to.have.beenCalled;

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

          expect(this.fakeClient.request).not.to.have.beenCalled;

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
          expect(err.code).to.equal('US_BANK_ACCOUNT_OPTION_REQUIRED');
          expect(err.message).to.equal('tokenize must be called with bankDetails or bankLogin.');

          expect(tokenizedPayload).not.to.exist;
          expect(client.request).not.to.have.beenCalled;

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
          expect(err.code).to.equal('US_BANK_ACCOUNT_MUTUALLY_EXCLUSIVE_OPTIONS');
          expect(err.message).to.equal('tokenize must be called with bankDetails or bankLogin, not both.');

          expect(tokenizedPayload).not.to.exist;
          expect(client.request).not.to.have.beenCalled;

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
        this.fakeClient.request.yieldsAsync(null, this.fakeUsBankAccountResponse);

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0000000',
            accountType: 'checking',
            ownershipType: 'personal',
            firstName: 'First',
            lastName: 'Last',
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

          expect(this.fakeClient.request).to.be.calledOnce;
          expect(this.fakeClient.request).to.be.calledWithMatch({
            method: 'POST',
            api: 'braintreeApi',
            endpoint: 'tokens',
            data: {
              type: 'us_bank_account',
              routing_number: '1234567',
              account_number: '0000000',
              account_type: 'checking',
              ownership_type: 'personal',
              first_name: 'First',
              last_name: 'Last',
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

      it('sends a "success" analytics event when tokenizing bank details successfully', function (done) {
        this.fakeClient.request.yieldsAsync(null, this.fakeUsBankAccountResponse);

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0000000',
            accountType: 'checking',
            firstName: 'Frodo',
            lastName: 'Baggins',
            billingAddress: {
              streetAddress: '123 Townsend St',
              extendedAddress: 'FL 6',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107'
            }
          },
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function () {
          expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'usbankaccount.bankdetails.tokenization.succeeded');
          expect(analytics.sendEvent).to.be.calledOnce;

          done();
        }.bind(this));
      });

      it('sends a "failed" analytics event when tokenizing bank details badly', function (done) {
        this.fakeClient.request.yieldsAsync(new Error('Something bad happnened'), null);

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0000000',
            accountType: 'checking',
            firstName: 'Frodo',
            lastName: 'Baggins',
            billingAddress: {
              streetAddress: '123 Townsend St',
              extendedAddress: 'FL 6',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107'
            }
          },
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function () {
          expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'usbankaccount.bankdetails.tokenization.failed');
          expect(analytics.sendEvent).to.be.calledOnce;

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
          expect(err.code).to.equal('US_BANK_ACCOUNT_OPTION_REQUIRED');
          expect(err.message).to.equal('mandateText property is required.');

          expect(tokenizedPayload).not.to.exist;
          expect(this.fakeClient.request).not.to.be.called;

          done();
        }.bind(this));
      });

      it('errors when tokenize fails with 401 status code', function (done) {
        var originalError = new Error('Something bad happnened');

        this.fakeClient.request.yieldsAsync(originalError, null, 401);

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0000000',
            accountType: 'checking',
            firstName: 'Frodo',
            lastName: 'Baggins',
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
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('BRAINTREE_API_ACCESS_RESTRICTED');
          expect(err.message).to.equal('Your access is restricted and cannot use this part of the Braintree API.');
          expect(err.details.originalError).to.equal(originalError);

          expect(tokenizedPayload).not.to.exist;

          done();
        });
      });

      it('errors when tokenize fails with 4xx status code', function (done) {
        var originalError = new Error('Something bad happnened');

        this.fakeClient.request.yieldsAsync(originalError, null, 404);

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0000000',
            accountType: 'checking',
            firstName: 'Frodo',
            lastName: 'Baggins',
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
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('US_BANK_ACCOUNT_FAILED_TOKENIZATION');
          expect(err.message).to.equal('The supplied data failed tokenization.');
          expect(err.details.originalError).to.equal(originalError);

          expect(tokenizedPayload).not.to.exist;

          done();
        });
      });

      it('errors when tokenize fails with 5xx status code', function (done) {
        var originalError = new Error('Something bad happnened');

        this.fakeClient.request.yieldsAsync(originalError, null, 500);

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0000000',
            accountType: 'checking',
            firstName: 'Frodo',
            lastName: 'Baggins',
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
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('NETWORK');
          expect(err.code).to.equal('US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR');
          expect(err.message).to.equal('A tokenization network error occurred.');
          expect(err.details.originalError).to.equal(originalError);

          expect(tokenizedPayload).not.to.exist;

          done();
        });
      });
    });

    describe('bank login', function () {
      beforeEach(function () {
        this.fakeGatewayResponse = {
          data: {
            type: 'us_bank_account',
            account_description: null,
            account_holder_name: null,
            billing_address: {
              street_address: '123 Townsend St',
              extended_address: 'FL 6',
              locality: 'San Francisco',
              region: 'CA',
              postal_code: '94107'
            },
            owner_id: 'merchant_ngtg6n_2f3xcm_qpbx7z_bx2gvh_6x5',
            custom_fields: [],
            routing_number: '307075259',
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

      it('errors when Plaid fails to load', function (done) {
        var loadError = new Error('Failed to load');

        this.context._loadPlaid = function (callback) {
          setTimeout(function () {
            callback(loadError);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function (err, tokenizedPayload) {
          expect(err).to.equal(loadError);

          expect(tokenizedPayload).not.to.exist;
          expect(this.fakeClient.request).not.to.be.called;

          done();
        }.bind(this));
      });

      it('errors when the Plaid onExit callback is called', function (done) {
        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              return {
                open: function () {
                  setTimeout(options.onExit, 1);
                }
              };
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function (err, tokenizedPayload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('CUSTOMER');
          expect(err.code).to.equal('US_BANK_ACCOUNT_LOGIN_CLOSED');
          expect(err.message).to.equal('Customer closed bank login flow before authorizing.');

          expect(tokenizedPayload).not.to.exist;
          expect(this.fakeClient.request).not.to.be.called;

          done();
        }.bind(this));
      });

      it('errors when calling multiple times', function (done) {
        var tokenizeOptions = {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        };

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function () {
              return {
                open: function () {}
              };
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, tokenizeOptions, function () {});

        USBankAccount.prototype.tokenize.call(this.context, tokenizeOptions, function (err, tokenizedPayload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('US_BANK_ACCOUNT_LOGIN_REQUEST_ACTIVE');
          expect(err.message).to.equal('Another bank login tokenization request is active.');

          expect(tokenizedPayload).not.to.exist;

          done();
        });
      });

      it('errors when plaid is missing in usBankAccount configuration', function (done) {
        var tokenizeOptions = {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        };

        delete this.configuration.gatewayConfiguration.usBankAccount.plaid;

        USBankAccount.prototype.tokenize.call(this.context, tokenizeOptions, function (err, tokenizedPayload) {
          expect(tokenizedPayload).to.not.exist;

          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('US_BANK_ACCOUNT_BANK_LOGIN_NOT_ENABLED');
          expect(err.message).to.equal('Bank login is not enabled.');

          done();
        });
      });

      it('tokenizes bank login for personal accounts', function (done) {
        this.fakeClient.request.yieldsAsync(null, this.fakeGatewayResponse);

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              expect(options.env).to.equal('tartan');
              expect(options.clientName).to.equal('Test Merchant');
              expect(options.key).to.equal('test_key');
              expect(options.product).to.equal('auth');
              expect(options.selectAccount).to.equal(true);
              expect(options.onExit).to.be.a('function');
              expect(options.onSuccess).to.be.a('function');

              return {
                open: function () {
                  setTimeout(function () {
                    var publicToken = 'abc123';
                    var metadata = {account_id: 'xyz456'};

                    options.onSuccess(publicToken, metadata);
                  }, 1);
                }
              };
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant',
            ownershipType: 'personal',
            firstName: 'First',
            lastName: 'Last',
            billingAddress: {
              streetAddress: '123 Townsend St',
              extendedAddress: 'FL 6',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107'
            }
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        }, function (err, tokenizedPayload) {
          expect(err).not.to.exist;

          expect(this.fakeClient.request).to.be.calledOnce;
          expect(this.fakeClient.request).to.be.calledWith(this.sandbox.match({
            method: 'POST',
            endpoint: 'tokens',
            api: 'braintreeApi',
            data: {
              type: 'plaid_public_token',
              public_token: 'abc123',
              account_id: 'xyz456',
              ach_mandate: {
                text: 'I authorize Braintree to charge my bank account.'
              },
              ownership_type: 'personal',
              first_name: 'First',
              last_name: 'Last',
              billing_address: {
                street_address: '123 Townsend St',
                extended_address: 'FL 6',
                locality: 'San Francisco',
                region: 'CA',
                postal_code: '94107'
              }
            }
          }));

          expect(tokenizedPayload).to.deep.equal({
            nonce: 'fake-nonce-123',
            details: {},
            description: 'US bank account ending in - 9999',
            type: 'us_bank_account'
          });

          done();
        }.bind(this));
      });

      it('tokenizes bank login for business accounts', function (done) {
        this.fakeClient.request.yieldsAsync(null, this.fakeGatewayResponse);

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              expect(options.env).to.equal('tartan');
              expect(options.clientName).to.equal('Test Merchant');
              expect(options.key).to.equal('test_key');
              expect(options.product).to.equal('auth');
              expect(options.selectAccount).to.equal(true);
              expect(options.onExit).to.be.a('function');
              expect(options.onSuccess).to.be.a('function');

              return {
                open: function () {
                  setTimeout(function () {
                    var publicToken = 'abc123';
                    var metadata = {account_id: 'xyz456'};

                    options.onSuccess(publicToken, metadata);
                  }, 1);
                }
              };
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant',
            ownershipType: 'business',
            businessName: 'Acme Inc',
            billingAddress: {
              streetAddress: '123 Townsend St',
              extendedAddress: 'FL 6',
              locality: 'San Francisco',
              region: 'CA',
              postalCode: '94107'
            }
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        }, function (err, tokenizedPayload) {
          expect(err).not.to.exist;

          expect(this.fakeClient.request).to.be.calledOnce;
          expect(this.fakeClient.request).to.be.calledWith(this.sandbox.match({
            method: 'POST',
            endpoint: 'tokens',
            api: 'braintreeApi',
            data: {
              type: 'plaid_public_token',
              public_token: 'abc123',
              account_id: 'xyz456',
              ach_mandate: {
                text: 'I authorize Braintree to charge my bank account.'
              },
              ownership_type: 'business',
              business_name: 'Acme Inc',
              billing_address: {
                street_address: '123 Townsend St',
                extended_address: 'FL 6',
                locality: 'San Francisco',
                region: 'CA',
                postal_code: '94107'
              }
            }
          }));

          expect(tokenizedPayload).to.deep.equal({
            nonce: 'fake-nonce-123',
            details: {},
            description: 'US bank account ending in - 9999',
            type: 'us_bank_account'
          });

          done();
        }.bind(this));
      });

      it('sets Plaid environment to "tartan" in Braintree sandbox', function (done) {
        this.configuration.gatewayConfiguration.environment = 'sandbox';

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              expect(options.env).to.equal('tartan');

              return {open: done};
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        }, function () {});
      });

      it('sets Plaid environment to "production" in Braintree production', function (done) {
        this.configuration.gatewayConfiguration.environment = 'production';

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              expect(options.env).to.equal('production');

              return {open: done};
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        }, function () {});
      });

      it('sets Plaid API key to test_key in Braintree sandbox', function (done) {
        this.configuration.gatewayConfiguration.environment = 'sandbox';
        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              expect(options.key).to.equal('test_key');

              return {open: done};
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        }, function () {});
      });

      it('sets Plaid API key to the Plaid public key in the configuration', function (done) {
        this.configuration.gatewayConfiguration.environment = 'production';
        this.configuration.gatewayConfiguration.usBankAccount.plaid.publicKey = 'foo_boo';
        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              expect(options.key).to.equal('foo_boo');

              return {open: done};
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        }, function () {});
      });

      it('errors without displayName', function (done) {
        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {},
          mandateText: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.'
        }, function (err, tokenizedPayload) {
          expect(err).to.be.an.instanceof(BraintreeError);
          expect(err.type).to.equal('MERCHANT');
          expect(err.code).to.equal('US_BANK_ACCOUNT_OPTION_REQUIRED');
          expect(err.message).to.equal('displayName property is required when using bankLogin.');

          expect(tokenizedPayload).not.to.exist;
          expect(this.fakeClient.request).not.to.be.called;

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
          expect(err.code).to.equal('US_BANK_ACCOUNT_OPTION_REQUIRED');
          expect(err.message).to.equal('mandateText property is required.');

          expect(tokenizedPayload).not.to.exist;
          expect(this.fakeClient.request).not.to.be.called;

          done();
        }.bind(this));
      });

      it('sends a "started" analytics event when starting Plaid', function (done) {
        var fakeClient = this.fakeClient;

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function () {
              return {
                open: function () {
                  setTimeout(function () {
                    expect(analytics.sendEvent).to.be.calledWith(fakeClient, 'usbankaccount.banklogin.tokenization.started');
                    expect(analytics.sendEvent).to.be.calledOnce;

                    done();
                  }, 1);
                }
              };
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        }, function () {});
      });

      it('sends a "succeeded" analytics events when Plaid tokenization completes', function (done) {
        this.fakeClient.request.yieldsAsync(null, this.fakeGatewayResponse);

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              return {
                open: function () {
                  setTimeout(function () {
                    var publicToken = 'abc123';
                    var metadata = {account_id: 'xyz456'};

                    options.onSuccess(publicToken, metadata);
                  }, 1);
                }
              };
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        }, function () {
          expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'usbankaccount.banklogin.tokenization.succeeded');

          done();
        }.bind(this));
      });

      it('sends a "closed.by-user" analytics events when user closes Plaid flow', function (done) {
        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              return {
                open: function () {
                  setTimeout(function () {
                    options.onExit();
                  }, 1);
                }
              };
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        }, function () {
          expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'usbankaccount.banklogin.tokenization.closed.by-user');

          done();
        }.bind(this));
      });

      it('sends a "failed" analytics events when Plaid tokenization fails', function (done) {
        this.fakeClient.request.yieldsAsync(new Error('Something bad happened'));

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              return {
                open: function () {
                  setTimeout(function () {
                    var publicToken = 'abc123';
                    var metadata = {account_id: 'xyz456'};

                    options.onSuccess(publicToken, metadata);
                  }, 1);
                }
              };
            }
          };

          setTimeout(function () {
            callback(null, fakePlaid);
          }, 1);
        };

        USBankAccount.prototype.tokenize.call(this.context, {
          bankLogin: {
            displayName: 'Test Merchant'
          },
          mandateText: 'I authorize Braintree to charge my bank account.'
        }, function () {
          expect(analytics.sendEvent).to.be.calledWith(this.fakeClient, 'usbankaccount.banklogin.tokenization.failed');

          done();
        }.bind(this));
      });
    });

    it('errors when tokenize fails with 401 status code', function (done) {
      var originalError = new Error('Something bad happnened');

      this.context._loadPlaid = function (callback) {
        var fakePlaid = {
          create: function (options) {
            return {
              open: function () {
                setTimeout(function () {
                  var publicToken = 'abc123';
                  var metadata = {account_id: 'xyz456'};

                  options.onSuccess(publicToken, metadata);
                }, 1);
              }
            };
          }
        };

        setTimeout(function () {
          callback(null, fakePlaid);
        }, 1);
      };
      this.fakeClient.request.yieldsAsync(originalError, null, 401);

      USBankAccount.prototype.tokenize.call(this.context, {
        bankLogin: {
          displayName: 'Test Merchant'
        },
        mandateText: 'I authorize Braintree to charge my bank account.'
      }, function (err, tokenizedPayload) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('MERCHANT');
        expect(err.code).to.equal('BRAINTREE_API_ACCESS_RESTRICTED');
        expect(err.message).to.equal('Your access is restricted and cannot use this part of the Braintree API.');
        expect(err.details.originalError).to.equal(originalError);

        expect(tokenizedPayload).not.to.exist;

        done();
      });
    });

    it('errors when tokenize fails with 4xx status code', function (done) {
      var originalError = new Error('Something bad happnened');

      this.context._loadPlaid = function (callback) {
        var fakePlaid = {
          create: function (options) {
            return {
              open: function () {
                setTimeout(function () {
                  var publicToken = 'abc123';
                  var metadata = {account_id: 'xyz456'};

                  options.onSuccess(publicToken, metadata);
                }, 1);
              }
            };
          }
        };

        setTimeout(function () {
          callback(null, fakePlaid);
        }, 1);
      };
      this.fakeClient.request.yieldsAsync(originalError, null, 404);

      USBankAccount.prototype.tokenize.call(this.context, {
        bankLogin: {
          displayName: 'Test Merchant'
        },
        mandateText: 'I authorize Braintree to charge my bank account.'
      }, function (err, tokenizedPayload) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('CUSTOMER');
        expect(err.code).to.equal('US_BANK_ACCOUNT_FAILED_TOKENIZATION');
        expect(err.message).to.equal('The supplied data failed tokenization.');
        expect(err.details.originalError).to.equal(originalError);

        expect(tokenizedPayload).not.to.exist;

        done();
      });
    });

    it('errors when tokenize fails with 5xx status code', function (done) {
      var originalError = new Error('Something bad happnened');

      this.context._loadPlaid = function (callback) {
        var fakePlaid = {
          create: function (options) {
            return {
              open: function () {
                setTimeout(function () {
                  var publicToken = 'abc123';
                  var metadata = {account_id: 'xyz456'};

                  options.onSuccess(publicToken, metadata);
                }, 1);
              }
            };
          }
        };

        setTimeout(function () {
          callback(null, fakePlaid);
        }, 1);
      };
      this.fakeClient.request.yieldsAsync(originalError, null, 500);

      USBankAccount.prototype.tokenize.call(this.context, {
        bankLogin: {
          displayName: 'Test Merchant'
        },
        mandateText: 'I authorize Braintree to charge my bank account.'
      }, function (err, tokenizedPayload) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('NETWORK');
        expect(err.code).to.equal('US_BANK_ACCOUNT_TOKENIZATION_NETWORK_ERROR');
        expect(err.message).to.equal('A tokenization network error occurred.');

        expect(tokenizedPayload).not.to.exist;

        done();
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
      var fakePlaid = {open: function () {}};

      global.Plaid = fakePlaid;

      USBankAccount.prototype._loadPlaid.call(this.context, function (err, plaid) {
        expect(err).not.to.exist;
        expect(plaid).to.equal(fakePlaid);
        expect(document.body.appendChild).not.to.be.called;

        done();
      });
    });

    it("adds a Plaid Link script tag to the <body> if one wasn't already there", function () {
      var script;

      USBankAccount.prototype._loadPlaid.call(this.context, function () {});

      expect(document.body.appendChild).to.be.calledOnce;

      script = document.body.appendChild.args[0][0];
      expect(script.src).to.equal('https://cdn.plaid.com/link/v2/stable/link-initialize.js');
    });

    it("doesn't add a new Plaid Link script tag if one was already there and sets up listeners", function () {
      var fakeScript = document.createElement('script');

      this.sandbox.stub(fakeScript, 'addEventListener');
      this.sandbox.stub(document, 'querySelector').returns(fakeScript);

      USBankAccount.prototype._loadPlaid.call(this.context, function () {});

      expect(document.body.appendChild).not.to.be.called;
      expect(fakeScript.addEventListener).to.be.calledWith('error', this.sandbox.match.func);
      expect(fakeScript.addEventListener).to.be.calledWith('load', this.sandbox.match.func);
      expect(fakeScript.addEventListener).to.be.calledWith('readystatechange', this.sandbox.match.func);
    });

    it('calls callback with error when script load errors', function (done) {
      var script;
      var fakeBody = document.createElement('div');

      USBankAccount.prototype._loadPlaid.call(this.context, function (err, plaid) {
        expect(err).to.be.an.instanceof(BraintreeError);
        expect(err.type).to.equal('NETWORK');
        expect(err.code).to.equal('US_BANK_ACCOUNT_LOGIN_LOAD_FAILED');
        expect(err.message).to.equal('Bank login flow failed to load.');
        expect(plaid).not.to.exist;
        done();
      });

      script = document.body.appendChild.args[0][0];

      fakeBody.appendChild(script);

      script.dispatchEvent(new Event('error'));
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
      script.dispatchEvent(new Event('load'));
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
      script.dispatchEvent(new Event('readystatechange'));
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
      script.dispatchEvent(new Event('readystatechange'));
    });

    it('does not call callback on script readystatechange if readyState is not "complete" or "loaded"', function () {
      var script;
      var fakePlaid = this.fakePlaid;
      var callbackSpy = this.sandbox.spy();

      USBankAccount.prototype._loadPlaid.call(this.context, callbackSpy);

      script = document.body.appendChild.args[0][0];
      script.readyState = 'loading';

      global.Plaid = fakePlaid;
      script.dispatchEvent(new Event('readystatechange'));

      expect(callbackSpy).to.not.be.called;
    });

    it('does not call callback more than once', function () {
      var script;
      var fakePlaid = this.fakePlaid;
      var callbackSpy = this.sandbox.spy();

      USBankAccount.prototype._loadPlaid.call(this.context, callbackSpy);

      script = document.body.appendChild.args[0][0];

      global.Plaid = fakePlaid;

      script.dispatchEvent(new Event('load'));
      script.dispatchEvent(new Event('error'));

      expect(callbackSpy).to.be.calledOnce;
    });

    it('removes load callbacks on load', function () {
      var script;

      USBankAccount.prototype._loadPlaid.call(this.context, function () {});

      script = document.body.appendChild.args[0][0];

      this.sandbox.stub(script, 'removeEventListener');

      script.dispatchEvent(new Event('load'));

      expect(script.removeEventListener).to.be.calledWith('error', this.sandbox.match.func);
      expect(script.removeEventListener).to.be.calledWith('load', this.sandbox.match.func);
      expect(script.removeEventListener).to.be.calledWith('readystatechange', this.sandbox.match.func);
    });

    it('removes the <script> tag from the DOM when it errors', function (done) {
      var script;
      var fakeBody = document.createElement('div');

      USBankAccount.prototype._loadPlaid.call(this.context, function () {
        var i;
        var children = [];

        for (i = 0; i < fakeBody.children.length; i++) {
          children.push(fakeBody.children[i]);
        }

        expect(children).not.to.include(script);
        done();
      });

      script = document.body.appendChild.args[0][0];
      fakeBody.appendChild(script);

      script.dispatchEvent(new Event('error'));
    });

    it('removes load callbacks on readystatechange completion', function () {
      var script;

      USBankAccount.prototype._loadPlaid.call(this.context, function () {});

      script = document.body.appendChild.args[0][0];

      this.sandbox.stub(script, 'removeEventListener');

      script.readyState = 'complete';
      script.dispatchEvent(new Event('readystatechange'));

      expect(script.removeEventListener).to.be.calledWith('error', this.sandbox.match.func);
      expect(script.removeEventListener).to.be.calledWith('load', this.sandbox.match.func);
      expect(script.removeEventListener).to.be.calledWith('readystatechange', this.sandbox.match.func);
    });

    it('does not remove load callbacks if readystatechange is not "complete" or "loaded"', function () {
      var script;

      USBankAccount.prototype._loadPlaid.call(this.context, function () {});

      script = document.body.appendChild.args[0][0];

      this.sandbox.stub(script, 'removeEventListener');

      script.readyState = 'loading';
      script.dispatchEvent(new Event('readystatechange'));

      expect(script.removeEventListener).not.to.be.called;
    });
  });

  describe('teardown', function () {
    it('replaces all methods so error is thrown when methods are invoked', function (done) {
      var instance = new USBankAccount({client: this.fakeClient});

      instance.teardown(function () {
        methods(USBankAccount.prototype).forEach(function (method) {
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
