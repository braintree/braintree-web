import Client from "../../../src/client/client";
import client from "../../../src/client";
import BraintreeError from "../../../src/lib/braintree-error";
import _imp0 from "../../helpers";

const {
  fake: { client: fakeClient, clientToken, tokenizationKey },
  rejectIfResolves,
} = _imp0;

describe("client.create", () => {
  beforeEach(() => {
    vi.spyOn(Client, "initialize").mockResolvedValue(fakeClient());
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
