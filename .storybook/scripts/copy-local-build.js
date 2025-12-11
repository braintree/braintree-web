#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const packageJson = require("../../package.json");

const VERSIONS_PATH = path.join(process.cwd(), ".storybook", "versions.json");
const STATIC_FILES_PATH = path.join(process.cwd(), ".storybook", "static/");

function copyLocalBuildToStatic() {
  /* eslint-disable no-console */
  try {
    const version = packageJson.version;
    const distPath = path.join(process.cwd(), "dist", "hosted", "web", version);
    const staticPath = path.join(
      process.cwd(),
      ".storybook/static/local-build"
    );

    if (!fs.existsSync(path.join(distPath, "js"))) {
      console.warn(`❌ No local build found. Run 'npm run build' first.`);
      return false;
    }

    fs.rmSync(staticPath, { recursive: true, force: true });
    fs.symlinkSync(distPath, staticPath);

    console.log(`✅ Symlinked local-build/ → dist/hosted/web/${version}/`);

    fs.copyFileSync(VERSIONS_PATH, `${STATIC_FILES_PATH}versions.json`);

    return true;
  } catch (error) {
    console.error("❌ Error creating symlink:", error);
    return false;
  }
}

// Check if this script is being run directly
if (require.main === module) {
  const success = copyLocalBuildToStatic();
  process.exit(success ? 0 : 1);
}

module.exports = { copyLocalBuildToStatic };
