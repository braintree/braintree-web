import fs from "fs";

export const deleteInvalidCspHtml = (destPath: string) => {
  try {
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      "\x1b[31m%s\x1b[0m",
      "Failed to delete invalid CSP file:",
      destPath,
      err
    );
  }
};

export const createInvalidCspHtml = (srcPath: string) => {
  let html;
  try {
    html = fs.readFileSync(srcPath, "utf8");
    const modified = html.replace(/sha256-[^'"]+/g, "sha256-INVALIDHASH");
    fs.writeFileSync(srcPath, modified);
    return html;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      "\x1b[31m%s\x1b[0m",
      "Failed to create invalid CSP file:",
      srcPath,
      err
    );
  }
  return html;
};

export const restoreCspHtml = (srcPath, origHtml) => {
  try {
    fs.writeFileSync(srcPath, origHtml);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log("error: ", err);
  }
};
