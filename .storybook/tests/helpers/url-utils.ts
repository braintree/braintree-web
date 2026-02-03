/* eslint-disable no-console */
import { BASE_URL } from "../../constants";

const appendOrReplaceParam = (
  url: string,
  paramName: string,
  value: string
): string => {
  const hasQuery = url.includes("?");
  const separator = hasQuery ? "&" : "?";

  return url.includes(`${paramName}=`)
    ? url.replace(new RegExp(`${paramName}=([^&]*)`), `${paramName}=${value}`)
    : `${url}${separator}${paramName}=${value}`;
};

export const getWorkflowUrl = (path: string): string => {
  let url = `${BASE_URL}${path}`;

  if (process.env.LOCAL_BUILD === "true") {
    console.log("LOCAL_BUILD=true detected, modifying URL for local build");
    url = appendOrReplaceParam(url, "globals", "sdkVersion:dev");
    console.log("Modified URL:", url);
  }

  return encodeURI(url);
};
