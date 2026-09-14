import loadScript from "@braintree/asset-loader/load-script";
import loadConnectScript from "@paypal/fastlane-sdk-loader";
export const loadFastlane = loadConnectScript.loadAxo;
export { loadScript };

export default {
  loadScript,
  loadFastlane,
};
