import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { TEST_CARDS } from "../../utils/test-data";

test.describe("3D Secure - Card Verification", function () {
  const publicKey = process.env.STORYBOOK_BRAINTREE_PUBLIC_KEY || "";
  const privateKey = process.env.STORYBOOK_BRAINTREE_PRIVATE_KEY || "";

  test.beforeEach(async ({ threeDSecurePage, getTestUrl, page }) => {
    await page.goto(getTestUrl({ threeDSecure: true }), {
      waitUntil: "domcontentloaded",
    });

    await threeDSecurePage.initialize3DS(publicKey, privateKey);
    await threeDSecurePage.waitForHostedFieldsAnd3DSReady();
    await threeDSecurePage.autofillBillingInfo();
  });

  test.afterEach(async ({ threeDSecurePage, page }) => {
    try {
      await threeDSecurePage.teardown3DS();
      await page?.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error during cleanup:", (err as Error).message);
    }
  });

  test.describe("Test Card Scenarios with Known Outcomes", function () {
    test("should handle authentication without challenge", async function ({
      threeDSecurePage,
      page,
    }) {
      await threeDSecurePage.fillCardDetails(
        TEST_CARDS.threedsWithoutVerification.number,
        TEST_CARDS.threedsWithoutVerification.cvv,
        TEST_CARDS.threedsWithoutVerification.expirationDate
      );

      await threeDSecurePage.clickPayButton();
      await page.waitForTimeout(200);

      const result = await threeDSecurePage.getVerificationResult();

      expect(result.success).toBe(true);
      expect(result.liabilityShifted).toBe(true);
    });

    test("should handle authentication scenarios with a successful challenge", async function ({
      threeDSecurePage,
      page,
    }) {
      await threeDSecurePage.fillCardDetails(
        TEST_CARDS.threedsWithVerification.number,
        TEST_CARDS.threedsWithVerification.cvv,
        TEST_CARDS.threedsWithVerification.expirationDate
      );

      await threeDSecurePage.clickPayButton();
      await page.waitForTimeout(200);
      await threeDSecurePage.handleChallenge();

      const result = await threeDSecurePage.getVerificationResult();

      expect(result.success).toBe(true);
      expect(result.liabilityShifted).toBe(true);
    });

    test("should handle authentication scenarios with a failed challenge", async function ({
      threeDSecurePage,
      page,
    }) {
      await threeDSecurePage.fillCardDetails(
        TEST_CARDS.threedsVerificationFails.number,
        TEST_CARDS.threedsVerificationFails.cvv,
        TEST_CARDS.threedsVerificationFails.expirationDate
      );

      await threeDSecurePage.clickPayButton();
      await page.waitForTimeout(200);

      const result = await threeDSecurePage.getVerificationResult();

      expect(result.success).toBe(false);
      expect(result.liabilityShifted).toBe(false);
    });

    test("should emit lookup-complete event during verification", async function ({
      threeDSecurePage,
    }) {
      await threeDSecurePage.attachEventListener(
        "lookup-complete",
        "lookup-complete-test"
      );

      await threeDSecurePage.fillCardDetails(
        TEST_CARDS.visa.number,
        TEST_CARDS.visa.cvv,
        TEST_CARDS.visa.expirationDate
      );

      await threeDSecurePage.clickPayButton();
      await threeDSecurePage.handleChallenge();

      const callCount = await threeDSecurePage.getEventListenerCallCount(
        "lookup-complete-test"
      );

      expect(callCount).toBeGreaterThan(0);
    });
  });
});
