'use strict';

jest.mock('../../../src/lib/analytics');
jest.mock('../../../src/lib/create-assets-url');
jest.mock('../../../src/lib/create-deferred-client');

const analytics = require('../../../src/lib/analytics');
const createDeferredClient = require('../../../src/lib/create-deferred-client');
const PayPalCheckout = require('../../../src/paypal-checkout/paypal-checkout');
const BraintreeError = require('../../../src/lib/braintree-error');
const { fake } = require('../../helpers');
const methods = require('../../../src/lib/methods');

describe('PayPalCheckout', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = fake.configuration();

    testContext.configuration.gatewayConfiguration.paypalEnabled = true;
    testContext.configuration.gatewayConfiguration.paypal.environmentNoNetwork = false;
    testContext.client = {
      request: jest.fn().mockResolvedValue({
        paymentResource: {
          paymentToken: 'token',
          redirectUrl: 'https://example.com?foo=bar&EC-token&foo2=bar2'
        },
        agreementSetup: { tokenId: 'id' }
      }),
      getConfiguration: jest.fn().mockReturnValue(testContext.configuration)
    };

    jest.spyOn(createDeferredClient, 'create').mockResolvedValue(testContext.client);

    testContext.paypalCheckout = new PayPalCheckout({});

    return testContext.paypalCheckout._initialize({
      client: testContext.client
    });
  });

  describe('_initialize', () => {
    beforeEach(() => {
      testContext.options = {
        client: testContext.client
      };

      jest.spyOn(createDeferredClient, 'create').mockResolvedValue(testContext.client);
    });

    it('sends an analytics event on component creation', () => {
      const instance = new PayPalCheckout({});

      return instance._initialize({
        client: testContext.client
      }).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.client, 'paypal-checkout.initialized');
      });
    });

    it('errors out if paypal is not enabled for the merchant', () => {
      const instance = new PayPalCheckout({});

      testContext.configuration.gatewayConfiguration.paypalEnabled = false;

      return instance._initialize({
        client: testContext.client
      }).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('PAYPAL_NOT_ENABLED');
        expect(err.message).toBe('PayPal is not enabled for this merchant.');
      });
    });

    it('ignores PayPal enabled check if merchantAccountId is passed in', () => {
      const instance = new PayPalCheckout({
        merchantAccountId: 'id'
      });

      testContext.configuration.gatewayConfiguration.paypalEnabled = false;

      return instance._initialize({
        client: testContext.client
      }).then(pp => {
        expect(pp).toBeInstanceOf(PayPalCheckout);
      });
    });

    it('errors out if paypal account is not linked in sandbox', () => {
      const instance = new PayPalCheckout({});

      testContext.configuration.gatewayConfiguration.paypal.environmentNoNetwork = true;

      return instance._initialize({
        client: testContext.client
      }).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('PAYPAL_SANDBOX_ACCOUNT_NOT_LINKED');
        expect(err.message).toBe(
          'A linked PayPal Sandbox account is required to use PayPal Checkout in Sandbox. See https://developers.braintreepayments.com/guides/paypal/testing-go-live/#linked-paypal-testing for details on linking your PayPal sandbox with Braintree.'
        );
      });
    });

    it('ignores linked sandbox check if merchantAccountId is passed in', () => {
      const instance = new PayPalCheckout({
        merchantAccountId: 'id'
      });

      testContext.configuration.gatewayConfiguration.paypal.environmentNoNetwork = true;

      return instance._initialize({
        client: testContext.client
      }).then(pp => {
        expect(pp).toBeInstanceOf(PayPalCheckout);
      });
    });

    it('resolves with paypalCheckoutInstance', () => {
      const instance = new PayPalCheckout({});

      return instance._initialize({ client: testContext.client }).then(pp => {
        expect(pp).toBeInstanceOf(PayPalCheckout);
      });
    });
  });

  describe('createPayment', () => {
    it.each([
      ['missing', null],
      ['incomplete', {}],
      ['invalid', { flow: 'bar' }]
    ])('rejects with error if options are %s', (s, options) =>
      testContext.paypalCheckout.createPayment(options).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('PAYPAL_FLOW_OPTION_REQUIRED');
        expect(err.message).toBe('PayPal flow property is invalid or missing.');
      })
    );

    it('rejects with a network BraintreeError on gateway 422 errors', () => {
      const gateway422Error = new BraintreeError({
        type: BraintreeError.types.NETWORK,
        code: 'CLIENT_REQUEST_ERROR',
        message: 'There was a problem with your request.',
        details: { httpStatus: 422 }
      });

      testContext.client.request.mockRejectedValue(gateway422Error);

      return testContext.paypalCheckout.createPayment({ flow: 'vault' }).catch(({ code, details, message, type }) => {
        expect(type).toBe(BraintreeError.types.MERCHANT);
        expect(code).toBe('PAYPAL_INVALID_PAYMENT_OPTION');
        expect(message).toBe('PayPal payment options are invalid.');
        expect(details).toEqual({
          originalError: gateway422Error
        });
      });
    });

    it('rejects with a network BraintreeError on other gateway errors', () => {
      const gatewayError = new Error('There was a problem with your request.');

      gatewayError.details = { httpStatus: 400 };

      testContext.client.request.mockRejectedValue(gatewayError);

      return testContext.paypalCheckout.createPayment({ flow: 'vault' }).catch(({ code, details, message, type }) => {
        expect(type).toBe(BraintreeError.types.NETWORK);
        expect(code).toBe('PAYPAL_FLOW_FAILED');
        expect(message).toBe('Could not initialize PayPal flow.');
        expect(details).toEqual({
          originalError: gatewayError
        });
      });
    });

    it('rejects with the Braintree error when client request returns a Braintree error', () => {
      const gatewayError = new BraintreeError({
        type: BraintreeError.types.NETWORK,
        code: 'CLIENT_REQUEST_ERROR',
        message: 'There was a problem with your request.',
        details: { httpStatus: 400 }
      });

      testContext.client.request.mockRejectedValue(gatewayError);

      return testContext.paypalCheckout.createPayment({ flow: 'vault' }).catch(({ code, message, type }) => {
        expect(type).toBe(BraintreeError.types.NETWORK);
        expect(code).toBe('CLIENT_REQUEST_ERROR');
        expect(message).toBe('There was a problem with your request.');
      });
    });

    describe('Hermes payment resource', () => {
      beforeEach(() => {
        testContext.options = {
          flow: 'vault'
        };
        testContext.client.request.mockResolvedValue({
          agreementSetup: {
            tokenId: 'stub'
          },
          paymentResource: {
            paymentToken: 'stub',
            redirectUrl: 'https://example.com?foo=bar&EC-token&foo2=bar2'
          }
        });
      });

      it('contains the PayPal experience profile', () => {
        testContext.options.displayName = 'My Merchant';
        testContext.options.locale = 'th_TH';
        testContext.options.enableShippingAddress = true;
        testContext.options.shippingAddressEditable = false;

        return testContext.paypalCheckout.createPayment(testContext.options).then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              experienceProfile: {
                brandName: 'My Merchant',
                localeCode: 'th_TH',
                noShipping: 'false',
                addressOverride: true
              }
            }
          });
        });
      });

      it('contains the merchant account ID if set', () => {
        testContext.paypalCheckoutWithMerchantAccountId = new PayPalCheckout({
          merchantAccountId: 'alt-merchant-account-id'
        });

        return testContext.paypalCheckoutWithMerchantAccountId._initialize({
          client: testContext.client
        }).then(pp =>
          pp.createPayment(testContext.options)).then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              merchantAccountId: 'alt-merchant-account-id'
            }
          });
        });
      });

      it('uses configuration\'s display name for PayPal brand name by default', () =>
        testContext.paypalCheckout.createPayment(testContext.options).then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              experienceProfile: {
                brandName: 'Name'
              }
            }
          });
        }));

      it('contains landing page type when specified', () => {
        testContext.options.landingPageType = 'foobar';

        return testContext.paypalCheckout.createPayment(testContext.options).then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              experienceProfile: {
                landingPageType: 'foobar'
              }
            }
          });
        });
      });

      it('does not contain landing page type when unspecified', () =>
        testContext.paypalCheckout.createPayment(testContext.options).then(() => {
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: {
              experienceProfile: expect.not.objectContaining({ landingPageType: expect.anything() })
            }
          });
        }));

      describe('when using checkout flow', () => {
        beforeEach(() => {
          testContext.options.flow = 'checkout';
          testContext.options.amount = 1;
          testContext.options.currency = 'USD';
        });

        it('uses the correct endpoint', () =>
          testContext.paypalCheckout.createPayment(testContext.options).then(() => {
            expect(testContext.client.request).toHaveBeenCalledWith(expect.objectContaining({
              endpoint: 'paypal_hermes/create_payment_resource',
              method: 'post'
            }));
          }));

        it('contains payment amount and currency', () =>
          testContext.paypalCheckout.createPayment(testContext.options).then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                amount: 1,
                currencyIsoCode: 'USD'
              }
            });
          }));

        it('contains shippingOptions when specified', () => {
          testContext.options.shippingOptions = [
            {
              id: 'aus-domain',
              label: 'Austin Domain Store',
              amount: {
                currency: 'USD',
                value: '1.00'
              },
              type: 'PICKUP',
              selected: true
            },
            {
              id: 'aus-arboretum',
              label: 'austin Arboretum Store',
              amount: {
                currency: 'USD',
                value: '5.00'
              },
              type: 'PICKUP',
              selected: false
            }
          ];

          return testContext.paypalCheckout.createPayment(testContext.options).then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                amount: 1,
                currencyIsoCode: 'USD',
                shippingOptions: [
                  {
                    id: 'aus-domain',
                    label: 'Austin Domain Store',
                    amount: {
                      currency: 'USD',
                      value: '1.00'
                    },
                    type: 'PICKUP',
                    selected: true
                  },
                  {
                    id: 'aus-arboretum',
                    label: 'austin Arboretum Store',
                    amount: {
                      currency: 'USD',
                      value: '5.00'
                    },
                    type: 'PICKUP',
                    selected: false
                  }
                ]
              }
            });
          });
        });

        it('contains vaultInitiatedCheckoutPaymentMethodToken when specified', () => {
          testContext.options.vaultInitiatedCheckoutPaymentMethodToken = 'VICPMT-XXXXXXXXXX';

          return testContext.paypalCheckout.createPayment(testContext.options).then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                vaultInitiatedCheckoutPaymentMethodToken: 'VICPMT-XXXXXXXXXX',
                amount: 1,
                currencyIsoCode: 'USD'
              }
            });
          });
        });

        it('contains other options when specified', () => {
          testContext.options.intent = 'sale';
          testContext.options.shippingAddressOverride = {
            line1: '123 Townsend St',
            line2: 'Fl 6',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94107',
            countryCode: 'USA',
            phone: '111-1111',
            recipientName: 'Joe Bloggs'
          };
          testContext.options.lineItems = [
            {
              quantity: '1',
              unitAmount: '1',
              unitTaxAmount: '1',
              name: 'Shirt',
              description: 'cotton',
              kind: 'debit',
              productCode: '123xyz',
              url: 'example.com'
            }
          ];

          return testContext.paypalCheckout.createPayment(testContext.options).then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                intent: 'sale',
                line1: '123 Townsend St',
                line2: 'Fl 6',
                city: 'San Francisco',
                state: 'CA',
                postalCode: '94107',
                countryCode: 'USA',
                phone: '111-1111',
                recipientName: 'Joe Bloggs',
                lineItems: [
                  {
                    quantity: '1',
                    unitAmount: '1',
                    unitTaxAmount: '1',
                    name: 'Shirt',
                    description: 'cotton',
                    kind: 'debit',
                    productCode: '123xyz',
                    url: 'example.com'
                  }
                ]
              }
            });
          });
        });
      });

      describe('when using vault flow', () => {
        beforeEach(() => {
          testContext.options.flow = 'vault';
        });

        it('uses the correct endpoint', () =>
          testContext.paypalCheckout.createPayment(testContext.options).then(() => {
            expect(testContext.client.request).toHaveBeenCalledWith(expect.objectContaining({
              endpoint: 'paypal_hermes/setup_billing_agreement',
              method: 'post'
            }));
          }));

        it('contains other options when specified', () => {
          testContext.options.billingAgreementDescription = 'Foo Bar';
          testContext.options.shippingAddressOverride = {
            line1: '123 Townsend St',
            line2: 'Fl 6',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94107',
            countryCode: 'USA',
            phone: '111-1111',
            recipientName: 'Joe Bloggs'
          };

          return testContext.paypalCheckout.createPayment(testContext.options).then(() => {
            expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
              data: {
                description: 'Foo Bar',
                shippingAddress: testContext.options.shippingAddressOverride
              }
            });
          });
        });
      });
    });

    it('sends analytics event when createPayment is called', () => {
      analytics.sendEvent.mockClear();

      testContext.paypalCheckout.createPayment({ flow: 'vault' });

      expect(analytics.sendEvent).toHaveBeenCalledTimes(1);
      expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.paypalCheckout._clientPromise, 'paypal-checkout.createPayment');
    });

    describe.each([
      ['vault'], ['checkout']
    ])('using %s flow', (flow) => {
      it(`resolves with a ${flow === 'vault' ? 'billingToken' : 'paymentID'} for ${flow} flow`, () => {
        let requestPayload, expected;

        if (flow === 'vault') {
          requestPayload = {
            agreementSetup: {
              tokenId: 'BA-XXXXXXXXXX'
            }
          };
          expected = 'BA-XXXXXXXXXX';
        } else {
          requestPayload = {
            paymentResource: {
              paymentToken: 'PAY-XXXXXXXXXX',
              redirectUrl: 'https://example.com?foo=bar&EC-token&foo2=bar2'
            }
          };
          expected = 'EC-token';
        }

        jest.spyOn(testContext.client, 'request').mockResolvedValue(requestPayload);

        return testContext.paypalCheckout.createPayment({ flow }).then(payload => {
          expect(payload).toBe(expected);
        });
      });

      it('requests appropriate url for flow', () => {
        const url = flow === 'vault' ? 'setup_billing_agreement' : 'create_payment_resource';

        return testContext.paypalCheckout.createPayment({ flow }).then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            method: 'post',
            endpoint: `paypal_hermes/${url}`
          });
        });
      });

      it(`sends analytics event when offerCredit is true and using ${flow} flow`, () => {
        testContext.paypalCheckout.createPayment({ flow, offerCredit: true });

        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.paypalCheckout._clientPromise, 'paypal-checkout.credit.offered');
      });

      it(`does not send analytics event when offerCredit is false and using ${flow} flow`, () => {
        testContext.paypalCheckout.createPayment({ flow });

        expect(analytics.sendEvent).not.toHaveBeenCalledWith(testContext.client, 'paypal-checkout.credit.offered');
      });

      it(`sets offerPaypalCredit to false if offerCredit is unspecified with ${flow} flow`, () =>
        testContext.paypalCheckout.createPayment({ flow }).then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0].data.offerPaypalCredit).toBe(false);
        }));

      it(`sets offerPaypalCredit to true if offerCredit is true with ${flow} flow`, () =>
        testContext.paypalCheckout.createPayment({ flow, offerCredit: true }).then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0].data.offerPaypalCredit).toBe(true);
        }));

      it('sets offerPaypalCredit to false if offerCredit is not a boolean true', () =>
        testContext.paypalCheckout.createPayment({ flow, offerCredit: 'true' }).then(() => {
          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0].data.offerPaypalCredit).toBe(false);
        }));

      it(`assigns shipping address for ${flow} flow`, () => {
        const shippingAddressOverride = {
          line1: 'line1',
          line2: 'line2',
          city: 'city',
          state: 'state',
          countryCode: 'countryCode',
          postalCode: 'postal'
        };

        return testContext.paypalCheckout.createPayment({ flow, shippingAddressOverride }).then(() => {
          let expected;

          if (flow === 'vault') {
            expected = { shippingAddress: shippingAddressOverride };
          } else {
            expected = shippingAddressOverride;
          }

          expect(testContext.client.request).toHaveBeenCalledTimes(1);
          expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
            data: { ...expected }
          });
        });
      });
    });

    it('formats request', () =>
      testContext.paypalCheckout.createPayment({
        flow: 'checkout',
        locale: 'FOO',
        amount: '10.00',
        enableShippingAddress: true,
        shippingAddressEditable: false
      }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            amount: '10.00',
            returnUrl: 'https://www.paypal.com/checkoutnow/error',
            cancelUrl: 'https://www.paypal.com/checkoutnow/error',
            experienceProfile: {
              brandName: 'Name',
              localeCode: 'FOO',
              noShipping: 'false',
              addressOverride: true
            }
          }
        });
      }));

    it('allows override of displayName', () =>
      testContext.paypalCheckout.createPayment({
        flow: 'checkout',
        displayName: 'OVERRIDE NAME'
      }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            experienceProfile: {
              brandName: 'OVERRIDE NAME'
            }
          }
        });
      }));

    it.each(['authorize', 'order', 'sale'])('assigns intent %p for one-time checkout', intent =>
      testContext.paypalCheckout.createPayment({
        flow: 'checkout',
        intent: intent
      }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            intent: intent
          }
        });
      }));

    it('assigns capture intent to sale when making request', () =>
      testContext.paypalCheckout.createPayment({
        flow: 'checkout',
        intent: 'capture'
      }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            intent: 'sale'
          }
        });
      }));

    it('does not assign intent for one-time checkout if not provided', () =>
      testContext.paypalCheckout.createPayment({ flow: 'checkout' }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0].data).not.toHaveProperty('intent');
      }));

    it('sets addressOverride to true if shippingAddressEditable is false', () =>
      testContext.paypalCheckout.createPayment({
        flow: 'vault',
        shippingAddressOverride: {
          line1: 'line1',
          line2: 'line2',
          city: 'city',
          state: 'state',
          countryCode: 'countryCode',
          postalCode: 'postal'
        },
        shippingAddressEditable: false
      }).then(() => {
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            experienceProfile: {
              addressOverride: true
            }
          }
        });
      }));

    it('sets addressOverride to false if shippingAddressEditable is true', () =>
      testContext.paypalCheckout.createPayment({
        flow: 'vault',
        shippingAddressOverride: {
          line1: 'line1',
          line2: 'line2',
          city: 'city',
          state: 'state',
          countryCode: 'countryCode',
          postalCode: 'postal'
        },
        shippingAddressEditable: true
      }).then(() => {
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            experienceProfile: {
              addressOverride: false
            }
          }
        });
      }));

    it('assigns billing agreement description for billing agreements', () =>
      testContext.paypalCheckout.createPayment({
        flow: 'vault',
        billingAgreementDescription: 'Fancy Schmancy Description'
      }).then(() => {
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            description: 'Fancy Schmancy Description'
          }
        });
      }));

    it('does not assign billing agreement description for one-time checkout', () => {
      let arg;

      return testContext.paypalCheckout.createPayment({
        flow: 'checkout',
        billingAgreementDescription: 'Fancy Schmancy Description'
      }).then(() => {
        arg = testContext.client.request.mock.calls[0][0];

        expect(arg.data).not.toHaveProperty('description');
      });
    });
  });

  describe('tokenizePayment', () => {
    it('rejects with a BraintreeError if a non-Braintree error comes back from the client', () => {
      const error = new Error('Error');

      testContext.client.request.mockRejectedValue(error);

      return testContext.paypalCheckout.tokenizePayment({}).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe('NETWORK');
        expect(err.code).toBe('PAYPAL_ACCOUNT_TOKENIZATION_FAILED');
        expect(err.message).toBe('Could not tokenize user\'s PayPal account.');
        expect(err.details.originalError).toBe(error);
      });
    });

    it('rejects with the error if the client error is a BraintreeError', () => {
      const btError = new BraintreeError({
        type: 'MERCHANT',
        code: 'BT_CODE',
        message: 'message.'
      });

      testContext.client.request.mockRejectedValue(btError);

      return testContext.paypalCheckout.tokenizePayment({}).catch(err => {
        expect(err).toBe(btError);
      });
    });

    it('resolves with the back account data in response', () => {
      testContext.client.request.mockResolvedValue({
        paypalAccounts: [{ nonce: 'nonce', type: 'PayPal' }]
      });

      return testContext.paypalCheckout.tokenizePayment({}).then(({ details, nonce, type }) => {
        expect(nonce).toBe('nonce');
        expect(type).toBe('PayPal');
        expect(details).toEqual({});
      });
    });

    it('resolves with account details if available', () => {
      const accountDetails = {
        payerInfo: { name: 'foo' }
      };

      testContext.client.request.mockResolvedValue({
        paypalAccounts: [{
          nonce: 'nonce',
          type: 'PayPal',
          details: accountDetails
        }]
      });

      return testContext.paypalCheckout.tokenizePayment({}).then(({ details }) => {
        expect(details).toBe(accountDetails.payerInfo);
      });
    });

    it('resolves with creditFinancingOffered if available', () => {
      const accountDetails = {
        creditFinancingOffered: { foo: 'bar' }
      };

      testContext.client.request.mockResolvedValue({
        paypalAccounts: [{
          nonce: 'nonce',
          type: 'PayPal',
          details: accountDetails
        }]
      });

      return testContext.paypalCheckout.tokenizePayment({}).then(({ creditFinancingOffered }) => {
        expect(creditFinancingOffered).toBe(accountDetails.creditFinancingOffered);
      });
    });

    it('passes along intent property', () => {
      const accountDetails = {
        creditFinancingOffered: { foo: 'bar' }
      };

      testContext.client.request.mockResolvedValue({
        paypalAccounts: [{
          nonce: 'nonce',
          type: 'PayPal',
          details: accountDetails
        }]
      });

      return testContext.paypalCheckout.tokenizePayment({
        intent: 'sale'
      }).then(() => {
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            paypalAccount: {
              intent: 'sale'
            }
          }
        });
      });
    });

    it('passes along merchantAccountId without billing token', () => {
      const accountDetails = {
        creditFinancingOffered: { foo: 'bar' }
      };

      testContext.paypalCheckoutWithMerchantAccountId = new PayPalCheckout({
        merchantAccountId: 'alt-merchant-account-id'
      });

      testContext.client.request.mockResolvedValue({
        paypalAccounts: [{
          nonce: 'nonce',
          type: 'PayPal',
          details: accountDetails
        }]
      });

      return testContext.paypalCheckoutWithMerchantAccountId._initialize({
        client: testContext.client
      }).then(pp =>
        pp.tokenizePayment({})).then(() => {
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            merchantAccountId: 'alt-merchant-account-id'
          }
        });
      });
    });

    it('passes along merchantAccountId with billing token', () => {
      const accountDetails = {
        creditFinancingOffered: { foo: 'bar' }
      };

      testContext.paypalCheckoutWithMerchantAccountId = new PayPalCheckout({
        merchantAccountId: 'alt-merchant-account-id'
      });

      testContext.client.request.mockResolvedValue({
        paypalAccounts: [{
          nonce: 'nonce',
          type: 'PayPal',
          details: accountDetails
        }]
      });

      return testContext.paypalCheckoutWithMerchantAccountId._initialize({
        client: testContext.client
      }).then(pp =>
        pp.tokenizePayment({
          billingToken: 'token'
        })).then(() => {
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            merchantAccountId: 'alt-merchant-account-id'
          }
        });
      });
    });

    it('does not resolve with creditFinancingOffered when not available', () => {
      testContext.client.request.mockResolvedValue({
        paypalAccounts: [{
          nonce: 'nonce',
          type: 'PayPal',
          details: {}
        }]
      });

      return testContext.paypalCheckout.tokenizePayment({}).then(({ creditFinancingOffered }) => {
        expect(creditFinancingOffered).toBeFalsy();
      });
    });

    it('sends a tokenization event when tokenization starts', () =>
      testContext.paypalCheckout.tokenizePayment({ billingToken: 'token' }).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.paypalCheckout._clientPromise, 'paypal-checkout.tokenization.started');
      }));

    it('sends a request to payment_methods/paypal_accounts', () =>
      testContext.paypalCheckout.tokenizePayment({ billingToken: 'token' }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          endpoint: 'payment_methods/paypal_accounts',
          method: 'post'
        });
      }));

    it('calls analytics event when tokenization succeeds', () => {
      const client = testContext.client;

      client.request.mockResolvedValue({});

      return testContext.paypalCheckout.tokenizePayment({}).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.paypalCheckout._clientPromise, 'paypal-checkout.tokenization.success');
      });
    });

    it('calls analytics event when credit offer is accepted', () => {
      const client = testContext.client;

      client.request.mockResolvedValue({
        paypalAccounts: [{
          nonce: 'nonce',
          type: 'PayPal',
          details: {
            creditFinancingOffered: {}
          }
        }]
      });

      return testContext.paypalCheckout.tokenizePayment({}).then(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.paypalCheckout._clientPromise, 'paypal-checkout.credit.accepted');
      });
    });

    it('passes the BA token as the correlationId when present', () =>
      testContext.paypalCheckout.tokenizePayment({ billingToken: 'BA-1234' }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            paypalAccount: {
              correlationId: 'BA-1234'
            }
          }
        });
      }));

    it('passes the EC token as the correlationId when present', () =>
      testContext.paypalCheckout.tokenizePayment({ paymentToken: 'EC-1234' }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            paypalAccount: {
              correlationId: 'EC-1234'
            }
          }
        });
      }));

    it('validates if flow is vault and auth is not tokenization key', () => {
      testContext.configuration.authorizationType = 'CLIENT_TOKEN';

      return testContext.paypalCheckout.tokenizePayment({ billingToken: 'token' }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            paypalAccount: {
              options: {
                validate: true
              }
            }
          }
        });
      });
    });

    it('does not validate if flow is vault and auth is tokenization key', () => {
      testContext.configuration.authorizationType = 'TOKENIZATION_KEY';

      return testContext.paypalCheckout.tokenizePayment({ billingToken: 'token' }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            paypalAccount: {
              options: {
                validate: false
              }
            }
          }
        });
      });
    });

    it('sends along checkout params', () =>
      testContext.paypalCheckout.tokenizePayment({
        payerID: 'payer id',
        paymentID: 'payment id'
      }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            paypalAccount: {
              paymentToken: 'payment id',
              payerId: 'payer id'
            }
          }
        });
      }));

    it('passes along unvettedMerchant param as true', () => {
      testContext.configuration.gatewayConfiguration.paypal.unvettedMerchant = true;

      return testContext.paypalCheckout.tokenizePayment({
        payerID: 'payer id',
        paymentID: 'payment id'
      }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            paypalAccount: {
              unilateral: true
            }
          }
        });
      });
    });

    it('passes along unvettedMerchant param as false', () => {
      testContext.configuration.gatewayConfiguration.paypal.unvettedMerchant = false;

      return testContext.paypalCheckout.tokenizePayment({
        payerID: 'payer id',
        paymentID: 'payment id'
      }).then(() => {
        expect(testContext.client.request).toHaveBeenCalledTimes(1);
        expect(testContext.client.request.mock.calls[0][0]).toMatchObject({
          data: {
            paypalAccount: {
              unilateral: false
            }
          }
        });
      });
    });

    it('does not send along billing token if no token is provided', () =>
      testContext.paypalCheckout.tokenizePayment({}).then(() => {
        const arg = testContext.client.request.mock.calls[0][0];

        expect(arg.data.paypalAccount).not.toHaveProperty('billingAgreementToken');
      }));

    it('sends a tokenization failure event when request fails', () => {
      const client = testContext.client;

      client.request.mockRejectedValue(new Error('Error'));

      return testContext.paypalCheckout.tokenizePayment({}).catch(() => {
        expect(analytics.sendEvent).toHaveBeenCalledWith(testContext.paypalCheckout._clientPromise, 'paypal-checkout.tokenization.failed');
      });
    });
  });

  describe('teardown', () => {
    it('replaces all methods so error is thrown when methods are invoked', done => {
      const instance = testContext.paypalCheckout;

      return instance.teardown().then(() => {
        methods(PayPalCheckout.prototype).forEach(method => {
          try {
            instance[method]();
          } catch (err) {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.type).toBe(BraintreeError.types.MERCHANT);
            expect(err.code).toBe('METHOD_CALLED_AFTER_TEARDOWN');
            expect(err.message).toBe(`${method} cannot be called after teardown.`);
          }
        });

        done();
      });
    });
  });
});
