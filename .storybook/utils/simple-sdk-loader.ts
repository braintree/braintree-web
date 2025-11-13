/* eslint-disable no-console */
import { getAvailableSDKVersions } from "./sdk-config";
import { getLocalVersion } from "./local-build-manager";

interface StorybookGlobals {
  sdkVersion?: string;
}

interface StoryArgs {
  [key: string]: unknown;
}

export const getSelectedSDKVersion = (globals?: StorybookGlobals): string => {
  const urlParams = new URLSearchParams(window.location.search);
  const versionParam = urlParams.get("version");

  if (versionParam) {
    localStorage.setItem("storybook-braintree-sdk-version", versionParam);
    return versionParam;
  }

  const storedVersion = localStorage.getItem("storybook-braintree-sdk-version");
  if (storedVersion) {
    return storedVersion;
  }

  if (globals && globals.sdkVersion) {
    localStorage.setItem("storybook-braintree-sdk-version", globals.sdkVersion);
    return globals.sdkVersion;
  }

  if (localStorage.getItem("storybook-use-local-build") === "true") {
    return "dev";
  }

  const defaultVersion = "dev";
  return defaultVersion;
};

export const loadSDKScripts = async (
  scriptNames: string[],
  globals?: StorybookGlobals
): Promise<void> => {
  const version = getSelectedSDKVersion(globals);

  let availableVersions;
  try {
    availableVersions = await getAvailableSDKVersions();
  } catch (error) {
    console.warn("Failed to get dynamic versions, using fallback:", error);
    const { FALLBACK_SDK_VERSIONS } = await import("./sdk-config");
    availableVersions = FALLBACK_SDK_VERSIONS;
  }

  let versionConfig = availableVersions.find((v) => v.version === version);

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

  console.log(`Clearing existing scripts before loading version ${version}`);

  const allScripts = document.querySelectorAll(
    'script[src*="js.braintreegateway.com"], ' +
      'script[src*="assets.braintreegateway.com"], ' +
      'script[src*="/local-build/js/"]'
  );

  allScripts.forEach((script) => script.remove());

  if (typeof window !== "undefined") {
    delete (window as unknown as { braintree?: unknown }).braintree;
  }

  localStorage.setItem("storybook-braintree-sdk-version", version);

  if (version === "dev") {
    try {
      const versionJsonCheck = await fetch("/local-build/version.json")
        .then((response) => response.ok)
        .catch(() => false);

      const clientJsCheck = await fetch("/local-build/js/client.min.js")
        .then((response) => response.ok)
        .catch(() => false);

      if (!versionJsonCheck || !clientJsCheck) {
        console.warn(
          "Local build not accessible! This will likely cause errors."
        );
        console.warn(
          `Version JSON accessible: ${versionJsonCheck}, Client JS accessible: ${clientJsCheck}`
        );

        const warningEl = document.createElement("div");
        warningEl.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          padding: 20px;
          border-radius: 4px;
          font-family: monospace;
          max-width: 80%;
          z-index: 10000;
          text-align: center;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        `;

        warningEl.innerHTML = `
          <strong>Local Build Files Not Available</strong><br><br>
          Cannot access local build files. You need to run:<br>
          <code>npm run build</code><br>
          <code>npm run storybook:copy-local-build</code><br><br>
          <strong>Or use the single command:</strong><br>
          <code>npm run build:integration</code><br><br>
          <div style="text-align: left; font-size: 11px; margin-top: 10px;">
            Diagnostics:<br>
            - version.json: ${versionJsonCheck ? "✓ Found" : "✗ Not found"}<br>
            - client.min.js: ${clientJsCheck ? "✓ Found" : "✗ Not found"}
          </div>
          <br>
          <strong>Attempting to continue with local build, but errors are likely...</strong>
        `;
        document.body.appendChild(warningEl);

        console.log("Continuing with local build despite missing files...");
      } else {
        console.log("Local build is accessible! Using local build files.");
      }
    } catch (error) {
      console.error("Error checking local build accessibility:", error);
    }
  }

  try {
    for (const scriptName of scriptNames) {
      await loadScript(scriptName, version, versionConfig.baseUrl);
    }
  } catch (error) {
    if (version === "dev") {
      console.error(
        "Failed to load local build scripts. Make sure you've run the build commands."
      );
      console.error(
        "To create local build files, run: npm run build && npm run storybook:copy-local-build"
      );
    }

    throw error;
  }
};

const loadScript = (
  scriptName: string,
  version: string,
  baseUrl: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    let scriptUrl: string;

    if (version === "dev") {
      console.log("Loading from local build");

      document.head.innerHTML +=
        '<meta name="using-local-build" content="true">';

      scriptUrl = `/local-build/js/${scriptName}`;

      fetch(scriptUrl)
        .then((response) => {
          if (!response.ok) {
            console.error(
              `DEBUG: Local script ${scriptUrl} not accessible (${response.status})`
            );
          } else {
            console.log(`DEBUG: Local script ${scriptUrl} is accessible`);
          }
        })
        .catch((error) => {
          console.error(`DEBUG: Error fetching ${scriptUrl}:`, error);
        });
    } else {
      console.log("Loading from CDN");

      const localBuildMeta = document.querySelector(
        'meta[name="using-local-build"]'
      );
      if (localBuildMeta) localBuildMeta.remove();

      scriptUrl = `${baseUrl}/${scriptName}`;
    }

    const versionMetaTag = document.createElement("meta");
    versionMetaTag.name = "braintree-sdk-version";
    versionMetaTag.content = version;
    document.head.appendChild(versionMetaTag);

    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.dataset.version = version;

    script.onload = () => {
      localStorage.setItem("storybook-last-successful-version", version);
      resolve();
    };

    script.onerror = (error) => {
      console.error(`Failed to load ${scriptName}:`, error);

      if (version === "dev") {
        console.error(
          `DEBUG: Local build script loading failed for: ${scriptName}`
        );
        console.error(`DEBUG: Script URL was: ${scriptUrl}`);

        fetch(scriptUrl)
          .then((response) => {
            console.error(
              `DEBUG: File fetch status: ${response.status} ${response.statusText}`
            );
            if (response.ok) {
              console.error(
                `DEBUG: Strange - file exists but script tag failed to load it`
              );
            }
          })
          .catch((fetchError) => {
            console.error(`DEBUG: Fetch also failed:`, fetchError);
          });

        console.error(`DEBUG: Document URL: ${document.location.href}`);

        fetch("/local-build/js/")
          .then((response) => response.text())
          .then((text) => {
            console.error(
              `DEBUG: Directory listing response:`,
              text.length > 100 ? text.substring(0, 100) + "..." : text
            );
          })
          .catch((dirError) => {
            console.error(`DEBUG: Directory listing failed:`, dirError);
          });

        localStorage.removeItem("storybook-use-local-build");

        const errorMsg =
          `Failed to load local build script: ${scriptName}. ` +
          `Make sure you have run 'npm run build' recently and then 'npm run storybook:copy-local-build'.`;
        console.error(errorMsg);

        reject(new Error(errorMsg));
      } else {
        console.error(`DEBUG: CDN script loading failed for: ${scriptName}`);
        console.error(`DEBUG: Script URL was: ${scriptUrl}`);

        fetch(scriptUrl)
          .then((response) => {
            console.error(
              `DEBUG: Fetch status: ${response.status} ${response.statusText}`
            );
          })
          .catch((fetchError) => {
            console.error(`DEBUG: Fetch also failed:`, fetchError);
          });

        reject(new Error(`Failed to load ${scriptName} from CDN`));
      }
    };
    document.head.appendChild(script);
  });
};

export const waitForBraintree = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 100;

    const checkBraintree = () => {
      if (
        typeof window !== "undefined" &&
        (window as unknown as { braintree?: unknown }).braintree
      ) {
        console.log("Braintree SDK is ready");
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(
          new Error(`Braintree SDK failed to load after ${maxAttempts * 100}ms`)
        );
      } else {
        attempts++;
        setTimeout(checkBraintree, 100);
      }
    };

    checkBraintree();
  });
};

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

      versionSelector.innerHTML = "<option>Loading versions...</option>";
      versionSelector.disabled = true;
      container.appendChild(versionSelector);

      selectedVersion = getSelectedSDKVersion(globals);

      const populateVersionDropdown = async () => {
        try {
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

          versionSelector.innerHTML = "";
          versionSelector.disabled = false;

          availableVersions.forEach((versionConfig) => {
            const option = document.createElement("option");
            option.value = versionConfig.version;

            if (versionConfig.isLocal) {
              option.textContent =
                versionConfig.label || "Assets from local build";
              option.style.fontWeight = "bold";
              option.disabled = versionConfig.disabled || false;

              if (versionConfig.disabled) {
                option.textContent += " (unavailable)";
              }
            } else {
              option.textContent = `SDK v${versionConfig.version}`;
              option.disabled = false;

              if (versionConfig.version === getLocalVersion()) {
                option.textContent += " (current)";
                option.style.fontWeight = "bold";
              }
            }

            if (versionConfig.version === selectedVersion) {
              option.selected = true;
            }
            versionSelector.appendChild(option);
          });

          if (!availableVersions.find((v) => v.version === selectedVersion)) {
            const customOption = document.createElement("option");
            customOption.value = selectedVersion;
            customOption.textContent = `SDK v${selectedVersion} (custom)`;
            customOption.selected = true;
            versionSelector.appendChild(customOption);
          }

          versionSelector.addEventListener("change", (event) => {
            const newVersion = (event.target as HTMLSelectElement).value;
            const isLocalBuild = newVersion === "dev";

            localStorage.setItem("storybook-braintree-sdk-version", newVersion);

            if (isLocalBuild) {
              localStorage.setItem("storybook-use-local-build", "true");
            } else {
              localStorage.removeItem("storybook-use-local-build");
            }

            if (window.parent && window.parent.postMessage) {
              window.parent.postMessage(
                {
                  type: "UPDATE_GLOBALS",
                  globals: { sdkVersion: newVersion },
                },
                "*"
              );
            }

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

            loadingDiv.textContent = isLocalBuild
              ? "Loading SDK from local build..."
              : `Loading SDK v${newVersion}...`;

            document.body.appendChild(loadingDiv);

            const url = new URL(window.location.href);
            url.searchParams.set("version", newVersion);
            url.searchParams.set("ts", Date.now().toString());

            window.location.href = url.toString();
          });
        } catch (error) {
          console.error("Failed to populate version dropdown:", error);
          versionSelector.innerHTML = `<option>SDK v${selectedVersion} (error loading versions)</option>`;
        }
      };

      populateVersionDropdown();
    }

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

        let errorMessage = `<strong>SDK Loading Error:</strong> ${error.message}<br>`;

        if (selectedVersion === "dev") {
          errorMessage += `
            <strong>Local Build Error:</strong><br>
            <p>Local build files are required to use the "Assets from local build" option.</p>
            <p>To generate the required files:</p>
            <ol>
              <li>Make sure you've run <code>npm run build</code> to create the local build files</li>
              <li>Run <code>npm run storybook:copy-local-build</code> to copy files to Storybook static directory</li>
              <li>Alternatively, use the single command: <code>npm run build:integration</code></li>
            </ol>
            <p>After running these commands, refresh the page.</p>
          `;
        }

        errorMessage += `
          <small>Check browser console for detailed debug information</small><br>
          <small>Selected version: ${selectedVersion}</small>
        `;

        errorDiv.innerHTML = errorMessage;
        container.appendChild(errorDiv);
      }
    }, 100);

    return container;
  };
};
