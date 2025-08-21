/* eslint-disable no-console */
// Centralized Braintree SDK configuration and loading utilities

import { getCachedBraintreeVersions } from "./version-fetcher";
import packageJson from "../../package.json";

export interface SDKVersion {
  version: string;
  label: string;
  baseUrl: string;
}

const getBraintreeUrl = (versionNumber: string) =>
  `https://js.braintreegateway.com/web/${versionNumber}/js`;

// Static fallback versions for immediate use
export const FALLBACK_SDK_VERSIONS: SDKVersion[] = [
  {
    version: "3.104.0",
    label: "3.104.0",
    baseUrl: getBraintreeUrl("3.104.0"),
  },
  {
    version: "3.103.0",
    label: "3.103.0",
    baseUrl: getBraintreeUrl("3.103.0"),
  },
  {
    version: "3.102.0",
    label: "3.102.0",
    baseUrl: getBraintreeUrl("3.102.0"),
  },
  {
    version: "3.101.0",
    label: "3.101.0",
    baseUrl: getBraintreeUrl("3.101.0"),
  },
  {
    version: "3.100.0",
    label: "3.100.0",
    baseUrl: getBraintreeUrl("3.100.0"),
  },
  {
    version: "3.99.0",
    label: "3.99.0",
    baseUrl: getBraintreeUrl("(3.99.0"),
  },
  {
    version: "3.98.0",
    label: "3.98.0",
    baseUrl: getBraintreeUrl("(3.98.0"),
  },
  {
    version: "3.97.0",
    label: "3.97.0",
    baseUrl: getBraintreeUrl("(3.97.0"),
  },
];

// Dynamic versions loaded from npm
let dynamicVersions: SDKVersion[] | null = null;

/**
 * Convert version string to SDKVersion object
 */
const createSDKVersion = (version: string, index: number): SDKVersion => {
  const label = index === 0 ? `${version} (Latest)` : version;
  return {
    version,
    label,
    baseUrl: getBraintreeUrl(version),
  };
};

/**
 * Get available SDK versions (dynamic + fallback)
 */
export const getAvailableSDKVersions = async (): Promise<SDKVersion[]> => {
  try {
    if (dynamicVersions) {
      return dynamicVersions;
    }

    const versions = await getCachedBraintreeVersions();

    if (versions.length > 0) {
      const newDynamicVersions = versions.map((version, index) =>
        createSDKVersion(version, index)
      );

      // Only assign if dynamicVersions is still null to avoid race conditions
      if (!dynamicVersions) {
        dynamicVersions = newDynamicVersions;
      }
      return newDynamicVersions;
    }

    console.log("No versions returned from npm, using fallback");
    return FALLBACK_SDK_VERSIONS;
  } catch (error) {
    console.warn("Error getting SDK versions, using fallback:", error);
    return FALLBACK_SDK_VERSIONS;
  }
};

/**
 * Get available SDK versions synchronously (returns fallback, then updates async)
 */
export const getAvailableSDKVersionsSync = (): SDKVersion[] => {
  if (dynamicVersions) {
    return dynamicVersions;
  }

  // Start async fetch in background
  getAvailableSDKVersions().catch(console.error);

  return FALLBACK_SDK_VERSIONS;
};

// For backward compatibility
export const AVAILABLE_SDK_VERSIONS = FALLBACK_SDK_VERSIONS;

// Import the latest version from cached versions
const importedDefaultVersion: string = packageJson.version;

export const DEFAULT_SDK_VERSION = importedDefaultVersion;

/**
 * Get the current SDK version from Storybook globals or use default
 */
export const getCurrentSDKVersion = (): string => {
  // Try to get from Storybook globals if available
  if (
    typeof window !== "undefined" &&
    (window as unknown as { __STORYBOOK_ADDONS_MANAGER?: unknown })
      .__STORYBOOK_ADDONS_MANAGER
  ) {
    try {
      const channel = (
        window as unknown as {
          __STORYBOOK_ADDONS_MANAGER: {
            getChannel(): {
              last_event?: { globals?: { sdkVersion?: string } };
            };
          };
        }
      ).__STORYBOOK_ADDONS_MANAGER.getChannel();
      const globals = channel.last_event?.globals;
      if (globals?.sdkVersion) {
        return globals.sdkVersion;
      }
    } catch {
      // Fallback to default if globals not available
    }
  }
  return DEFAULT_SDK_VERSION;
};

/**
 * Get the base URL for the current SDK version
 */
export const getCurrentSDKBaseUrl = (): string => {
  const currentVersion = getCurrentSDKVersion();
  const versionConfig = AVAILABLE_SDK_VERSIONS.find(
    (v) => v.version === currentVersion
  );
  return versionConfig?.baseUrl || AVAILABLE_SDK_VERSIONS[0].baseUrl;
};

/**
 * Load a Braintree SDK script with the current version
 */
export const loadSDKScript = (scriptName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const baseUrl = getCurrentSDKBaseUrl();
    const scriptUrl = `${baseUrl}/${scriptName}`;

    // Check if script is already loaded by URL
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existingScript) {
      console.log(`Script ${scriptName} already loaded`);
      resolve();
      return;
    }

    console.log(`Loading ${scriptName} from ${scriptUrl}`);
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.onload = () => {
      console.log(`Successfully loaded ${scriptName}`);
      resolve();
    };
    script.onerror = (error) => {
      console.error(`Failed to load ${scriptName}:`, error);
      reject(new Error(`Failed to load ${scriptName} from ${scriptUrl}`));
    };
    document.head.appendChild(script);
  });
};

/**
 * Load multiple SDK scripts in sequence
 */
export const loadSDKScripts = async (scriptNames: string[]): Promise<void> => {
  for (const scriptName of scriptNames) {
    await loadSDKScript(scriptName);
  }
};

/**
 * Clear all loaded Braintree scripts (useful when switching versions)
 */
export const clearLoadedSDKScripts = (): void => {
  const scripts = document.querySelectorAll(
    'script[src*="js.braintreegateway.com"]'
  );
  scripts.forEach((script) => script.remove());

  // Clear the global braintree object to force reinitialization
  if (typeof window !== "undefined") {
    delete (window as unknown as { braintree?: unknown }).braintree;
  }
};

/**
 * Reinitialize SDK with new version (clears old scripts and loads new ones)
 */
export const reinitializeSDK = async (scriptNames: string[]): Promise<void> => {
  clearLoadedSDKScripts();
  await loadSDKScripts(scriptNames);
};

/**
 * Get authorization token (centralized for easy updates)
 */
export const getAuthorizationToken = (): string => {
  return import.meta.env.STORYBOOK_BRAINTREE_TOKENIZATION_KEY;
};
