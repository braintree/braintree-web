"use strict";

const Client = require("../../../src/client/client");
const client = require("../../../src/client");
const BraintreeError = require("../../../src/lib/braintree-error");
const {
  fake: { client: fakeClient, clientToken, tokenizationKey },
  rejectIfResolves,
} = require("../../helpers");

describe("client.create", () => {
  beforeEach(() => {
    jest.spyOn(Client, "initialize").mockResolvedValue(fakeClient());
  });

  it("supports a callback", (done) => {
    client.create({ authorization: tokenizationKey }, () => {
      expect(Client.initialize).toBeCalledTimes(1);
      done();
    });
  });

  it("rejcts if no authorization given", () =>
    client
      .create({})
      .then(rejectIfResolves)
      .catch((err) => {
        expect(err).toBeInstanceOf(BraintreeError);
        expect(err.type).toBe("MERCHANT");
        expect(err.code).toBe("INSTANTIATION_OPTION_REQUIRED");
        expect(err.message).toBe(
          "options.authorization is required when instantiating a client."
        );
      }));

  it("accepts a tokenizationKey", () =>
    client.create({ authorization: tokenizationKey }).then(() => {
      expect(Client.initialize).toBeCalledTimes(1);
      expect(Client.initialize).toBeCalledWith({
        authorization: tokenizationKey,
      });
    }));

  it("accepts a clientToken", () =>
    client.create({ authorization: clientToken }).then(() => {
      expect(Client.initialize).toBeCalledTimes(1);
      expect(Client.initialize).toBeCalledWith({
        authorization: clientToken,
      });
    }));
});
