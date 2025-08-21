/* eslint-disable no-console */
// Simple SDK loader with dynamic version support
import { getAvailableSDKVersions, DEFAULT_SDK_VERSION } from "./sdk-config";

interface StorybookGlobals {
  sdkVersion?: string;
}

interface StoryArgs {
  [key: string]: unknown;
}

/**
 * Get the selected SDK version from Storybook globals or default
 */
export const getSelectedSDKVersion = (globals?: StorybookGlobals): string => {
  // First check localStorage for persisted selection
  const storedVersion = localStorage.getItem("storybook-braintree-sdk-version");
  if (storedVersion) {
    return storedVersion;
  }

  // Then check Storybook globals
  if (globals && globals.sdkVersion) {
    return globals.sdkVersion;
  }

  // Finally fall back to default
  return DEFAULT_SDK_VERSION;
};

/**
 * Load SDK scripts for the selected version
 */
export const loadSDKScripts = async (
  scriptNames: string[],
  globals?: StorybookGlobals
): Promise<void> => {
  const version = getSelectedSDKVersion(globals);

  // Try to get dynamic versions first, fall back to static versions
  let availableVersions;
  try {
    availableVersions = await getAvailableSDKVersions();
  } catch (error) {
    console.warn("Failed to get dynamic versions, using fallback:", error);
    // Import fallback versions directly
    const { FALLBACK_SDK_VERSIONS } = await import("./sdk-config");
    availableVersions = FALLBACK_SDK_VERSIONS;
  }

  let versionConfig = availableVersions.find((v) => v.version === version);

  // If version not found in dynamic list, create it dynamically
  if (!versionConfig) {
    console.log(
      `Version ${version} not in available list, creating dynamic config`
    );
    versionConfig = {
      version,
      label: version,
      baseUrl: `https://js.braintreegateway.com/web/${version}/js`,
    };
  }

  console.log(`Loading SDK scripts for version ${version}`);

  // Clear existing scripts if version has changed
  const existingVersionScripts = document.querySelectorAll(
    'script[src*="js.braintreegateway.com"]'
  );
  let needsReload = false;

  existingVersionScripts.forEach((script) => {
    const src = (script as HTMLScriptElement).src;
    if (src.includes("js.braintreegateway.com") && !src.includes(version)) {
      needsReload = true;
    }
  });

  if (needsReload) {
    console.log(`Version changed, clearing old scripts and reloading`);
    // Clear old scripts
    existingVersionScripts.forEach((script) => script.remove());
    // Clear global braintree object
    if (typeof window !== "undefined") {
      delete (window as unknown as { braintree?: unknown }).braintree;
    }
  }

  for (const scriptName of scriptNames) {
    await loadScript(scriptName, version, versionConfig.baseUrl);
  }

  console.log("All SDK scripts loaded successfully");
};

/**
 * Load a single script
 */
const loadScript = (
  scriptName: string,
  version: string,
  baseUrl: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const scriptUrl = `${baseUrl}/${scriptName}`;

    // Check if script is already loaded
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
      reject(new Error(`Failed to load ${scriptName}`));
    };
    document.head.appendChild(script);
  });
};

/**
 * Wait for Braintree SDK to be available
 */
export const waitForBraintree = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max

    const checkBraintree = () => {
      if (
        typeof window !== "undefined" &&
        (window as unknown as { braintree?: unknown }).braintree
      ) {
        console.log("Braintree SDK is ready");
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error("Braintree SDK failed to load after 5 seconds"));
      } else {
        attempts++;
        setTimeout(checkBraintree, 100);
      }
    };

    checkBraintree();
  });
};

/**
 * Simple story creator that loads SDK and waits for it to be ready
 */
export const createSimpleBraintreeStory = (
  renderFunction: (_container: HTMLElement, _args?: StoryArgs) => void,
  requiredScripts: string[] = ["client.min.js"],
  createVersionSelector = true
) => {
  return (
    _args: StoryArgs,
    { globals }: { globals: StorybookGlobals }
  ): HTMLElement => {
    const container = document.createElement("div");
    let selectedVersion = "";

    // Add version selector dropdown
    if (createVersionSelector) {
      const versionSelector = document.createElement("select");
      versionSelector.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 9999;
      font-family: monospace;
      border: 1px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      outline: none;
    `;

      // Add loading state to dropdown
      versionSelector.innerHTML = "<option>Loading versions...</option>";
      versionSelector.disabled = true;
      container.appendChild(versionSelector);

      selectedVersion = getSelectedSDKVersion(globals);

      // Load available versions and populate dropdown
      const populateVersionDropdown = async () => {
        try {
          // Try to get dynamic versions first
          let availableVersions;
          try {
            availableVersions = await getAvailableSDKVersions();
          } catch (error) {
            console.warn(
              "Failed to get dynamic versions, using fallback:",
              error
            );
            const { FALLBACK_SDK_VERSIONS } = await import("./sdk-config");
            availableVersions = FALLBACK_SDK_VERSIONS;
          }

          // Clear loading state
          versionSelector.innerHTML = "";
          versionSelector.disabled = false;

          // Add version options
          availableVersions.forEach((versionConfig) => {
            const option = document.createElement("option");
            option.value = versionConfig.version;
            option.textContent = `SDK v${versionConfig.version}`;
            if (versionConfig.version === selectedVersion) {
              option.selected = true;
            }
            versionSelector.appendChild(option);
          });

          // Check if current version exists in list, if not add it
          if (!availableVersions.find((v) => v.version === selectedVersion)) {
            const customOption = document.createElement("option");
            customOption.value = selectedVersion;
            customOption.textContent = `SDK v${selectedVersion} (custom)`;
            customOption.selected = true;
            versionSelector.appendChild(customOption);
          }

          // Add change event listener
          versionSelector.addEventListener("change", (event) => {
            const newVersion = (event.target as HTMLSelectElement).value;

            // Store in localStorage for persistence
            localStorage.setItem("storybook-braintree-sdk-version", newVersion);

            // Update Storybook globals if available
            if (window.parent && window.parent.postMessage) {
              window.parent.postMessage(
                {
                  type: "UPDATE_GLOBALS",
                  globals: { sdkVersion: newVersion },
                },
                "*"
              );
            }

            // Show loading indicator
            const loadingDiv = document.createElement("div");
            loadingDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 40px;
            border-radius: 8px;
            font-family: monospace;
            z-index: 10000;
          `;
            loadingDiv.textContent = `Loading SDK v${newVersion}...`;
            document.body.appendChild(loadingDiv);

            // Clear existing scripts and reload
            setTimeout(() => {
              // Clear existing SDK scripts
              const existingScripts = document.querySelectorAll(
                'script[src*="js.braintreegateway.com"], script[src*="assets.braintreegateway.com"]'
              );
              existingScripts.forEach((script) => script.remove());

              // Clear global braintree object
              if (typeof window !== "undefined") {
                delete (window as unknown as { braintree?: unknown }).braintree;
              }

              // Reload the story
              window.location.reload();
            }, 100);
          });
        } catch (error) {
          console.error("Failed to populate version dropdown:", error);
          versionSelector.innerHTML = `<option>SDK v${selectedVersion} (error loading versions)</option>`;
        }
      };

      // Initialize dropdown
      populateVersionDropdown();
    }

    // Initialize SDK and render story
    setTimeout(async () => {
      try {
        await loadSDKScripts(requiredScripts, globals);
        await waitForBraintree();
        renderFunction(container, _args);
      } catch (error) {
        console.error("Failed to initialize Braintree SDK:", error);
        const errorDiv = document.createElement("div");
        errorDiv.style.cssText = `
          color: red;
          padding: 20px;
          border: 1px solid red;
          margin: 20px;
          border-radius: 4px;
          background-color: #fff5f5;
        `;
        errorDiv.innerHTML = `
          <strong>SDK Loading Error:</strong> ${error.message}<br>
          <small>Check console for more details</small><br>
          <small>Selected version: ${selectedVersion}</small>
        `;
        container.appendChild(errorDiv);
      }
    }, 100);

    return container;
  };
};
