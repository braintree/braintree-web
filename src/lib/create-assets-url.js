import createAuthorizationData from "./create-authorization-data";
import { ASSETS_URLS } from "./constants";

function createAssetsUrl(authorization) {
  if (process.env.BRAINTREE_JS_ENV === "development") {
    if (!authorization) {
      return ASSETS_URLS.production;
    }

    const authData = createAuthorizationData(authorization);

    return ASSETS_URLS[authData.environment || "production"];
  }

  return ASSETS_URLS.production;
}

const _default = {
  create: createAssetsUrl,
};

export const { create } = _default;
export default _default;
