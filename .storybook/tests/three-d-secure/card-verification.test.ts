import { expect } from "@playwright/test";
import { test } from "../helpers/playwright-helpers";
import { TEST_CARDS } from "../../utils/test-data";
import { threeDSecureLookupNoLiabilityHandler } from "../../../msw/services/gateway";

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
    test("should resolve a frictionless verification with liability shifted", async function ({
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

    test("should resolve a frictionless verification without liability shift", async function ({
      threeDSecurePage,
      page,
      network,
    }) {
      network.use(threeDSecureLookupNoLiabilityHandler);

      await threeDSecurePage.fillCardDetails(
        TEST_CARDS.threedsVerificationFails.number,
        TEST_CARDS.threedsVerificationFails.cvv,
        TEST_CARDS.threedsVerificationFails.expirationDate
      );

      await threeDSecurePage.clickPayButton();
      await page.waitForTimeout(200);

      const result = await threeDSecurePage.getVerificationResult();

      expect(result.success).toBe(true);
      expect(result.liabilityShifted).toBe(false);
    });
  });
});
