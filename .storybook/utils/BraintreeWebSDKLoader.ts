/* eslint-disable no-console */

import { loadScript, removeScriptsByPattern } from "./script-loader";
import {
  waitForBraintree,
  isBraintreeReady,
  clearBraintreeGlobal,
  getScriptUrl,
  BRAINTREE_HOST,
} from "./braintree-globals";
import { setVersionMetadata, clearVersionMetadata } from "./sdk-metadata";
import { isLocalBuildAvailableBrowser } from "./local-build-manager";

export default class BraintreeWebSDKLoader {
  private loadedVersion: string | null = null;
  private loadedScripts: Set<string> = new Set();
  private loadPromise: Promise<void> | null = null;

  private clearExistingScripts(): void {
    removeScriptsByPattern([BRAINTREE_HOST, "/local-build/js/"]);
    clearBraintreeGlobal();
    clearVersionMetadata();
    this.loadedScripts.clear();
  }

  waitForBraintree(): Promise<void> {
    return waitForBraintree();
  }

  async loadSDK(version: string, scripts: string[] = []): Promise<void> {
    const defaultScripts = ["client"];
    const allScripts = [...new Set([...defaultScripts, ...scripts])];

    if (this.loadPromise && this.loadedVersion === version) {
      await this.loadPromise;

      const missingScripts = allScripts.filter(
        (x) => !this.loadedScripts.has(x)
      );
      if (missingScripts.length === 0) {
        return;
      }

      for (const scriptName of missingScripts) {
        const url = getScriptUrl(version, scriptName);

        try {
          await loadScript(url);
          this.loadedScripts.add(scriptName);
        } catch (error) {
          console.error(`Failed to load script "${scriptName}":`, error);
          throw error;
        }
      }

      return;
    }

    if (this.loadedVersion && this.loadedVersion !== version) {
      console.log(
        `Switching SDK version from ${this.loadedVersion} to ${version}`
      );

      this.clearExistingScripts();
      this.loadPromise = null;
    }

    this.loadedVersion = version;

    console.log(`Loading Braintree Web SDK version: ${version}`);

    this.loadPromise = (async () => {
      try {
        if (version === "dev") {
          const isAvailable = await isLocalBuildAvailableBrowser();

          if (!isAvailable) {
            throw new Error(
              "Local build not available. Run: npm run build && npm run storybook:copy-local-build"
            );
          }

          console.log(
            "Local build is available, loading from /local-build/js/"
          );
        }

        // Load scripts sequentially to maintain dependency order
        for (const scriptName of allScripts) {
          const url = getScriptUrl(version, scriptName);

          try {
            await loadScript(url);
            this.loadedScripts.add(scriptName);
          } catch (error) {
            console.error(`Failed to load script "${scriptName}":`, error);
            throw error;
          }
        }

        await waitForBraintree();
        setVersionMetadata(version);

        console.log(`Braintree Web SDK ${version} loaded successfully`);
      } catch (error) {
        console.error(`Error loading Braintree SDK ${version}:`, error);

        this.loadedVersion = null;
        this.loadedScripts.clear();
        this.loadPromise = null;

        throw error;
      }
    })();

    await this.loadPromise;
  }

  async loadAdditionalScripts(scripts: string[]): Promise<void> {
    if (!this.loadedVersion) {
      throw new Error("SDK not loaded. Call loadSDK first.");
    }

    const missingScripts = scripts.filter((x) => !this.loadedScripts.has(x));

    if (missingScripts.length === 0) {
      return;
    }

    console.log(`Loading additional scripts: ${missingScripts.join(", ")}`);

    for (const scriptName of missingScripts) {
      const url = getScriptUrl(this.loadedVersion, scriptName);
      try {
        await loadScript(url);
        this.loadedScripts.add(scriptName);
      } catch (error) {
        console.error(`Failed to load script "${scriptName}":`, error);
        throw error;
      }
    }
  }

  isReady(): boolean {
    return isBraintreeReady();
  }

  getCurrentVersion(): string | null {
    return this.loadedVersion;
  }

  getLoadedScripts(): string[] {
    return Array.from(this.loadedScripts);
  }

  async reload(): Promise<void> {
    const version = this.loadedVersion;
    const scripts = Array.from(this.loadedScripts);

    this.clearExistingScripts();
    this.loadedVersion = null;
    this.loadPromise = null;

    if (version) {
      await this.loadSDK(version, scripts);
    }
  }
}

// Export a singleton instance for convenience
export const braintreeWebSDKLoader = new BraintreeWebSDKLoader();
