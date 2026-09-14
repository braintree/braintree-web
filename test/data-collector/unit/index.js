vi.mock("../../../src/lib/basic-component-verification");
vi.mock("framebus");
vi.mock("../../../src/lib/create-assets-url");
vi.mock("../../../src/lib/create-deferred-client");

import basicComponentVerification from "../../../src/lib/basic-component-verification";
import createDeferredClient from "../../../src/lib/create-deferred-client";
import dataCollector from "../../../src/data-collector";
import fraudnet from "../../../src/data-collector/fraudnet";
import BraintreeError from "../../../src/lib/braintree-error";
import methods from "../../../src/lib/methods";
import _imp0 from "../../helpers";

const {
  fake: { client: fakeClient, clientToken, configuration },
  noop,
} = _imp0;

describe("dataCollector", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
    testContext.configuration = configuration();
    testContext.client = fakeClient({
      configuration: testContext.configuration,
    });
    vi.spyOn(fraudnet, "setup").mockResolvedValue({});
    vi.spyOn(createDeferredClient, "create").mockResolvedValue(
      testContext.client
    );
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

    it("sets up fraudnet with the gateway environment", () => {
      testContext.configuration.gatewayConfiguration.environment =
        "custom-environment-value";

      return dataCollector
        .create({
          client: testContext.client,
        })
        .then(() => {
          expect(fraudnet.setup).toBeCalledWith({
            client: expect.anything(),
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
        })
        .then(() => {
          expect(fraudnet.setup).toBeCalledWith({
            client: expect.anything(),
            sessionId: "custom-risk-correlation-id",
            environment: "sandbox",
            clientSessionId: "fakeSessionId",
          });
        });
    });

    it("returns fraudnet information", () => {
      const mockData = {
        sessionId: "thingy",
      };

      fraudnet.setup.mockResolvedValue(mockData);

      return dataCollector
        .create({
          client: testContext.client,
        })
        .then((actual) => {
          expect(actual.deviceData).toBe(
            `{"correlation_id":"${mockData.sessionId}"}`
          );
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
        })
        .then((actual) => {
          actual1 = actual;
          fraudnet.setup.mockResolvedValue({
            sessionId: "newid",
          });

          return dataCollector
            .create({
              client: testContext.client,
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
        })
        .then((instance) => {
          expect(instance.rawDeviceData).toEqual({
            correlation_id: "paypal_id",
          });
        });
    });

    it("returns a rejected promise if fraudnet.setup resolves without an instance", () =>
      new Promise((resolve) => {
        fraudnet.setup.mockResolvedValue(null);

        dataCollector
          .create({
            client: testContext.client,
          })
          .catch((err) => {
            expect(err.code).toEqual("DATA_COLLECTOR_FAILED_TO_INSTANTIATE");
            expect(err.type).toEqual("NETWORK");
            expect(err.message).toEqual(
              "Data Collector failed to instantiate. Possible network error or blocked request."
            );
            resolve();
          });
      }));
  });

  describe("teardown", () => {
    it("runs teardown on all instances", () => {
      const fraudnetTeardown = vi.fn();

      fraudnet.setup.mockResolvedValue({
        sessionId: "anything",
        teardown: fraudnetTeardown,
      });

      return dataCollector
        .create({
          client: testContext.client,
        })
        .then((actual) => {
          return actual.teardown();
        })
        .then(() => {
          expect(fraudnetTeardown).toHaveBeenCalled();
        });
    });

    it("resolves a promise", () =>
      new Promise((resolve) => {
        fraudnet.setup.mockResolvedValue({
          sessionId: "anything",
          teardown: noop,
        });

        dataCollector
          .create({
            client: testContext.client,
          })
          .then((instance) => {
            instance.teardown().then(() => {
              resolve();
            });
          });
      }));

    it("replaces all methods so error is thrown when methods are invoked", () =>
      new Promise((resolve) => {
        fraudnet.setup.mockResolvedValue({
          sessionId: "anything",
          teardown: noop,
        });

        dataCollector
          .create({
            client: testContext.client,
          })
          .then((instance) => {
            instance.teardown().then(() => {
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

              resolve();
            });
          });
      }));

    it("waits for deferred client to be ready when using authorization setup", () => {
      let clientHasResolved = false;

      fraudnet.setup.mockResolvedValue({
        teardown: vi.fn(),
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
