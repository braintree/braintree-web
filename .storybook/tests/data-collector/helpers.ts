import { Page } from "@playwright/test";

export const setupFraudnetRoutes = async (page: Page): Promise<void> => {
  await page.route("**/c.paypal.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "/* mock fraudnet */",
    });
  });

  await page.route("**/b.stats.paypal.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "",
    });
  });
};

export const waitForStoryReady = async (page: Page): Promise<void> => {
  await page.waitForFunction(
    () => document.querySelector(".shared-container") !== null,
    { timeout: 30000 }
  );
};

export const cleanupAfterTest = async (page: Page): Promise<void> => {
  try {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page?.reload({ waitUntil: "domcontentloaded" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log("Error reloading session:", (err as Error).message);
  }
};

export const setupDataCollectorMock = async (
  page: Page,
  mockId?: string
): Promise<void> => {
  await setupFraudnetRoutes(page);

  await page.addInitScript((id: string | undefined) => {
    const checkAndMock = setInterval(() => {
      if (window.braintree?.dataCollector) {
        clearInterval(checkAndMock);
        const originalCreate = window.braintree.dataCollector.create;

        window.braintree.dataCollector.create = async function (options: any) {
          try {
            return await originalCreate.call(this, options);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn(
              "setupDataCollectorMock: create failed, using mock:",
              err
            );
            const correlationId =
              options.riskCorrelationId ||
              options.clientMetadataId ||
              options.correlationId ||
              id ||
              "mock-dc-" + Date.now();
            const deviceData = { correlation_id: correlationId };

            return {
              deviceData: JSON.stringify(deviceData),
              rawDeviceData: deviceData,
              getDeviceData: function (opts?: { raw?: boolean }) {
                if (opts && opts.raw) {
                  return Promise.resolve(deviceData);
                }
                return Promise.resolve(JSON.stringify(deviceData));
              },
              teardown: function () {
                return Promise.resolve();
              },
            } as any;
          }
        };
      }
    }, 10);
  }, mockId);
};
