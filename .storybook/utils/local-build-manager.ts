/* eslint-disable no-console */

import fs from "fs";
import path from "path";
import packageJson from "../../package.json";

export interface LocalBuildInfo {
  version: string;
  buildTime: string;
  availableScripts: string[];
  isAvailable: boolean;
}

/**
 * Get the current package version
 */
export function getLocalVersion(): string {
  return packageJson.version;
}

/**
 * Check if local build is available
 */
export function isLocalBuildAvailable(): boolean {
  try {
    const staticBuildPath = path.join(
      process.cwd(),
      ".storybook/static/local-build/js"
    );
    const distBuildPath = path.join(
      process.cwd(),
      `dist/hosted/web/${getLocalVersion()}/js`
    );

    // Check if either static copy or original dist exists
    return fs.existsSync(staticBuildPath) || fs.existsSync(distBuildPath);
  } catch (error) {
    console.warn("Error checking local build availability:", error);
    return false;
  }
}

/**
 * Get available scripts in local build
 */
export function getLocalBuildScripts(): string[] {
  try {
    const staticBuildPath = path.join(
      process.cwd(),
      ".storybook/static/local-build/js"
    );
    const distBuildPath = path.join(
      process.cwd(),
      `dist/hosted/web/${getLocalVersion()}/js`
    );

    let scriptsPath = staticBuildPath;
    if (!fs.existsSync(staticBuildPath) && fs.existsSync(distBuildPath)) {
      scriptsPath = distBuildPath;
    }

    if (!fs.existsSync(scriptsPath)) {
      return [];
    }

    return fs
      .readdirSync(scriptsPath)
      .filter((file) => file.endsWith(".js"))
      .sort();
  } catch (error) {
    console.warn("Error reading local build scripts:", error);
    return [];
  }
}

/**
 * Create symlinks from local build to static directory
 */
export function copyLocalBuildToStatic(): boolean {
  try {
    const version = getLocalVersion();
    const distBuildPath = path.join(
      process.cwd(),
      `dist/hosted/web/${version}/js`
    );
    const staticBuildPath = path.join(
      process.cwd(),
      ".storybook/static/local-build/js"
    );

    if (!fs.existsSync(distBuildPath)) {
      console.warn(`No local build found at: ${distBuildPath}`);
      return false;
    }

    // Ensure static directory exists and is empty
    fs.rmSync(staticBuildPath, { recursive: true, force: true });
    fs.mkdirSync(staticBuildPath, { recursive: true });

    // Get all JS files
    const files = fs
      .readdirSync(distBuildPath)
      .filter((file) => file.endsWith(".js"));

    // Create symlinks instead of copying
    for (const file of files) {
      const srcPath = path.join(distBuildPath, file);
      const destPath = path.join(staticBuildPath, file);
      fs.symlinkSync(srcPath, destPath);
    }

    // Create metadata file
    const buildInfo: LocalBuildInfo = {
      version,
      buildTime: new Date().toISOString(),
      availableScripts: files,
      isAvailable: true,
    };

    const metadataPath = path.join(
      process.cwd(),
      ".storybook/static/versions.json"
    );
    fs.writeFileSync(metadataPath, JSON.stringify(buildInfo, null, 2));

    console.log(
      `✅ Created ${files.length} symlinks to scripts for version ${version}`
    );

    return true;
  } catch (error) {
    console.error("Error copying local build to static directory:", error);

    return false;
  }
}

/**
 * Get local build info from metadata
 */
export function getLocalBuildInfo(): LocalBuildInfo | null {
  try {
    const metadataPath = path.join(
      process.cwd(),
      ".storybook/static/versions.json"
    );

    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    const content = fs.readFileSync(metadataPath, "utf-8");
    return JSON.parse(content) as LocalBuildInfo;
  } catch (error) {
    console.warn("Error reading local build info:", error);
    return null;
  }
}

/**
 * Check if local build is up to date
 */
export function isLocalBuildUpToDate(): boolean {
  const buildInfo = getLocalBuildInfo();
  if (!buildInfo) {
    return false;
  }

  // Check if version matches
  const currentVersion = getLocalVersion();
  if (buildInfo.version !== currentVersion) {
    return false;
  }

  // Check if dist directory is newer than static copy
  try {
    const distBuildPath = path.join(
      process.cwd(),
      `dist/hosted/web/${currentVersion}/js`
    );
    const staticBuildPath = path.join(
      process.cwd(),
      ".storybook/static/local-build/js"
    );

    if (!fs.existsSync(distBuildPath) || !fs.existsSync(staticBuildPath)) {
      return false;
    }

    const distStat = fs.statSync(distBuildPath);
    const buildTime = new Date(buildInfo.buildTime);

    return distStat.mtime <= buildTime;
  } catch (error) {
    console.warn("Error checking build timestamps:", error);
    return false;
  }
}

/**
 * Get local script URL for Storybook static serving
 */
export function getLocalScriptUrl(scriptName: string): string {
  return `/local-build/js/${scriptName}`;
}

/**
 * Browser-safe version of local build detection
 */
export async function isLocalBuildAvailableBrowser(): Promise<boolean> {
  try {
    // Try to fetch the version metadata file
    const response = await fetch("/versions.json");
    return response.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/**
 * Browser-safe version of getting build info
 */
export async function getLocalBuildInfoBrowser(): Promise<LocalBuildInfo | null> {
  try {
    const response = await fetch("/versions.json");

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn("Error fetching local build info:", error);

    return null;
  }
}
