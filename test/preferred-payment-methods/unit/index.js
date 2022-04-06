"use strict";

jest.mock("../../../src/lib/analytics");
jest.mock("../../../src/lib/basic-component-verification");

const basicComponentVerification = require("../../../src/lib/basic-component-verification");
const { fake } = require("../../helpers");
const { create } = require("../../../src/preferred-payment-methods");
const PreferredPaymentMethods = require("../../../src/preferred-payment-methods/preferred-payment-methods");

describe("preferredPaymentMethods.create", () => {
  let testContext;

  beforeEach(() => {
    testContext = {};

    testContext.configuration = fake.configuration();
    testContext.client = fake.client({
      configuration: testContext.configuration,
    });
    jest
      .spyOn(PreferredPaymentMethods.prototype, "initialize")
      .mockResolvedValue();
  });

  it("verifies with basicComponentVerification", () =>
    create({
      client: testContext.client,
    }).then(() => {
      expect(basicComponentVerification.verify).toHaveBeenCalledTimes(1);
      expect(basicComponentVerification.verify).toHaveBeenCalledWith({
        name: "PreferredPaymentMethods",
        client: testContext.client,
      });
    }));

  it("initializes component", () =>
    create({ client: testContext.client }).then(() => {
      expect(
        PreferredPaymentMethods.prototype.initialize
      ).toHaveBeenCalledTimes(1);
      expect(PreferredPaymentMethods.prototype.initialize).toHaveBeenCalledWith(
        { client: testContext.client }
      );
    }));
});
