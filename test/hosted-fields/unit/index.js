"use strict";

jest.mock("../../../src/lib/basic-component-verification");

const Bus = require("framebus");
const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const BraintreeError = require("../../../src/lib/braintree-error");
const { events } = require("../../../src/hosted-fields/shared/constants");
const hostedFields = require("../../../src/hosted-fields");
const HostedFields = require("../../../src/hosted-fields/external/hosted-fields");
const {
  fake: { client: fakeClient, clientToken },
  noop,
  findFirstEventCallback,
} = require("../../helpers");

describe("hostedFields", () => {
  let testContext;

  function callFrameReadyHandler() {
    setTimeout(() => {
      // allow hosted fields to begin set up before finding bus handler
      const frameReadyHandler = findFirstEventCallback(
        events.FRAME_READY,
        Bus.prototype.on.mock.calls
      );

      frameReadyHandler({ field: "cvv" }, noop);
    }, 100);
  }

  beforeEach(() => {
    testContext = {};
  });

  describe("create", () => {
    beforeEach(() => {
      testContext.fakeClient = fakeClient();
      testContext.fakeAuthorization = clientToken;
      testContext.fakeClient._request = noop;
    });

    it("verifies with basicComponentVerification with client", (done) => {
      const client = testContext.fakeClient;

      hostedFields.create(
        {
          client,
          fields: {
            cvv: { selector: "#cvv" },
          },
        },
        () => {
          expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
          expect(basicComponentVerification.verify).toHaveBeenCalledWith({
            name: "Hosted Fields",
            client,
          });
          done();
        }
      );
    });

    it("verifies with basicComponentVerification with authorization", (done) => {
      const authorization = testContext.fakeAuthorization;

      hostedFields.create(
        {
          authorization,
          fields: {
            cvv: { selector: "#cvv" },
          },
        },
        () => {
          expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
          expect(basicComponentVerification.verify).toHaveBeenCalledWith({
            name: "Hosted Fields",
            authorization,
          });
          done();
        }
      );
    });

    it("instantiates a Hosted Fields integration", (done) => {
      const cvvNode = document.createElement("div");

      cvvNode.id = "cvv";
      document.body.appendChild(cvvNode);

      hostedFields.create(
        {
          client: testContext.fakeClient,
          fields: {
            cvv: { selector: "#cvv" },
          },
        },
        (err, thingy) => {
          expect(err).toBeFalsy();
          expect(thingy).toBeInstanceOf(HostedFields);

          done();
        }
      );

      callFrameReadyHandler();
    });

    it("calls callback with timeout error", (done) => {
      const cvvNode = document.createElement("div");

      jest
        .spyOn(HostedFields.prototype, "on")
        .mockImplementation((event, callback) => {
          if (event === "timeout") {
            callback();
          }
        });

      cvvNode.id = "cvv";
      document.body.appendChild(cvvNode);

      hostedFields.create(
        {
          client: testContext.fakeClient,
          fields: {
            cvv: { selector: "#cvv" },
          },
        },
        (err, thingy) => {
          expect(thingy).toBeFalsy();
          expect(err).toBeInstanceOf(BraintreeError);
          expect(err.code).toBe("HOSTED_FIELDS_TIMEOUT");
          expect(err.type).toBe("UNKNOWN");
          expect(err.message).toBe(
            "Hosted Fields timed out when attempting to set up."
          );

          HostedFields.prototype.on.mockRestore();
          done();
        }
      );
    });

    it("returns a promise", () => {
      /*
        I think there's some weirdness going on with a conflict in globals
        https://github.com/facebook/jest/issues/2549

        Current test results:
        expect(promise).toBeInstanceOf(Promise);

        Error: expect(received).toBeInstanceOf(expected)

        Expected constructor: Promise
        Received constructor: Promise
      */

      let promise;
      const cvvNode = document.createElement("div");

      cvvNode.id = "cvv";
      document.body.appendChild(cvvNode);

      promise = hostedFields.create({
        client: testContext.fakeClient,
        fields: {
          cvv: { selector: "#cvv" },
        },
      });

      expect(promise.then).toStrictEqual(expect.any(Function));
      expect(promise.catch).toStrictEqual(expect.any(Function));
    });

    it("returns error if hosted fields integration throws an error", (done) => {
      hostedFields.create(
        {
          fields: {
            cvv: { selector: "#cvv" },
          },
        },
        (err) => {
          expect(err).toBeDefined();

          done();
        }
      );
    });
  });

  describe("supportsInputFormatting", () => {
    it("returns a boolean", () => {
      expect(typeof hostedFields.supportsInputFormatting()).toBe("boolean");
    });
  });
});
