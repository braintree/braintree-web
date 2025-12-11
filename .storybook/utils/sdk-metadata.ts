/**
 * SDK version metadata management utilities
 * Manages meta tags in the DOM for tracking SDK version state
 */

const VERSION_META_NAME = "braintree-sdk-version";
const LOCAL_BUILD_META_NAME = "using-local-build";

/**
 * Set version metadata in the document head
 * @param version - SDK version being used
 */
export function setVersionMetadata(version: string): void {
  // Clear any existing metadata first
  clearVersionMetadata();

  // Add version meta tag
  const versionMeta = document.createElement("meta");
  versionMeta.name = VERSION_META_NAME;
  versionMeta.content = version;
  document.head.appendChild(versionMeta);

  // Add local build indicator if using dev version
  if (version === "dev") {
    const localBuildMeta = document.createElement("meta");
    localBuildMeta.name = LOCAL_BUILD_META_NAME;
    localBuildMeta.content = "true";
    document.head.appendChild(localBuildMeta);
  }
}

/**
 * Clear all SDK version metadata from the document
 */
export function clearVersionMetadata(): void {
  document
    .querySelectorAll(
      `meta[name="${VERSION_META_NAME}"], meta[name="${LOCAL_BUILD_META_NAME}"]`
    )
    .forEach((element) => element.remove());
}

/**
 * Get the current SDK version from metadata
 * @returns The version string or null if not set
 */
export function getVersionFromMetadata(): string | null {
  const meta = document.querySelector(`meta[name="${VERSION_META_NAME}"]`);
  return meta ? meta.getAttribute("content") : null;
}

/**
 * Check if currently using a local build based on metadata
 */
export function isUsingLocalBuild(): boolean {
  const meta = document.querySelector(`meta[name="${LOCAL_BUILD_META_NAME}"]`);
  return meta !== null && meta.getAttribute("content") === "true";
}
