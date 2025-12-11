/* eslint-disable no-console */

/**
 * Browser-safe version of local build detection
 */
export async function isLocalBuildAvailableBrowser(): Promise<boolean> {
  try {
    // Try to fetch the version metadata file
    const response = await fetch("/local-build/js/hosted-fields.js");
    return response.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
}
