import type { Page } from "@playwright/test";

import {
  waitForButtonReadyOrError,
  waitForComponentInstance,
} from "../helpers/shared-waiters";

export const waitForLocalPaymentInstance = (page: Page): Promise<void> =>
  waitForComponentInstance(page, "__btLocalPayment", 40000);

export const waitForLocalPaymentReadyOrError = (page: Page): Promise<void> =>
  waitForButtonReadyOrError(page, {
    buttonSelector: "#payment-button",
    timeout: 40000,
    componentName: "Local payment",
  });
