"use strict";

const InlineIframeFramework = require("../../../../../src/three-d-secure/external/frameworks/inline-iframe");
const SongbirdFramework = require("../../../../../src/three-d-secure/external/frameworks/songbird");
const {
  fake,
  wait,
  yields,
  yieldsByEventAsync,
  findFirstEventCallback,
} = require("../../../../helpers");
const assets = require("../../../../../src/lib/assets");

describe("InlineIframeFramework", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    jest.spyOn(InlineIframeFramework.prototype, "setupSongbird");

    testContext.configuration = {
      authorization: fake.clientToken,
      authorizationFingerprint: "encoded_auth_fingerprint",
      gatewayConfiguration: {
        assetsUrl: "http://example.com/assets",
        threeDSecure: {
          cardinalAuthenticationJWT: "jwt",
        },
      },
    };
    testContext.client = {
      request: jest.fn().mockResolvedValue(null),
      getConfiguration: () => testContext.configuration,
    };
    testContext.fakeCardinal = {
      configure: jest.fn(),
      setup: jest.fn(),
      on: jest.fn(),
      trigger: jest.fn().mockResolvedValue({ Status: false }),
      continue: jest.fn(),
    };
    jest.spyOn(assets, "loadScript").mockImplementation(() => {
      window.Cardinal = testContext.fakeCardinal;

      // allow a slight delay so timing tests can run
      return wait(5);
    });
  });

  describe("setUpEventListeners", () => {
    it("sets up Songbird framework listeners", () => {
      const options = {
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      };
      const framework = new InlineIframeFramework(options);
      const spy = jest.fn();

      jest.spyOn(SongbirdFramework.prototype, "setUpEventListeners");

      framework.setUpEventListeners(spy);

      expect(
        SongbirdFramework.prototype.setUpEventListeners
      ).toHaveBeenCalledTimes(1);
      expect(
        SongbirdFramework.prototype.setUpEventListeners
      ).toHaveBeenCalledWith(spy);
    });

    it("sets up listener for on authentication iframe available event", (done) => {
      const options = {
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      };
      const framework = new InlineIframeFramework(options);

      jest
        .spyOn(framework, "on")
        .mockImplementation(
          yieldsByEventAsync(
            "inline-iframe-framework:AUTHENTICATION_IFRAME_AVAILABLE",
            "some data",
            "a fake function"
          )
        );

      framework.setUpEventListeners((eventName, data, fakeFunction) => {
        expect(eventName).toBe("authentication-iframe-available");
        expect(data).toBe("some data");
        expect(fakeFunction).toBe("a fake function");

        done();
      });
    });
  });

  describe("setupSongbird", () => {
    beforeEach(() => {
      testContext.fakeCardinal.on.mockImplementation(
        yieldsByEventAsync("payments.setupComplete", {})
      );

      testContext.tds = new InlineIframeFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });
      InlineIframeFramework.prototype.setupSongbird.mockClear();
    });

    afterEach(() => {
      delete window.Cardinal;
    });

    it("configures Cardinal to use inline framework", () => {
      const framework = new InlineIframeFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });

      return framework.setupSongbird().then(() => {
        expect(window.Cardinal.configure).toHaveBeenCalledWith({
          payment: {
            framework: "inline",
          },
        });
      });
    });

    it("configures Cardinal to use verbose logging and the inline framework", () => {
      const framework = new InlineIframeFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
        loggingEnabled: true,
      });

      return framework.setupSongbird().then(() => {
        expect(window.Cardinal.configure).toHaveBeenCalledWith({
          payment: {
            framework: "inline",
          },
          logging: {
            level: "verbose",
          },
        });
      });
    });

    it("configures Cardinal to include a listener for `ui.inline.setup` when `inline-iframe` framework is used", () => {
      const framework = new InlineIframeFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
      });

      return framework.setupSongbird().then(() => {
        expect(window.Cardinal.on).toHaveBeenCalledWith(
          "ui.inline.setup",
          expect.any(Function)
        );
      });
    });
  });

  describe("initializeChallengeWithLookupResponse", () => {
    beforeEach(() => {
      testContext.fakeCardinal.on.mockImplementation(
        yieldsByEventAsync("payments.setupComplete", {})
      );
      testContext.lookupResponse = {
        threeDSecureInfo: {
          liabilityShiftPossible: true,
          liabilityShifted: true,
        },
        paymentMethod: {},
        lookup: {
          acsUrl: "https://exmaple.com/acs",
          pareq: "pareq",
          transactionId: "transaction-id",
        },
      };
      testContext.client.request.mockResolvedValue({
        threeDSecure: {},
        lookup: {},
        paymentMethod: {},
      });
      testContext.validationArgs = [
        {
          ActionCode: "SUCCESS",
        },
        "jwt",
      ];
      testContext.failureArgs = [
        {
          ActionCode: "ERROR",
        },
      ];
      testContext.htmlTemplate = "<div><iframe></iframe></div>";
      testContext.iframeDetails = {
        paymentType: "CCA",
        data: {
          mode: "static",
        },
      };
      testContext.resolveFunction = jest.fn(() => {
        const handler = findFirstEventCallback(
          "payments.validated",
          testContext.fakeCardinal.on.mock.calls
        );

        handler.apply(null, testContext.validationArgs);
      });
      testContext.rejectFunction = jest.fn(() => {
        const handler = findFirstEventCallback(
          "payments.validated",
          testContext.fakeCardinal.on.mock.calls
        );

        handler.apply(null, testContext.failureArgs);
      });

      testContext.instance = new InlineIframeFramework({
        createPromise: Promise.resolve(testContext.client),
        client: testContext.client,
        framework: "inline-iframe",
      });

      InlineIframeFramework.prototype.setupSongbird.mockClear();

      testContext.fakeCardinal.continue.mockImplementation(() => {
        wait(5).then(() => {
          const handler = findFirstEventCallback(
            "ui.inline.setup",
            testContext.fakeCardinal.on.mock.calls
          );

          handler(
            testContext.htmlTemplate,
            testContext.iframeDetails,
            testContext.resolveFunction,
            testContext.rejectFunction
          );
        });
      });

      return testContext.instance.setupSongbird();
    });

    it("rejects if no html template is available", () => {
      delete testContext.htmlTemplate;

      return testContext.instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
          onLookupComplete: yields(),
        })
        .catch(({ code }) => {
          expect(code).toBe("THREEDS_CARDINAL_SDK_ERROR");
        });
    });

    it("rejects if no details are available", () => {
      delete testContext.iframeDetails;

      return testContext.instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
          onLookupComplete: yields(),
        })
        .catch((err) => {
          expect(err.code).toBe("THREEDS_CARDINAL_SDK_ERROR");
        });
    });

    it("rejects if paymentType is not CCA (customer card authentication)", () => {
      testContext.iframeDetails.paymentType = "foo";

      return testContext.instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
          onLookupComplete: yields(),
        })
        .catch((err) => {
          expect(err.code).toBe("THREEDS_CARDINAL_SDK_ERROR");
        });
    });

    it("rejects if mode is not static or suppress", () => {
      testContext.iframeDetails.data.mode = "foo";

      return testContext.instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
          onLookupComplete: jest.fn(yields()),
        })
        .catch((err) => {
          expect(err.code).toBe("THREEDS_CARDINAL_SDK_ERROR");
        });
    });

    it("adds element to page and calls resolve callback automatically when mode is suppress", () => {
      jest.spyOn(document.body, "appendChild");
      testContext.iframeDetails.data.mode = "suppress";

      return testContext.instance
        .initializeChallengeWithLookupResponse(testContext.lookupResponse, {
          onLookupComplete: yields(),
        })
        .then(() => {
          const domNode = document.body.appendChild.mock.calls[0][0];

          expect(testContext.resolveFunction).toHaveBeenCalledTimes(1);
          expect(document.body.appendChild).toHaveBeenCalledTimes(1);
          expect(domNode.querySelector("iframe")).toBeDefined();
          expect(domNode.style.display).toBe("none");
        });
    });

    it("passes iframe to merchant and waits for merchant to resolve when mode is static", (done) => {
      jest.spyOn(document.body, "appendChild");
      testContext.iframeDetails.data.mode = "static";

      testContext.instance.on(
        "inline-iframe-framework:AUTHENTICATION_IFRAME_AVAILABLE",
        (payload, next) => {
          expect(testContext.resolveFunction).not.toHaveBeenCalled();
          expect(payload.element.querySelector("iframe")).toBeDefined();

          next();

          expect(testContext.resolveFunction).toHaveBeenCalledTimes(1);

          done();
        }
      );

      testContext.instance.initializeChallengeWithLookupResponse(
        testContext.lookupResponse,
        {
          onLookupComplete: yields(),
        }
      );
    });
  });
});
