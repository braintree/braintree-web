#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const packageJson = require("../../package.json");

// Simple Node.js version of the local build manager
function copyLocalBuildToStatic() {
  /* eslint-disable no-console */
  try {
    const version = packageJson.version;
    const fileTypes = [
      { type: "js", ext: ".js", required: true },
      { type: "html", ext: ".html", required: false },
    ];

    let jsFiles = [],
      htmlFiles = [];

    for (const { type, ext, required } of fileTypes) {
      const distPath = path.join(
        process.cwd(),
        `dist/hosted/web/${version}/${type}`
      );
      const staticPath = path.join(
        process.cwd(),
        `.storybook/static/local-build/${type}`
      );

      if (!fs.existsSync(distPath)) {
        console.warn(
          `❌ No local ${type.toUpperCase()} build found at: ${distPath}`
        );
        console.warn(
          `   Run 'npm run build' first to create local build files.`
        );
        if (required) return false;
        continue;
      }

      fs.rmSync(staticPath, { recursive: true, force: true });
      fs.mkdirSync(staticPath, { recursive: true });

      const files = fs
        .readdirSync(distPath)
        .filter((file) => file.endsWith(ext));

      if (files.length === 0) {
        console.warn(`❌ No ${ext} files found in: ${distPath}`);
        if (type === "html") {
          console.warn(
            `   HTML files are required for hosted fields iframe content.`
          );
        }
        if (required) return false;
        continue;
      }

      for (const file of files) {
        fs.symlinkSync(path.join(distPath, file), path.join(staticPath, file));
      }

      if (type === "js") jsFiles = files;
      else if (type === "html") htmlFiles = files;
    }

    // Create metadata file
    const buildInfo = {
      version,
      buildTime: new Date().toISOString(),
      availableScripts: jsFiles,
      availableHtml: htmlFiles,
      isAvailable: true,
    };

    const metadataPath = path.join(
      process.cwd(),
      ".storybook/static/local-build/version.json"
    );
    fs.writeFileSync(metadataPath, JSON.stringify(buildInfo, null, 2));

    console.log(
      `✅ Created ${jsFiles.length} symlinks to scripts for version ${version}`
    );
    console.log(`   Available scripts: ${jsFiles.join(", ")}`);

    if (htmlFiles.length > 0) {
      console.log(`✅ Created ${htmlFiles.length} symlinks to HTML files`);
      console.log(`   Available HTML files: ${htmlFiles.join(", ")}`);
    }

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
