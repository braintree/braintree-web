import { lstatSync, symlinkSync, unlinkSync } from "node:fs";
import path from "node:path";
import { DIST_DIRECTORY, VERSION } from "./vite/configs/shared.ts";

const devLink = path.resolve(DIST_DIRECTORY, "..", "dev");
if (lstatSync(devLink, { throwIfNoEntry: false })) {
  unlinkSync(devLink);
}
symlinkSync(VERSION, devLink, "dir");
