vi.mock("../../../src/lib/basic-component-verification");

import Bus from "framebus";
import basicComponentVerification from "../../../src/lib/basic-component-verification";
import BraintreeError from "../../../src/lib/braintree-error";
import { events } from "../../../src/hosted-fields/shared/constants";
import hostedFields from "../../../src/hosted-fields";
import HostedFields from "../../../src/hosted-fields/external/hosted-fields";
import _imp0 from "../../helpers";

const {
  fake: { client: fakeClient, clientToken },
  noop,
  findFirstEventCallback,
} = _imp0;

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

    it("verifies with basicComponentVerification with client", () =>
      new Promise((resolve) => {
        const client = testContext.fakeClient;
        const cvvNode = document.createElement("div");

        cvvNode.id = "cvv";
        document.body.appendChild(cvvNode);

        hostedFields
          .create({
            client,
            fields: {
              cvv: { container: "#cvv" },
            },
          })
          .then(() => {
            expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
            expect(basicComponentVerification.verify).toHaveBeenCalledWith({
              name: "Hosted Fields",
              client,
            });
            resolve();
          });

        callFrameReadyHandler();
      }));

    it("verifies with basicComponentVerification with authorization", () =>
      new Promise((resolve) => {
        const authorization = testContext.fakeAuthorization;
        const cvvNode = document.createElement("div");

        cvvNode.id = "cvv";
        document.body.appendChild(cvvNode);

        hostedFields
          .create({
            authorization,
            fields: {
              cvv: { container: "#cvv" },
            },
          })
          .then(() => {
            expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
            expect(basicComponentVerification.verify).toHaveBeenCalledWith({
              name: "Hosted Fields",
              authorization,
            });
            resolve();
          });

        callFrameReadyHandler();
      }));

    it("instantiates a Hosted Fields integration", () =>
      new Promise((resolve) => {
        const cvvNode = document.createElement("div");

        cvvNode.id = "cvv";
        document.body.appendChild(cvvNode);

        hostedFields
          .create({
            client: testContext.fakeClient,
            fields: {
              cvv: { container: "#cvv" },
            },
          })
          .then((thingy) => {
            expect(thingy).toBeInstanceOf(HostedFields);

            resolve();
          });

        callFrameReadyHandler();
      }));

    it("rejects with timeout error", () =>
      new Promise((resolve) => {
        const cvvNode = document.createElement("div");

        vi.spyOn(HostedFields.prototype, "on").mockImplementation(
          (event, callback) => {
            if (event === "timeout") {
              callback();
            }
          }
        );

        cvvNode.id = "cvv";
        document.body.appendChild(cvvNode);

        hostedFields
          .create({
            client: testContext.fakeClient,
            fields: {
              cvv: { container: "#cvv" },
            },
          })
          .catch((err) => {
            expect(err).toBeInstanceOf(BraintreeError);
            expect(err.code).toBe("HOSTED_FIELDS_TIMEOUT");
            expect(err.type).toBe("UNKNOWN");
            expect(err.message).toBe(
              "Hosted Fields timed out when attempting to set up."
            );

            HostedFields.prototype.on.mockRestore();
            resolve();
          });
      }));

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
          cvv: { container: "#cvv" },
        },
      });

      expect(promise.then).toStrictEqual(expect.any(Function));
      expect(promise.catch).toStrictEqual(expect.any(Function));
    });

    it("returns error if hosted fields integration throws an error", () =>
      new Promise((resolve) => {
        hostedFields
          .create({
            fields: {
              cvv: { container: "#cvv" },
            },
          })
          .catch((err) => {
            expect(err).toBeDefined();

            resolve();
          });
      }));
  });

  describe("supportsInputFormatting", () => {
    it("returns a boolean", () => {
      expect(typeof hostedFields.supportsInputFormatting()).toBe("boolean");
    });
  });
});
