#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const packageJson = require("../../package.json");

// Simple Node.js version of the local build manager
function copyLocalBuildToStatic() {
  /* eslint-disable no-console */
  try {
    const version = packageJson.version;
    const distBuildPath = path.join(
      process.cwd(),
      `dist/hosted/web/${version}/js`
    );
    const staticBuildPath = path.join(
      process.cwd(),
      ".storybook/static/local-build/js"
    );

    if (!fs.existsSync(distBuildPath)) {
      console.warn(`❌ No local build found at: ${distBuildPath}`);
      console.warn(`   Run 'npm run build' first to create local build files.`);
      return false;
    }

    // Ensure static directory exists and is empty
    fs.rmSync(staticBuildPath, { recursive: true, force: true });
    fs.mkdirSync(staticBuildPath, { recursive: true });

    // Get all JS files
    const files = fs
      .readdirSync(distBuildPath)
      .filter((file) => file.endsWith(".js"));

    if (files.length === 0) {
      console.warn(`❌ No JS files found in: ${distBuildPath}`);
      return false;
    }

    // Create symlinks instead of copying
    for (const file of files) {
      const srcPath = path.join(distBuildPath, file);
      const destPath = path.join(staticBuildPath, file);
      fs.symlinkSync(srcPath, destPath);
    }

    // Create metadata file
    const buildInfo = {
      version,
      buildTime: new Date().toISOString(),
      availableScripts: files,
      isAvailable: true,
    };

    const metadataPath = path.join(
      process.cwd(),
      ".storybook/static/local-build/version.json"
    );
    fs.writeFileSync(metadataPath, JSON.stringify(buildInfo, null, 2));

    console.log(
      `✅ Created ${files.length} symlinks to scripts for version ${version}`
    );
    console.log(`   Available scripts: ${files.join(", ")}`);
    console.log(
      `   Local build will appear as "Assets from local build" in Storybook version selector`
    );
    return true;
  } catch (error) {
    console.error("❌ Error copying local build to static directory:", error);
    return false;
  }
}

// Check if this script is being run directly
if (require.main === module) {
  const success = copyLocalBuildToStatic();
  process.exit(success ? 0 : 1);
}

module.exports = { copyLocalBuildToStatic };
