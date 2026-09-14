import BraintreeError from "../lib/braintree-error";

const _default = {
  FASTLANE_SDK_LOAD_ERROR: {
    type: BraintreeError.types.MERCHANT,
    code: "FASTLANE_SDK_LOAD_ERROR",
    message: "Fastlane SDK failed to load.",
  },
};

export const { FASTLANE_SDK_LOAD_ERROR } = _default;

export default _default;
