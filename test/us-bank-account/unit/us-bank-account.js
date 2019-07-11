'use strict';
/* eslint-disable camelcase */

var Promise = require('../../../src/lib/promise');
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
      request: this.sandbox.stub().resolves()
    };
    this.fakePlaid = {};

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
    it('returns a promise', function () {
      var promise;

      this.fakeClient.request.resolves({
        data: {
          tokenizeUsBankAccount: {
            paymentMethod: {
              id: 'fake-nonce-123',
              details: {
                last4: '1234'
              }
            }
          }
        },
        meta: {
          braintree_request_id: '3a36188d-492a-4b3f-8379-de16f99c3c7b'
        }
      });

      promise = USBankAccount.prototype.tokenize.call(this.context, {
        bankDetails: {
          routingNumber: '1234567',
          accountNumber: '0001234',
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
      });

      expect(promise).to.be.an.instanceof(Promise);
    });

    describe('with bad arguments', function () {
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
            accountNumber: '0001234',
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
            tokenizeUsBankAccount: {
              paymentMethod: {
                id: 'fake-nonce-123',
                details: {
                  last4: '1234'
                }
              }
            }
          },
          meta: {
            braintree_request_id: '3a36188d-492a-4b3f-8379-de16f99c3c7b'
          }
        };
      });

      it('tokenizes a checking account', function (done) {
        this.fakeClient.request.resolves(this.fakeUsBankAccountResponse);

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0001234',
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
            api: 'graphQLApi',
            data: {
              query: this.sandbox.match.string,
              variables: {
                input: {
                  usBankAccount: {
                    achMandate: 'I authorize Braintree to charge my bank account on behalf of Test Merchant.',
                    routingNumber: '1234567',
                    accountNumber: '0001234',
                    accountType: 'CHECKING',
                    individualOwner: {
                      firstName: 'First',
                      lastName: 'Last'
                    },
                    billingAddress: {
                      streetAddress: '123 Townsend St',
                      extendedAddress: 'FL 6',
                      city: 'San Francisco',
                      state: 'CA',
                      zipCode: '94107'
                    }
                  }
                }
              }
            }
          });

          expect(tokenizedPayload.nonce).to.equal('fake-nonce-123');
          expect(tokenizedPayload.description).to.equal('US bank account ending in - 1234');
          expect(tokenizedPayload.type).to.equal('us_bank_account');
          done();
        }.bind(this));
      });

      it('sends a "success" analytics event when tokenizing bank details successfully', function (done) {
        this.fakeClient.request.resolves(this.fakeUsBankAccountResponse);

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0001234',
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
        this.fakeClient.request.rejects(new Error('Something bad happnened'));

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0001234',
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
            accountNumber: '0001234',
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

      it('errors when tokenize fails with 4xx status code', function (done) {
        var originalError = new Error('Something bad happnened');

        originalError.details = {httpStatus: 404};

        this.fakeClient.request.rejects(originalError);

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0001234',
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

        originalError.details = {httpStatus: 500};

        this.fakeClient.request.rejects(originalError);

        USBankAccount.prototype.tokenize.call(this.context, {
          bankDetails: {
            routingNumber: '1234567',
            accountNumber: '0001234',
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
            tokenizeUsBankLogin: {
              paymentMethod: {
                id: 'fake-nonce-123',
                details: {
                  last4: '1234'
                }
              }
            }
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
        this.fakeClient.request.resolves(this.fakeGatewayResponse);

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              expect(options.env).to.equal('sandbox');
              expect(options.clientName).to.equal('Test Merchant');
              expect(options.key).to.equal('abc123');
              expect(options.product).to.equal('auth');
              expect(options.selectAccount).to.equal(true);
              expect(options.onExit).to.be.a('function');
              expect(options.onSuccess).to.be.a('function');

              return {
                open: function () {
                  setTimeout(function () {
                    var publicToken = 'abc123';
                    var metadata = {
                      account_id: 'xyz456',
                      account: {
                        subtype: 'checking'
                      }
                    };

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
            api: 'graphQLApi',
            data: {
              query: this.sandbox.match.string,
              variables: {
                input: {
                  usBankLogin: {
                    publicToken: 'abc123',
                    accountId: 'plaid_account_id',
                    achMandate: 'I authorize Braintree to charge my bank account.',
                    individualOwner: {
                      firstName: 'First',
                      lastName: 'Last'
                    },
                    billingAddress: {
                      streetAddress: '123 Townsend St',
                      extendedAddress: 'FL 6',
                      city: 'San Francisco',
                      state: 'CA',
                      zipCode: '94107'
                    }
                  }
                }
              }
            }
          }));

          expect(tokenizedPayload).to.deep.equal({
            nonce: 'fake-nonce-123',
            details: {},
            description: 'US bank account ending in - 1234',
            type: 'us_bank_account'
          });

          done();
        }.bind(this));
      });

      it('tokenizes bank login for business accounts', function (done) {
        this.fakeClient.request.resolves(this.fakeGatewayResponse);

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              expect(options.env).to.equal('sandbox');
              expect(options.clientName).to.equal('Test Merchant');
              expect(options.key).to.equal('abc123');
              expect(options.product).to.equal('auth');
              expect(options.selectAccount).to.equal(true);
              expect(options.onExit).to.be.a('function');
              expect(options.onSuccess).to.be.a('function');

              return {
                open: function () {
                  setTimeout(function () {
                    var publicToken = 'abc123';
                    var metadata = {
                      account_id: 'xyz456',
                      account: {
                        subtype: 'checking'
                      }
                    };

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
            api: 'graphQLApi',
            data: {
              query: this.sandbox.match.string,
              variables: {
                input: {
                  usBankLogin: {
                    publicToken: 'abc123',
                    accountId: 'plaid_account_id',
                    achMandate: 'I authorize Braintree to charge my bank account.',
                    businessOwner: {
                      businessName: 'Acme Inc'
                    },
                    billingAddress: {
                      streetAddress: '123 Townsend St',
                      extendedAddress: 'FL 6',
                      city: 'San Francisco',
                      state: 'CA',
                      zipCode: '94107'
                    }
                  }
                }
              }
            }
          }));

          expect(tokenizedPayload).to.deep.equal({
            nonce: 'fake-nonce-123',
            details: {},
            description: 'US bank account ending in - 1234',
            type: 'us_bank_account'
          });

          done();
        }.bind(this));
      });

      it('uses plaid_account_id for accountId when not in production', function (done) {
        this.fakeClient.request.resolves(this.fakeGatewayResponse);

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              return {
                open: function () {
                  setTimeout(function () {
                    var publicToken = 'abc123';
                    var metadata = {
                      account_id: 'xyz456',
                      account: {
                        subtype: 'checking'
                      }
                    };

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
        }, function (err) {
          expect(err).not.to.exist;

          expect(this.fakeClient.request).to.be.calledOnce;
          expect(this.fakeClient.request).to.be.calledWith(this.sandbox.match({
            data: {
              query: this.sandbox.match.string,
              variables: {
                input: {
                  usBankLogin: this.sandbox.match({
                    accountId: 'plaid_account_id'
                  })
                }
              }
            }
          }));

          done();
        }.bind(this));
      });

      it('uses provided account id for accountId when in production', function (done) {
        this.configuration.gatewayConfiguration.environment = 'production';
        this.fakeClient.request.resolves(this.fakeGatewayResponse);

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              return {
                open: function () {
                  setTimeout(function () {
                    var publicToken = 'abc123';
                    var metadata = {
                      account_id: 'xyz456',
                      account: {
                        subtype: 'checking'
                      }
                    };

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
        }, function (err) {
          expect(err).not.to.exist;

          expect(this.fakeClient.request).to.be.calledOnce;
          expect(this.fakeClient.request).to.be.calledWith(this.sandbox.match({
            data: {
              query: this.sandbox.match.string,
              variables: {
                input: {
                  usBankLogin: this.sandbox.match({
                    accountId: 'xyz456'
                  })
                }
              }
            }
          }));

          done();
        }.bind(this));
      });

      it('sets Plaid environment to "sandbox" in Braintree sandbox', function (done) {
        this.configuration.gatewayConfiguration.environment = 'sandbox';

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              expect(options.env).to.equal('sandbox');

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
        this.fakeClient.request.resolves(this.fakeGatewayResponse);

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              return {
                open: function () {
                  setTimeout(function () {
                    var publicToken = 'abc123';
                    var metadata = {
                      account_id: 'xyz456',
                      account: {
                        subtype: 'checking'
                      }
                    };

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
        this.fakeClient.request.rejects(new Error('Something bad happened'));

        this.context._loadPlaid = function (callback) {
          var fakePlaid = {
            create: function (options) {
              return {
                open: function () {
                  setTimeout(function () {
                    var publicToken = 'abc123';
                    var metadata = {
                      account_id: 'xyz456',
                      account: {
                        subtype: 'checking'
                      }
                    };

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

    it('errors when tokenize fails with 4xx status code', function (done) {
      var originalError = new Error('Something bad happnened');

      originalError.details = {httpStatus: 404};
      this.context._loadPlaid = function (callback) {
        var fakePlaid = {
          create: function (options) {
            return {
              open: function () {
                setTimeout(function () {
                  var publicToken = 'abc123';
                  var metadata = {
                    account_id: 'xyz456',
                    account: {
                      subtype: 'checking'
                    }
                  };

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
      this.fakeClient.request.rejects(originalError);

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

      originalError.details = {httpStatus: 500};

      this.context._loadPlaid = function (callback) {
        var fakePlaid = {
          create: function (options) {
            return {
              open: function () {
                setTimeout(function () {
                  var publicToken = 'abc123';
                  var metadata = {
                    account_id: 'xyz456',
                    account: {
                      subtype: 'checking'
                    }
                  };

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
      this.fakeClient.request.rejects(originalError);

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
    it('returns a promise', function () {
      var instance = new USBankAccount({client: this.fakeClient});
      var promise = instance.teardown();

      expect(promise).to.be.an.instanceof(Promise);
    });

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
