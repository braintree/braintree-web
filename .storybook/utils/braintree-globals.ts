export const BRAINTREE_HOST = "js.braintreegateway.com";
export const BRAINTREE_CDN_URL = `https://${BRAINTREE_HOST}/`;

interface WindowWithBraintree {
  braintree?: unknown;
}

export function isBraintreeReady(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      (window as unknown as WindowWithBraintree).braintree
  );
}

export function clearBraintreeGlobal(): void {
  if (typeof window !== "undefined") {
    delete (window as unknown as WindowWithBraintree).braintree;
  }
}

export function waitForBraintree(
  timeoutMs: number = 10000,
  checkIntervalMs: number = 100
): Promise<void> {
  return new Promise((resolve, reject) => {
    const maxAttempts = Math.ceil(timeoutMs / checkIntervalMs);
    let attempts = 0;

    const check = () => {
      if (isBraintreeReady()) {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(
          new Error(
            `Braintree SDK failed to load after ${timeoutMs / 1000} seconds`
          )
        );
      } else {
        attempts++;
        setTimeout(check, checkIntervalMs);
      }
    };

    check();
  });
}

export function getScriptUrl(version: string, scriptName: string): string {
  if (version === "dev") {
    return `/local-build/js/${scriptName}.js`;
  }

  return `${BRAINTREE_CDN_URL}web/${version}/js/${scriptName}.js`;
}

export function normalizeScriptName(script: string): string {
  return script.replace(/\.min\.js$/, "").replace(/\.js$/, "");
}
