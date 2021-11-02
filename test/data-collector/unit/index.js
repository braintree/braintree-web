'use strict';

jest.mock('../../../src/lib/basic-component-verification');
jest.mock('framebus');
jest.mock('../../../src/lib/create-assets-url');
jest.mock('../../../src/lib/create-deferred-client');

const basicComponentVerification = require('../../../src/lib/basic-component-verification');
const createDeferredClient = require('../../../src/lib/create-deferred-client');
const dataCollector = require('../../../src/data-collector');
const kount = require('../../../src/data-collector/kount');
const fraudnet = require('../../../src/data-collector/fraudnet');
const BraintreeError = require('../../../src/lib/braintree-error');
const methods = require('../../../src/lib/methods');
const { fake: { client: fakeClient, clientToken, configuration }, noop } = require('../../helpers');

describe('dataCollector', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = configuration();
    testContext.configuration.gatewayConfiguration.kount = { kountMerchantId: '12345' };
    testContext.client = fakeClient({
      configuration: testContext.configuration
    });
    jest.spyOn(kount, 'setup').mockReturnValue(null);
    jest.spyOn(fraudnet, 'setup').mockResolvedValue({});
    jest.spyOn(createDeferredClient, 'create').mockResolvedValue(testContext.client);
  });

  describe('create', () => {
    it('resolves', () => {
      const mockData = {
        deviceData: {
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: '12345' // eslint-disable-line camelcase
        }
      };

      kount.setup.mockReturnValue(mockData);

      return dataCollector.create({
        client: testContext.client,
        kount: true
      }).then(() => {
        expect(kount.setup).toBeCalledWith({
          environment: 'sandbox',
          merchantId: '12345'
        });
      });
    });

    it('verifies with basicComponentVerification', () => {
      const client = testContext.client;

      return dataCollector.create({ client }).catch(() => {
        expect(basicComponentVerification.verify).toBeCalledTimes(1);
        expect(basicComponentVerification.verify).toBeCalledWith({
          name: 'Data Collector',
          client
        });
      });
    });

    it('can create with an authorization instead of a client', () => {
      const mockData = {
        deviceData: {
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: '12345' // eslint-disable-line camelcase
        }
      };

      kount.setup.mockReturnValue(mockData);
      fraudnet.setup.mockResolvedValue({
        sessionId: 'paypal_id'
      });

      return dataCollector.create({
        kount: true,
        authorization: clientToken,
        useDeferredClient: true,
        debug: true
      }).then(dtInstance => {
        expect(dtInstance).toBeDefined();

        expect(createDeferredClient.create).toBeCalledTimes(1);
        expect(createDeferredClient.create).toBeCalledWith({
          authorization: clientToken,
          debug: true,
          assetsUrl: 'https://example.com/assets',
          name: 'Data Collector'
        });
      });
    });

    it('returns an error if merchant is not enabled for kount but specified kount', () => {
      delete testContext.configuration.gatewayConfiguration.kount;

      return dataCollector.create({ client: testContext.client, kount: true }).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.message).toBe('Kount is not enabled for this merchant.');
        expect(err.code).toBe('DATA_COLLECTOR_KOUNT_NOT_ENABLED');
        expect(err.type).toBe('MERCHANT');
      });
    });

    it('returns an error if kount throws an error', () => {
      kount.setup.mockImplementation(() => { throw new Error('foo boo'); });

      return dataCollector.create({
        client: testContext.client,
        kount: true
      }).catch(err => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.message).toBe('foo boo');
        expect(err.type).toBe('MERCHANT');
        expect(err.code).toBe('DATA_COLLECTOR_KOUNT_ERROR');
      });
    });

    it('sets Kount merchantId from gateway configuration', () => {
      const mockData = {
        deviceData: {
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: '12345' // eslint-disable-line camelcase
        }
      };

      kount.setup.mockReturnValue(mockData);
      fraudnet.setup.mockResolvedValue({
        sessionId: 'paypal_id'
      });

      return dataCollector.create({
        client: testContext.client,
        kount: true
      }).then(() => {
        expect(kount.setup).toBeCalledWith({
          environment: 'sandbox',
          merchantId: '12345'
        });
      });
    });

    it('returns both kount and paypal data if kount is true', () => {
      const mockPPid = 'paypal_id';
      const mockData = {
        deviceData: {
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: 'fmid' // eslint-disable-line camelcase
        }
      };

      kount.setup.mockReturnValue(mockData);
      fraudnet.setup.mockResolvedValue({
        sessionId: mockPPid
      });

      return dataCollector.create({
        client: testContext.client,
        kount: true
      }).then(data => {
        const actual = JSON.parse(data.deviceData);

        expect(actual.correlation_id).toBe(mockPPid);
        expect(actual.device_session_id).toBe(mockData.deviceData.device_session_id);
        expect(actual.fraud_merchant_id).toBe(mockData.deviceData.fraud_merchant_id);
      });
    });

    it('sets up fraudnet with the gateway environment', () => {
      testContext.configuration.gatewayConfiguration.environment = 'custom-environment-value';

      return dataCollector.create({
        client: testContext.client,
        paypal: true
      }).then(() => {
        expect(fraudnet.setup).toBeCalledWith({
          environment: 'custom-environment-value'
        });
      });
    });

    it('sets up custom riskCorrelationId for fraudnet', () => {
      return dataCollector.create({
        client: testContext.client,
        riskCorrelationId: 'custom-risk-correlation-id',
        paypal: true
      }).then(() => {
        expect(fraudnet.setup).toBeCalledWith({
          sessionId: 'custom-risk-correlation-id',
          environment: 'sandbox'
        });
      });
    });

    it('can use clientMetadataId as an alias for riskCorrelationId', () => {
      return dataCollector.create({
        client: testContext.client,
        clientMetadataId: 'custom-correlation-id',
        paypal: true
      }).then(() => {
        expect(fraudnet.setup).toBeCalledWith({
          sessionId: 'custom-correlation-id',
          environment: 'sandbox'
        });
      });
    });

    it('can use correlationId as an alias for riskCorrelationId', () => {
      return dataCollector.create({
        client: testContext.client,
        correlationId: 'custom-correlation-id',
        paypal: true
      }).then(() => {
        expect(fraudnet.setup).toBeCalledWith({
          sessionId: 'custom-correlation-id',
          environment: 'sandbox'
        });
      });
    });

    it('prefers riskCorrelationId over clientMetadataId', () => {
      return dataCollector.create({
        client: testContext.client,
        clientMetadataId: 'custom-client-metadata-id',
        riskCorrelationId: 'custom-risk-correlation-id',
        paypal: true
      }).then(() => {
        expect(fraudnet.setup).toBeCalledWith({
          sessionId: 'custom-risk-correlation-id',
          environment: 'sandbox'
        });
      });
    });

    it('prefers clientMetadataId over correlationId', () => {
      return dataCollector.create({
        client: testContext.client,
        clientMetadataId: 'custom-client-metadata-id',
        correlationId: 'custom-correlation-id',
        paypal: true
      }).then(() => {
        expect(fraudnet.setup).toBeCalledWith({
          sessionId: 'custom-client-metadata-id',
          environment: 'sandbox'
        });
      });
    });

    it('returns only fraudnet information if kount is not present but paypal is true', () => {
      delete testContext.configuration.gatewayConfiguration.kount;

      const mockData = {
        sessionId: 'thingy'
      };

      fraudnet.setup.mockResolvedValue(mockData);

      return dataCollector.create({
        client: testContext.client,
        paypal: true
      }).then(actual => {
        expect(actual.deviceData).toBe(`{"correlation_id":"${mockData.sessionId}"}`);
      });
    });

    it('returns both fraudnet and kount information if kount and paypal are present', () => {
      const mockPPid = 'paypal_id';
      const mockData = {
        deviceData: {
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: 'fmid' // eslint-disable-line camelcase
        }
      };

      kount.setup.mockReturnValue(mockData);
      fraudnet.setup.mockResolvedValue({
        sessionId: mockPPid
      });

      return dataCollector.create({
        client: testContext.client,
        paypal: true,
        kount: true
      }).then(data => {
        const actual = JSON.parse(data.deviceData);

        expect(actual.correlation_id).toBe(mockPPid);
        expect(actual.device_session_id).toBe(mockData.deviceData.device_session_id);
        expect(actual.fraud_merchant_id).toBe(mockData.deviceData.fraud_merchant_id);
      });
    });

    it('returns fraudnet only when neither kount or paypal are present', () => {
      const mockPPid = 'paypal_id';
      const mockData = {
        deviceData: {
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: 'fmid' // eslint-disable-line camelcase
        }
      };

      kount.setup.mockReturnValue(mockData);
      fraudnet.setup.mockResolvedValue({
        sessionId: mockPPid
      });

      return dataCollector.create({
        client: testContext.client
      }).then(data => {
        const actual = JSON.parse(data.deviceData);

        expect(actual.correlation_id).toBe(mockPPid);
      });
    });

    it('returns different data every invocation', () => {
      let actual1;
      const mockPPid = 'paypal_id';
      const mockData = {
        deviceData: {
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: 'fmid' // eslint-disable-line camelcase
        }
      };

      kount.setup.mockReturnValue(mockData);
      fraudnet.setup.mockResolvedValue({
        sessionId: mockPPid
      });

      return dataCollector.create({
        client: testContext.client,
        paypal: true,
        kount: true
      }).then(actual => {
        actual1 = actual;
        kount.setup.mockReturnValue({ deviceData: { newStuff: 'anything' }});
        fraudnet.setup.mockResolvedValue({
          sessionId: 'newid'
        });

        return dataCollector.create({
          client: testContext.client,
          paypal: true,
          kount: true
        }).then(actual2 => {
          expect(actual1.deviceData).not.toBe(actual2.deviceData);
        });
      });
    });

    it('provides rawDeviceData', () => {
      const mockPPid = 'paypal_id';
      const mockData = {
        deviceData: {
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: 'fmid' // eslint-disable-line camelcase
        }
      };

      kount.setup.mockReturnValue(mockData);
      fraudnet.setup.mockResolvedValue({
        sessionId: mockPPid
      });

      return dataCollector.create({
        client: testContext.client,
        paypal: true,
        kount: true
      }).then(instance => {
        expect(instance.rawDeviceData).toEqual({
          correlation_id: 'paypal_id', // eslint-disable-line camelcase
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: 'fmid' // eslint-disable-line camelcase
        });
      });
    });

    it('does not add correlation id if fraudnet.setup resolves without an instance', () => {
      const mockData = {
        deviceData: {
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: 'fmid' // eslint-disable-line camelcase
        }
      };

      kount.setup.mockReturnValue(mockData);
      fraudnet.setup.mockResolvedValue(null);

      return dataCollector.create({
        client: testContext.client,
        kount: true,
        paypal: true
      }).then(actual => {
        expect(actual.deviceData).toBe(JSON.stringify(mockData.deviceData));
      });
    });
  });

  describe('teardown', () => {
    it('runs teardown on all instances', () => {
      const kountTeardown = jest.fn();
      const fraudnetTeardown = jest.fn();

      kount.setup.mockReturnValue({
        deviceData: {},
        teardown: kountTeardown
      });
      fraudnet.setup.mockResolvedValue({
        sessionId: 'anything',
        teardown: fraudnetTeardown
      });

      return dataCollector.create({
        client: testContext.client,
        paypal: true,
        kount: true
      }).then(actual => {
        return actual.teardown();
      }).then(() => {
        expect(fraudnetTeardown).toHaveBeenCalled();
        expect(kountTeardown).toHaveBeenCalled();
      });
    });

    it('resolves a promise', done => {
      kount.setup.mockReturnValue({
        deviceData: {},
        teardown: noop
      });
      fraudnet.setup.mockResolvedValue({
        sessionId: 'anything',
        teardown: noop
      });

      dataCollector.create({
        client: testContext.client,
        paypal: true,
        kount: true
      }).then(instance => {
        instance.teardown().then(() => {
          done();
        });
      });
    });

    it('replaces all methods so error is thrown when methods are invoked', done => {
      kount.setup.mockReturnValue({
        deviceData: {},
        teardown: noop
      });
      fraudnet.setup.mockResolvedValue({
        sessionId: 'anything',
        teardown: noop
      });

      dataCollector.create({
        client: testContext.client,
        paypal: true,
        kount: true
      }).then(instance => {
        instance.teardown(() => {
          const tornDownMethods = methods(instance);

          expect(tornDownMethods.length).toBeGreaterThan(0);

          tornDownMethods.forEach(method => {
            let error;

            try {
              instance[method]();
            } catch (e) {
              error = e;
            }

            expect(error).toBeInstanceOf(BraintreeError);
            expect(error.type).toBe('MERCHANT');
            expect(error.code).toBe('METHOD_CALLED_AFTER_TEARDOWN');
            expect(error.message).toBe(`${method} cannot be called after teardown.`);
          });

          done();
        });
      });
    });

    it('waits for deferred client to be ready when using authorization setup', () => {
      let clientHasResolved = false;

      kount.setup.mockReturnValue({
        teardown: jest.fn(),
        deviceData: {
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: '12345' // eslint-disable-line camelcase
        }
      });
      fraudnet.setup.mockResolvedValue({
        teardown: jest.fn(),
        sessionId: 'paypal_id'
      });

      createDeferredClient.create.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            clientHasResolved = true;
            resolve(testContext.client);
          }, 5);
        }));

      return dataCollector.create({
        authorization: 'fake-auth',
        useDeferredClient: true,
        paypal: true,
        kount: true
      }).then(instance => {
        expect(clientHasResolved).toBe(false);

        return instance.teardown().then(() => {
          expect(clientHasResolved).toBe(true);
        });
      });
    });
  });

  describe('getDeviceData', () => {
    beforeEach(() => {
      kount.setup.mockReturnValue({
        deviceData: {
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: '12345' // eslint-disable-line camelcase
        }
      });
      fraudnet.setup.mockResolvedValue({
        sessionId: 'paypal_id'
      });
    });

    it('resolves with device data', () =>
      dataCollector.create({
        client: testContext.client,
        paypal: true,
        kount: true
      }).then(instance => instance.getDeviceData()).then(deviceData => {
        expect(JSON.parse(deviceData)).toEqual({
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: '12345', // eslint-disable-line camelcase
          correlation_id: 'paypal_id' // eslint-disable-line camelcase
        });
      }));

    it('resolves with raw device data', () =>
      dataCollector.create({
        client: testContext.client,
        paypal: true,
        kount: true
      }).then(instance =>
        instance.getDeviceData({
          raw: true
        })).then(deviceData => {
        expect(deviceData).toEqual({
          device_session_id: 'did', // eslint-disable-line camelcase
          fraud_merchant_id: '12345', // eslint-disable-line camelcase
          correlation_id: 'paypal_id' // eslint-disable-line camelcase
        });
      }));

    it('waits for deferred client to be ready when using authorization setup', () => {
      let clientHasResolved = false;

      createDeferredClient.create.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            clientHasResolved = true;
            resolve(testContext.client);
          }, 5);
        }));

      return dataCollector.create({
        authorization: 'fake-auth',
        useDeferredClient: true,
        paypal: true,
        kount: true
      }).then(instance => {
        expect(clientHasResolved).toBe(false);

        return instance.getDeviceData({
          stringify: true
        }).then(() => {
          expect(clientHasResolved).toBe(true);
        });
      });
    });
  });
});
