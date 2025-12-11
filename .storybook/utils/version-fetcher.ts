/* eslint-disable no-console */
export interface NpmVersionData {
  versions: string[];
  latest: string;
  "dist-tags": {
    latest: string;
    [key: string]: string;
  };
}

/**
 * Fetch Braintree Web SDK versions from npm registry
 */
export async function fetchBraintreeVersionsFromNpm(): Promise<string[]> {
  try {
    console.log("Fetching Braintree SDK versions from npm...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch("https://registry.npmjs.org/braintree-web", {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `npm registry response: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const versions = Object.keys(data.versions || {});

    // Filter to only include versions 3.x.x and sort in descending order
    const filteredVersions = versions
      .filter((version) => {
        // Only include 3.x.x versions
        return version.match(/^[2-3]\.\d+\.\d+$/) && !version.includes("-");
      })
      .sort((a, b) => {
        // Sort in descending order (newest first)
        const aParts = a.split(".").map(Number);
        const bParts = b.split(".").map(Number);

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;

          if (aVal !== bVal) {
            return bVal - aVal; // Descending order
          }
        }

        return 0;
      });

    return filteredVersions;
  } catch (error) {
    console.warn("Failed to fetch versions from npm:", error);
    return [];
  }
}

/**
 * Get fallback versions if npm fetch fails
 */
export function getFallbackVersions(): string[] {
  return ["3.124.0", "3.123.0", "3.122.0"];
}

/**
 * Get Braintree SDK versions with npm fallback
 */
export async function getBraintreeVersions(): Promise<string[]> {
  try {
    const npmVersions = await fetchBraintreeVersionsFromNpm();

    if (npmVersions.length > 0) {
      return npmVersions;
    }

    console.log("Using fallback versions");
    return getFallbackVersions();
  } catch (error) {
    console.warn("Error fetching versions, using fallback:", error);
    return getFallbackVersions();
  }
}

/**
 * Cache versions to avoid repeated npm calls
 */
let cachedVersions: string[] | null = null;
let cacheTimestamp: number = 0;
let fetchPromise: Promise<string[]> | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getCachedBraintreeVersions(): Promise<string[]> {
  const now = Date.now();

  // Return cached versions if still valid
  if (cachedVersions && now - cacheTimestamp < CACHE_DURATION) {
    console.log("Using cached versions");
    return Promise.resolve(cachedVersions);
  }

  // If there's already a fetch in progress, wait for it
  if (fetchPromise) {
    console.log("Waiting for ongoing fetch to complete");
    return fetchPromise;
  }

  // Start a new fetch and cache the promise to prevent race conditions
  fetchPromise = getBraintreeVersions()
    .then((versions) => {
      cachedVersions = versions;
      cacheTimestamp = now;
      fetchPromise = null; // Clear the promise after completion
      return versions;
    })
    .catch((error) => {
      fetchPromise = null; // Clear the promise on error
      throw error;
    });

  return fetchPromise;
}
