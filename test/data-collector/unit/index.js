"use strict";

jest.mock("../../../src/lib/basic-component-verification");
jest.mock("framebus");
jest.mock("../../../src/lib/create-assets-url");
jest.mock("../../../src/lib/create-deferred-client");

const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const createDeferredClient = require("../../../src/lib/create-deferred-client");
const dataCollector = require("../../../src/data-collector");
const fraudnet = require("../../../src/data-collector/fraudnet");
const BraintreeError = require("../../../src/lib/braintree-error");
const methods = require("../../../src/lib/methods");
const {
  fake: { client: fakeClient, clientToken, configuration },
  noop,
} = require("../../helpers");

describe("dataCollector", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = configuration();
    testContext.client = fakeClient({
      configuration: testContext.configuration,
    });
    jest.spyOn(fraudnet, "setup").mockResolvedValue({});
    jest
      .spyOn(createDeferredClient, "create")
      .mockResolvedValue(testContext.client);
  });

  describe("create", () => {
    it("verifies with basicComponentVerification", () => {
      const client = testContext.client;

      return dataCollector.create({ client }).catch(() => {
        expect(basicComponentVerification.verify).toBeCalledTimes(1);
        expect(basicComponentVerification.verify).toBeCalledWith({
          name: "Data Collector",
          client,
        });
      });
    });

    it("can create with an authorization instead of a client", () => {
      fraudnet.setup.mockResolvedValue({
        sessionId: "paypal_id",
      });

      return dataCollector
        .create({
          authorization: clientToken,
          useDeferredClient: true,
          debug: true,
        })
        .then((dtInstance) => {
          expect(dtInstance).toBeDefined();

          expect(createDeferredClient.create).toBeCalledTimes(1);
          expect(createDeferredClient.create).toBeCalledWith({
            authorization: clientToken,
            debug: true,
            assetsUrl: "https://example.com/assets",
            name: "Data Collector",
          });
        });
    });

    it("doesn't raise an error when passed kount=true", () => {
      dataCollector
        .create({
          kount: true,
          authorization: clientToken,
          useDeferredClient: true,
          debug: true,
        })
        .then((dtInstance) => {
          expect(dtInstance).toBeDefined();
        })
        .catch(() => {
          // Should never get here
          expect(true).toBe(false);
        });
      expect.assertions(1);
    });

    it("sets up fraudnet with the gateway environment", () => {
      testContext.configuration.gatewayConfiguration.environment =
        "custom-environment-value";

      return dataCollector
        .create({
          client: testContext.client,
          paypal: true,
        })
        .then(() => {
          expect(fraudnet.setup).toBeCalledWith({
            environment: "custom-environment-value",
            clientSessionId: "fakeSessionId",
          });
        });
    });

    it("sets up custom riskCorrelationId for fraudnet", () => {
      return dataCollector
        .create({
          client: testContext.client,
          riskCorrelationId: "custom-risk-correlation-id",
          paypal: true,
        })
        .then(() => {
          expect(fraudnet.setup).toBeCalledWith({
            sessionId: "custom-risk-correlation-id",
            environment: "sandbox",
            clientSessionId: "fakeSessionId",
          });
        });
    });

    it("can use clientMetadataId as an alias for riskCorrelationId", () => {
      return dataCollector
        .create({
          client: testContext.client,
          clientMetadataId: "custom-correlation-id",
          paypal: true,
        })
        .then(() => {
          expect(fraudnet.setup).toBeCalledWith({
            sessionId: "custom-correlation-id",
            environment: "sandbox",
            clientSessionId: "fakeSessionId",
          });
        });
    });

    it("can use correlationId as an alias for riskCorrelationId", () => {
      return dataCollector
        .create({
          client: testContext.client,
          correlationId: "custom-correlation-id",
          paypal: true,
        })
        .then(() => {
          expect(fraudnet.setup).toBeCalledWith({
            sessionId: "custom-correlation-id",
            environment: "sandbox",
            clientSessionId: "fakeSessionId",
          });
        });
    });

    it("prefers riskCorrelationId over clientMetadataId", () => {
      return dataCollector
        .create({
          client: testContext.client,
          clientMetadataId: "custom-client-metadata-id",
          riskCorrelationId: "custom-risk-correlation-id",
          paypal: true,
        })
        .then(() => {
          expect(fraudnet.setup).toBeCalledWith({
            sessionId: "custom-risk-correlation-id",
            environment: "sandbox",
            clientSessionId: "fakeSessionId",
          });
        });
    });

    it("prefers clientMetadataId over correlationId", () => {
      return dataCollector
        .create({
          client: testContext.client,
          clientMetadataId: "custom-client-metadata-id",
          correlationId: "custom-correlation-id",
          paypal: true,
        })
        .then(() => {
          expect(fraudnet.setup).toBeCalledWith({
            sessionId: "custom-client-metadata-id",
            environment: "sandbox",
            clientSessionId: "fakeSessionId",
          });
        });
    });

    it("returns only fraudnet information if paypal is true", () => {
      const mockData = {
        sessionId: "thingy",
      };

      fraudnet.setup.mockResolvedValue(mockData);

      return dataCollector
        .create({
          client: testContext.client,
          paypal: true,
        })
        .then((actual) => {
          expect(actual.deviceData).toBe(
            `{"correlation_id":"${mockData.sessionId}"}`
          );
        });
    });

    it("returns fraudnet only when paypal isn't present", () => {
      const mockPPid = "paypal_id";

      fraudnet.setup.mockResolvedValue({
        sessionId: mockPPid,
      });

      return dataCollector
        .create({
          client: testContext.client,
        })
        .then((data) => {
          const actual = JSON.parse(data.deviceData);

          expect(actual.correlation_id).toBe(mockPPid);
        });
    });

    it("returns different data every invocation", () => {
      let actual1;
      const mockPPid = "paypal_id";

      fraudnet.setup.mockResolvedValue({
        sessionId: mockPPid,
      });

      return dataCollector
        .create({
          client: testContext.client,
          paypal: true,
        })
        .then((actual) => {
          actual1 = actual;
          fraudnet.setup.mockResolvedValue({
            sessionId: "newid",
          });

          return dataCollector
            .create({
              client: testContext.client,
              paypal: true,
            })
            .then((actual2) => {
              expect(actual1.deviceData).not.toBe(actual2.deviceData);
            });
        });
    });

    it("provides rawDeviceData", () => {
      const mockPPid = "paypal_id";

      fraudnet.setup.mockResolvedValue({
        sessionId: mockPPid,
      });

      return dataCollector
        .create({
          client: testContext.client,
          paypal: true,
        })
        .then((instance) => {
          expect(instance.rawDeviceData).toEqual({
            correlation_id: "paypal_id",
          });
        });
    });

    it("returns a rejected promise if fraudnet.setup resolves without an instance", (done) => {
      fraudnet.setup.mockResolvedValue(null);

      dataCollector
        .create({
          client: testContext.client,
          paypal: true,
        })
        .catch((err) => {
          expect(err.code).toEqual("DATA_COLLECTOR_REQUIRES_CREATE_OPTIONS");
          done();
        });
    });
  });

  describe("teardown", () => {
    it("runs teardown on all instances", () => {
      const fraudnetTeardown = jest.fn();

      fraudnet.setup.mockResolvedValue({
        sessionId: "anything",
        teardown: fraudnetTeardown,
      });

      return dataCollector
        .create({
          client: testContext.client,
          paypal: true,
        })
        .then((actual) => {
          return actual.teardown();
        })
        .then(() => {
          expect(fraudnetTeardown).toHaveBeenCalled();
        });
    });

    it("resolves a promise", (done) => {
      fraudnet.setup.mockResolvedValue({
        sessionId: "anything",
        teardown: noop,
      });

      dataCollector
        .create({
          client: testContext.client,
          paypal: true,
        })
        .then((instance) => {
          instance.teardown().then(() => {
            done();
          });
        });
    });

    it("replaces all methods so error is thrown when methods are invoked", (done) => {
      fraudnet.setup.mockResolvedValue({
        sessionId: "anything",
        teardown: noop,
      });

      dataCollector
        .create({
          client: testContext.client,
          paypal: true,
        })
        .then((instance) => {
          instance.teardown(() => {
            const tornDownMethods = methods(instance);

            expect(tornDownMethods.length).toBeGreaterThan(0);

            tornDownMethods.forEach((method) => {
              let error;

              try {
                instance[method]();
              } catch (e) {
                error = e;
              }

              expect(error).toBeInstanceOf(BraintreeError);
              expect(error.type).toBe("MERCHANT");
              expect(error.code).toBe("METHOD_CALLED_AFTER_TEARDOWN");
              expect(error.message).toBe(
                `${method} cannot be called after teardown.`
              );
            });

            done();
          });
        });
    });

    it("waits for deferred client to be ready when using authorization setup", () => {
      let clientHasResolved = false;

      fraudnet.setup.mockResolvedValue({
        teardown: jest.fn(),
        sessionId: "paypal_id",
      });

      createDeferredClient.create.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              clientHasResolved = true;
              resolve(testContext.client);
            }, 5);
          })
      );

      return dataCollector
        .create({
          authorization: "fake-auth",
          useDeferredClient: true,
          paypal: true,
        })
        .then((instance) => {
          expect(clientHasResolved).toBe(false);

          return instance.teardown().then(() => {
            expect(clientHasResolved).toBe(true);
          });
        });
    });
  });

  describe("getDeviceData", () => {
    beforeEach(() => {
      fraudnet.setup.mockResolvedValue({
        sessionId: "paypal_id",
      });
    });

    it("resolves with device data", () =>
      dataCollector
        .create({
          client: testContext.client,
          paypal: true,
        })
        .then((instance) => instance.getDeviceData())
        .then((deviceData) => {
          expect(JSON.parse(deviceData)).toEqual({
            correlation_id: "paypal_id",
          });
        }));

    it("resolves with raw device data", () =>
      dataCollector
        .create({
          client: testContext.client,
          paypal: true,
        })
        .then((instance) =>
          instance.getDeviceData({
            raw: true,
          })
        )
        .then((deviceData) => {
          expect(deviceData).toEqual({
            correlation_id: "paypal_id",
          });
        }));

    it("waits for deferred client to be ready when using authorization setup", () => {
      let clientHasResolved = false;

      createDeferredClient.create.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              clientHasResolved = true;
              resolve(testContext.client);
            }, 5);
          })
      );

      return dataCollector
        .create({
          authorization: "fake-auth",
          useDeferredClient: true,
          paypal: true,
        })
        .then((instance) => {
          expect(clientHasResolved).toBe(false);

          return instance
            .getDeviceData({
              stringify: true,
            })
            .then(() => {
              expect(clientHasResolved).toBe(true);
            });
        });
    });
  });
});
